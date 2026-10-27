// Histórico em LittleFS: refeições e amostras de consumo em buffers circulares (specs/04-firmware.md §7).
#pragma once
#include <ArduinoJson.h>
#include "protocol.h"

namespace history {
bool begin();
uint32_t maxSeq();
void appendFeed(const FeedRecord& r);
void appendConsumption(const ConsumptionRecord& r);
// Preenche `data` com {items, next_seq, has_more}, respeitando o tamanho máximo do MQTT.
void query(uint32_t sinceSeq, uint8_t limit, bool consumption, JsonDocument& data);
}  // namespace history
