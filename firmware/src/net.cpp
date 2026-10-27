#include "net.h"
#include <Arduino.h>
#include <ArduinoOTA.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiManager.h>
#include "ca_cert.h"
#include "history.h"
#include "rotor.h"
#include "storage.h"
#include "config.h"
#include "control.h"
#include "monitor.h"
#include "req_cache.h"
#include "secrets.h"
#include "state.h"

namespace net {
namespace {

struct OutMsg {
  Topic topic;
  bool retained;
  std::string* payload;
};

WiFiManager wm;
WiFiClientSecure tls;
PubSubClient mqtt(tls);
QueueHandle_t outQueue;
ReqCache reqCache;
SemaphoreHandle_t cacheMutex;
std::atomic<bool> portalRequested{false};
bool timeConfigured = false;
bool otaStarted = false;
uint32_t backoffMs = 1000, nextAttempt = 0;
uint32_t rebootAt = 0;

std::string topic(const char* suffix) { return std::string("petfeeder/") + g.deviceId + "/" + suffix; }

const char* suffix(Topic t) {
  switch (t) {
    case Topic::Status: return "status";
    case Topic::Config: return "config";
    case Topic::Resp: return "resp";
    default: return "event";
  }
}

// Comandos que não mexem no hardware: respondidos aqui mesmo.
std::string handleLocal(const Command& c) {
  JsonDocument data;
  switch (c.cmd) {
    case Cmd::Ping:
      data["fw"] = FW_VERSION;
      data["proto"] = PROTO_VERSION;
      data["uptime_s"] = millis() / 1000;
      return buildOk(c.reqId, data);

    case Cmd::CancelFeed:
      data["was_feeding"] = gFeeding.load();
      if (gFeeding) gCancel = true;
      return buildOk(c.reqId, data);

    case Cmd::SetSchedule: {
      Lock l;
      replaceMeals(g.schedule, c.meals, c.mealCount);
      storage::saveSchedule(g.schedule);
      monitor::publishConfig();
      gStatusDirty = true;
      return buildOkEmpty(c.reqId);
    }

    case Cmd::SetSettings: {
      Lock l;
      bool tzChanged = strcmp(g.settings.timezone, c.settings.timezone) != 0;
      g.settings = c.settings;
      storage::saveSettings(g.settings);
      if (tzChanged) applyTimezone(g.settings.timezone);
      monitor::publishConfig();
      return buildOkEmpty(c.reqId);
    }

    case Cmd::History:
      history::query(c.sinceSeq, c.limit, c.kindConsumption, data);
      return buildOk(c.reqId, data);

    case Cmd::Refill: {
      Lock l;
      if (c.refillFull) hopperRefillFull(g.hopper);
      else hopperRefillGrams(g.hopper, c.grams);
      g.hopperEmpty = false;
      g.noFlow = false;
      storage::saveHopper(g.hopper);
      data["remaining_g"] = lround(g.hopper.remainingG);
      data["capacity_g"] = lround(g.hopper.capacityG);
      gStatusDirty = true;
      return buildOk(c.reqId, data);
    }

    case Cmd::Reboot:
      rebootAt = millis() + 500;
      return buildOkEmpty(c.reqId);

    default:
      return buildError(c.reqId, "INVALID_ARGS", "Comando não tratado");
  }
}

void onMessage(char* t, uint8_t* payload, unsigned int len) {
  static Command cmd;  // grande demais para a pilha; só esta task usa
  Settings current;
  {
    Lock l;
    current = g.settings;
  }
  ParseResult pr = parseCommand((const char*)payload, len, current, cmd);
  if (!pr.hasReqId) {
    Serial.println("[net] comando sem req_id descartado");
    return;
  }
  std::string cached;
  xSemaphoreTake(cacheMutex, portMAX_DELAY);
  ReqCache::Lookup seen = reqCache.check(cmd.reqId, cached);
  xSemaphoreGive(cacheMutex);
  if (seen == ReqCache::Lookup::Done) {  // reenvio: responde igual e não executa de novo
    mqtt.publish(topic("resp").c_str(), cached.c_str());
    return;
  }
  if (seen == ReqCache::Lookup::Pending) return;
  if (!pr.ok) {
    respond(cmd.reqId, buildError(cmd.reqId, pr.error, pr.msg));
    return;
  }
  Serial.printf("[net] cmd %s (%s)\n", cmdName(cmd.cmd), cmd.reqId);
  if (cmdNeedsHardware(cmd.cmd)) {
    if (gFeeding) {
      respond(cmd.reqId, buildError(cmd.reqId, "BUSY", "Já há uma refeição em andamento"));
    } else if (!control::submit(cmd)) {
      respond(cmd.reqId, buildError(cmd.reqId, "BUSY", "Alimentador ocupado"));
    }
    return;
  }
  respond(cmd.reqId, handleLocal(cmd));
}

void onConnected() {
  Serial.println("[net] MQTT conectado");
  mqtt.publish(topic("online").c_str(), "true", true);
  mqtt.subscribe(topic("cmd").c_str(), 1);
  monitor::publishConfig();
  gStatusDirty = true;
}

void connectMqtt() {
  if (millis() < nextAttempt) return;
  Serial.printf("[net] conectando MQTT %s:%d\n", MQTT_HOST, MQTT_PORT);
  std::string will = topic("online");
  if (mqtt.connect(g.deviceId, MQTT_USER, MQTT_PASS, will.c_str(), 1, true, "false")) {
    backoffMs = 1000;
    onConnected();
  } else {
    Serial.printf("[net] MQTT falhou (rc=%d), nova tentativa em %u s\n", mqtt.state(), backoffMs / 1000);
    nextAttempt = millis() + backoffMs;
    backoffMs = backoffMs * 2 > MQTT_BACKOFF_MAX_MS ? MQTT_BACKOFF_MAX_MS : backoffMs * 2;
  }
}

void onWifiUp() {
  if (!timeConfigured) {
    Lock l;
    configTzTime(g.settings.timezone, NTP_SERVER_1, NTP_SERVER_2);
    timeConfigured = true;
  }
  if (!otaStarted) {
    ArduinoOTA.setHostname(g.deviceId);
    ArduinoOTA.setPassword(OTA_PASS);
    ArduinoOTA.onStart([] {
      gCancel = true;  // nunca regravar com o rotor girando
      rotor::stop();
    });
    ArduinoOTA.begin();
    otaStarted = true;
  }
}

void drainOutQueue() {
  OutMsg m;
  while (xQueueReceive(outQueue, &m, 0) == pdTRUE) {
    if (mqtt.connected()) {
      if (!mqtt.publish(topic(suffix(m.topic)).c_str(), m.payload->c_str(), m.retained))
        Serial.printf("[net] publish falhou (%u bytes)\n", (unsigned)m.payload->size());
    }
    delete m.payload;
  }
}
}  // namespace

void begin() {
  outQueue = xQueueCreate(24, sizeof(OutMsg));
  cacheMutex = xSemaphoreCreateMutex();
  WiFi.mode(WIFI_STA);
  uint8_t mac[6];
  WiFi.macAddress(mac);
  snprintf(g.deviceId, sizeof(g.deviceId), "pf-%02x%02x%02x", mac[3], mac[4], mac[5]);
  Serial.printf("[net] device_id %s\n", g.deviceId);
  tls.setCACert(CA_CERT);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(MQTT_BUFFER_SIZE);
  mqtt.setKeepAlive(30);
  mqtt.setCallback(onMessage);
}

void task(void*) {
  char ap[32];
  snprintf(ap, sizeof(ap), "Alimentador-%s", g.deviceId + 3);
  // O portal mostra o device_id para o usuário digitar no app.
  static char info[80];
  snprintf(info, sizeof(info), "<p>Código do alimentador: <b>%s</b></p>", g.deviceId);
  wm.setCustomHeadElement(info);
  wm.setConfigPortalBlocking(false);  // agenda e dosagem continuam sem rede
  wm.setConfigPortalTimeout(PORTAL_TIMEOUT_S);
  wm.autoConnect(ap);
  WiFi.setSleep(true);

  for (;;) {
    wm.process();
    if (portalRequested.exchange(false)) {
      Serial.println("[net] apagando Wi-Fi e abrindo portal");
      wm.resetSettings();
      ESP.restart();
    }
    if (WiFi.status() == WL_CONNECTED) {
      onWifiUp();
      ArduinoOTA.handle();
      if (!mqtt.connected()) connectMqtt();
      mqtt.loop();
    } else if (!wm.getConfigPortalActive() && millis() > nextAttempt) {
      // Portal expirou sem rede salva: tenta de novo mais tarde
      wm.startConfigPortal(ap);
      nextAttempt = millis() + MQTT_BACKOFF_MAX_MS;
    }
    drainOutQueue();
    if (rebootAt && millis() > rebootAt) ESP.restart();
    vTaskDelay(pdMS_TO_TICKS(20));
  }
}

bool mqttConnected() { return mqtt.connected(); }
bool wifiConnected() { return WiFi.status() == WL_CONNECTED; }
int rssi() { return wifiConnected() ? WiFi.RSSI() : 0; }

void publish(Topic t, const std::string& payload, bool retained) {
  OutMsg m{t, retained, new std::string(payload)};
  if (xQueueSend(outQueue, &m, 0) != pdTRUE) delete m.payload;
}

void respond(const char* reqId, const std::string& payload) {
  xSemaphoreTake(cacheMutex, portMAX_DELAY);
  reqCache.complete(reqId, payload);
  xSemaphoreGive(cacheMutex);
  publish(Topic::Resp, payload);
}

void requestPortal() { portalRequested = true; }
}  // namespace net
