// Tipos compartilhados da lógica pura. Os nomes em texto são os do contrato (specs/05-protocolo-mqtt.md).
#pragma once
#include <stdint.h>

enum class FeedMode : uint8_t { Add, FillTo };
enum class FeedSource : uint8_t { Schedule, App, Button };
enum class FeedStatus : uint8_t {
  Ok, Partial, NoFlow, BowlMissing, LowBattery, ScaleError, Canceled, SkippedFull, Timeout
};

const char* toString(FeedMode m);
const char* toString(FeedSource s);
const char* toString(FeedStatus s);
bool parseFeedMode(const char* s, FeedMode& out);
