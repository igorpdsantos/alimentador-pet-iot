// Wi-Fi (portal cativo), MQTT com TLS e OTA (specs/04-firmware.md §8, specs/05-protocolo-mqtt.md).
#pragma once
#include <string>

enum class Topic { Status, Config, Resp, Event };

namespace net {
void begin();
void task(void*);
bool mqttConnected();
bool wifiConnected();
int rssi();
// Enfileira uma publicação (qualquer task). Descarta se a fila estiver cheia ou sem conexão.
void publish(Topic t, const std::string& payload, bool retained = false);
// Resposta a um comando: também guarda no cache de req_id.
void respond(const char* reqId, const std::string& payload);
void requestPortal();  // BOOT 10 s
}  // namespace net
