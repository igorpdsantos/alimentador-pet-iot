// Contrato MQTT app ↔ firmware (specs/05-protocolo-mqtt.md): validação de comandos e montagem
// das mensagens. Único lugar do firmware que conhece nomes de campos do JSON.
#pragma once
#include <stdint.h>
#include <string>
#include <ArduinoJson.h>
#include "types.h"
#include "schedule.h"
#include "battery_curve.h"

constexpr int PROTO_VERSION = 1;
constexpr int HISTORY_MAX_LIMIT = 50;

enum class Cmd : uint8_t {
  Ping, Feed, CancelFeed, SetSchedule, SetSettings, History, TarePlatform, Calibrate, TareBowl,
  ReadScale, RotorTest, ServoTrim, Unjam, CalibrateBattery, Refill, EmptyHopper, Reboot
};

struct Settings {
  char petName[33];
  uint16_t buttonGrams;
  uint16_t maxBowlG;
  char batteryChemistry[12];
  char timezone[40];
};

struct Calibration {
  double scaleFactor;  // contagens por grama
  double scaleOffset;  // contagens com a plataforma vazia (não vai no config)
  double bowlWeightG;
  uint16_t servoNeutralUs;
  double flowGPerMs;
  double batteryFactor;  // não vai no config
};

void defaultSettings(Settings& s);
void defaultCalibration(Calibration& c);
bool isCalibrated(const Calibration& c);

struct Command {
  Cmd cmd;
  char reqId[40];
  // feed
  double grams;
  FeedMode mode;
  // set_schedule
  Meal meals[MAX_MEALS];
  uint8_t mealCount;
  // set_settings (cópia já com o patch aplicado)
  Settings settings;
  // history
  uint32_t sinceSeq;
  uint8_t limit;
  bool kindConsumption;
  // calibrate / servo_trim / calibrate_battery / rotor_test / refill
  double knownG;
  uint16_t neutralUs;
  double measuredV;
  bool dirReverse;
  uint16_t ms;
  bool refillFull;
};

struct ParseResult {
  bool ok;
  bool hasReqId;   // sem req_id não há como responder: descartar
  const char* error;  // código (INVALID_ARGS)
  const char* msg;    // texto para o app
};

ParseResult parseCommand(const char* json, size_t len, const Settings& current, Command& out);
const char* cmdName(Cmd c);
// Comandos que mexem no rotor/balança e por isso vão para a task de controle.
bool cmdNeedsHardware(Cmd c);

// ---- Registros do histórico (gravados como estão em LittleFS) ----
struct FeedRecord {
  uint32_t seq;
  uint32_t ts;
  uint32_t feedId;
  uint8_t source;   // FeedSource
  uint8_t mealId;   // 0 = sem refeição da agenda
  uint8_t status;   // FeedStatus
  uint8_t flags;    // bit0 unstable, bit1 interference
  float targetG;
  float servedG;
  uint32_t durationMs;
  uint16_t pulses;
  uint8_t unjamTries;
  uint8_t batteryPct;
};

struct ConsumptionRecord {
  uint32_t seq;
  uint32_t ts;
  float foodG;
};

// ---- Snapshot de status ----
struct StatusSnapshot {
  uint32_t ts;
  const char* fw;
  bool onMains;
  BatteryState battery;
  bool bowlPresent;
  double foodG;
  double hopperRemainingG;
  int hopperPct;
  double hopperCapacityG;
  bool hopperCapacityLearned;
  int hopperDaysLeft;  // -1 = sem dados (vai como null)
  bool feeding;
  bool hasNextMeal;
  Meal nextMeal;
  int wifiRssi;
  bool timeSynced;
  uint16_t alerts;
};

// ---- Montagem das mensagens ----
std::string buildOk(const char* reqId, JsonDocument& data);
std::string buildOkEmpty(const char* reqId);
std::string buildError(const char* reqId, const char* code, const char* msg);
std::string buildStatus(const StatusSnapshot& s);
std::string buildConfig(const Schedule& sched, const Settings& set, const Calibration& cal);
void fillMeal(JsonObject o, const Meal& m);
void fillFeedRecord(JsonObject o, const FeedRecord& r);
void fillConsumption(JsonObject o, const ConsumptionRecord& r);
std::string buildFeedStarted(uint32_t seq, uint32_t ts, uint32_t feedId, FeedSource src, uint8_t mealId, double targetG);
std::string buildFeedProgress(uint32_t seq, uint32_t ts, uint32_t feedId, double servedG);
std::string buildFeedResult(const FeedRecord& r);
std::string buildAlert(uint32_t ts, const char* code, const char* msg);
std::string buildConsumption(const ConsumptionRecord& r);
