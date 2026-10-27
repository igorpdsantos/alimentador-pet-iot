#include "monitor.h"
#include <Arduino.h>
#include "alerts.h"
#include "config.h"
#include "net.h"
#include "power.h"
#include "rotor.h"
#include "state.h"

namespace monitor {
namespace {

uint16_t computeAlerts() {
  Lock l;
  uint16_t a = 0;
  if (g.battery.installed && g.battery.level != BatteryLevel::Ok) a |= ALERT_LOW_BATTERY;
  if (!g.onMains) a |= ALERT_ON_BATTERY;
  if (g.hopperEmpty) a |= ALERT_HOPPER_EMPTY;
  else if (hopperLow(g.hopper)) a |= ALERT_HOPPER_LOW;
  if (g.noFlow) a |= ALERT_NO_FLOW;
  if (!timeSynced()) a |= ALERT_NO_TIME;
  if (!isCalibrated(g.cal)) a |= ALERT_NOT_CALIBRATED;
  if (!g.scaleOk) a |= ALERT_SCALE_ERROR;
  if (g.platformG > SCALE_OVERLOAD_G) a |= ALERT_OVERLOAD;
  return a;
}

// Um evento `alert` para cada alerta que acabou de aparecer; MAINS_RESTORED quando a energia volta.
void publishAlertEdges(uint16_t before, uint16_t now) {
  uint32_t ts = nowTs();
  for (int i = 0; i < ALERT_COUNT; i++) {
    uint16_t bit = 1 << i;
    if ((now & bit) && !(before & bit)) {
      Serial.printf("[mon] alerta %s\n", alertCode(bit));
      net::publish(Topic::Event, buildAlert(ts, alertCode(bit), alertMessage(bit)));
    }
  }
  if ((before & ALERT_ON_BATTERY) && !(now & ALERT_ON_BATTERY))
    net::publish(Topic::Event, buildAlert(ts, "MAINS_RESTORED", "Energia da tomada voltou"));
}

void publishStatus() {
  StatusSnapshot s{};
  LocalTime now;
  bool haveTime = localNow(now);
  {
    Lock l;
    s.ts = nowTs();
    s.fw = FW_VERSION;
    s.onMains = g.onMains;
    s.battery = g.battery;
    s.bowlPresent = g.bowlPresent;
    s.foodG = g.foodG;
    s.hopperRemainingG = g.hopper.remainingG;
    s.hopperPct = hopperPercent(g.hopper);
    s.hopperCapacityG = g.hopper.capacityG;
    s.hopperCapacityLearned = g.hopper.capacityLearned;
    s.hopperDaysLeft = hopperDaysLeft(g.hopper);
    s.feeding = gFeeding;
    int next = haveTime ? nextMeal(g.schedule, now) : -1;
    s.hasNextMeal = next >= 0;
    if (s.hasNextMeal) s.nextMeal = g.schedule.meals[next];
  }
  s.wifiRssi = net::rssi();
  s.timeSynced = timeSynced();
  s.alerts = gAlerts;
  net::publish(Topic::Status, buildStatus(s), true);
}

void readBattery() {
  if (millis() - rotor::lastMoveMs() < BATTERY_QUIET_MS || gFeeding) return;  // servo derruba a tensão
  double factor;
  {
    Lock l;
    factor = g.cal.batteryFactor;
  }
  BatteryState b = evaluateBattery(power::packVolts(factor));
  Lock l;
  if (abs(b.pct - g.battery.pct) >= 1 || b.installed != g.battery.installed) gStatusDirty = true;
  g.battery = b;
}
}  // namespace

void publishConfig() {
  std::string cfg;
  {
    Lock l;
    cfg = buildConfig(g.schedule, g.settings, g.cal);
  }
  net::publish(Topic::Config, cfg, true);
}

bool hasError() {
  uint16_t a = gAlerts;
  bool critical = false;
  {
    Lock l;
    critical = g.battery.installed && g.battery.level == BatteryLevel::Critical && !g.onMains;
  }
  return critical || (a & (ALERT_NO_FLOW | ALERT_HOPPER_EMPTY | ALERT_SCALE_ERROR | ALERT_OVERLOAD));
}

void task(void*) {
  uint32_t lastBattery = 0, lastStatus = 0;
  bool wasConnected = false;
  for (;;) {
    uint32_t ms = millis();
    bool mains = power::onMains();
    {
      Lock l;
      if (mains != g.onMains) gStatusDirty = true;
      g.onMains = mains;
    }
    if (ms - lastBattery > STATUS_MAX_INTERVAL_MS || lastBattery == 0) {
      lastBattery = ms;
      readBattery();
    }
    uint16_t before = gAlerts, now = computeAlerts();
    if (now != before) {
      gAlerts = now;
      publishAlertEdges(before, now);
      gStatusDirty = true;
    }
    bool connected = net::mqttConnected();
    if (connected && !wasConnected) gStatusDirty = true;
    wasConnected = connected;
    uint32_t maxInterval = mains ? STATUS_MAX_INTERVAL_MS : STATUS_BATTERY_INTERVAL_MS;
    if (connected && (gStatusDirty.exchange(false) || ms - lastStatus > maxInterval)) {
      lastStatus = ms;
      publishStatus();
    }
    vTaskDelay(pdMS_TO_TICKS(1000));
  }
}
}  // namespace monitor
