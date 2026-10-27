#include "protocol.h"
#include <string.h>
#include <math.h>
#include "alerts.h"
#include "stats.h"

namespace {

struct CmdEntry {
  const char* name;
  Cmd cmd;
};
const CmdEntry kCmds[] = {
    {"ping", Cmd::Ping}, {"feed", Cmd::Feed}, {"cancel_feed", Cmd::CancelFeed},
    {"set_schedule", Cmd::SetSchedule}, {"set_settings", Cmd::SetSettings}, {"history", Cmd::History},
    {"tare_platform", Cmd::TarePlatform}, {"calibrate", Cmd::Calibrate}, {"tare_bowl", Cmd::TareBowl},
    {"read_scale", Cmd::ReadScale}, {"rotor_test", Cmd::RotorTest}, {"servo_trim", Cmd::ServoTrim},
    {"unjam", Cmd::Unjam}, {"calibrate_battery", Cmd::CalibrateBattery}, {"refill", Cmd::Refill},
    {"empty_hopper", Cmd::EmptyHopper}, {"reboot", Cmd::Reboot},
};

ParseResult fail(bool hasReqId, const char* msg) { return {false, hasReqId, "INVALID_ARGS", msg}; }

bool isNumber(JsonVariantConst v) { return v.is<double>() || v.is<long>(); }

bool getNumber(JsonVariantConst v, double lo, double hi, double& out) {
  if (!isNumber(v)) return false;
  double x = v.as<double>();
  if (!(x >= lo && x <= hi)) return false;
  out = x;
  return true;
}

void copyStr(char* dst, size_t cap, const char* src) {
  strncpy(dst, src ? src : "", cap - 1);
  dst[cap - 1] = 0;
}

bool parseMeal(JsonObjectConst o, Meal& m) {
  double id, grams;
  if (!getNumber(o["id"], 1, 255, id) || !getNumber(o["grams"], 5, 200, grams)) return false;
  if (!parseHHMM(o["time"] | "", m.hour, m.minute)) return false;
  JsonArrayConst days = o["days"];
  if (days.isNull()) return false;
  m.daysMask = 0;
  for (JsonVariantConst d : days) {
    double dd;
    if (!getNumber(d, 0, 6, dd)) return false;
    m.daysMask |= 1 << (int)dd;
  }
  if (!o["enabled"].is<bool>()) return false;
  m.enabled = o["enabled"];
  if (!parseFeedMode(o["mode"] | "add", m.mode)) return false;
  m.id = (uint8_t)id;
  m.grams = (uint16_t)lround(grams);
  return true;
}

void putMeta(JsonDocument& d, uint32_t seq, uint32_t ts, const char* type) {
  d["proto"] = PROTO_VERSION;
  d["seq"] = seq;
  d["ts"] = ts;
  d["type"] = type;
}

std::string serialize(JsonDocument& d) {
  std::string out;
  serializeJson(d, out);
  return out;
}

}  // namespace

void defaultSettings(Settings& s) {
  memset(&s, 0, sizeof(s));
  copyStr(s.petName, sizeof(s.petName), "Pet");
  s.buttonGrams = 20;
  s.maxBowlG = 300;
  copyStr(s.batteryChemistry, sizeof(s.batteryChemistry), "alkaline");
  copyStr(s.timezone, sizeof(s.timezone), "<-03>3");
}

void defaultCalibration(Calibration& c) {
  c.scaleFactor = 0;
  c.scaleOffset = 0;
  c.bowlWeightG = 0;
  c.servoNeutralUs = 1500;
  c.flowGPerMs = 0.01;
  c.batteryFactor = 1.0;
}

bool isCalibrated(const Calibration& c) { return fabs(c.scaleFactor) > 1e-6; }

const char* cmdName(Cmd c) {
  for (const auto& e : kCmds)
    if (e.cmd == c) return e.name;
  return "";
}

bool cmdNeedsHardware(Cmd c) {
  switch (c) {
    case Cmd::Feed: case Cmd::TarePlatform: case Cmd::Calibrate: case Cmd::TareBowl: case Cmd::ReadScale:
    case Cmd::RotorTest: case Cmd::ServoTrim: case Cmd::Unjam: case Cmd::EmptyHopper:
    case Cmd::CalibrateBattery:
      return true;
    default:
      return false;
  }
}

ParseResult parseCommand(const char* json, size_t len, const Settings& current, Command& out) {
  memset(&out, 0, sizeof(out));
  JsonDocument doc;
  if (deserializeJson(doc, json, len) || !doc.is<JsonObject>()) return fail(false, "JSON inválido");
  const char* reqId = doc["req_id"];
  if (!reqId || !*reqId || strlen(reqId) >= sizeof(out.reqId)) return fail(false, "req_id ausente");
  copyStr(out.reqId, sizeof(out.reqId), reqId);
  if ((doc["proto"] | 0) != PROTO_VERSION) return fail(true, "Versão do protocolo incompatível");

  const char* name = doc["cmd"] | "";
  bool found = false;
  for (const auto& e : kCmds)
    if (strcmp(e.name, name) == 0) { out.cmd = e.cmd; found = true; }
  if (!found) return fail(true, "Comando desconhecido");

  JsonObjectConst a = doc.as<JsonObjectConst>();
  switch (out.cmd) {
    case Cmd::Feed:
      if (!getNumber(a["grams"], 5, 200, out.grams)) return fail(true, "Gramas entre 5 e 200");
      if (!parseFeedMode(a["mode"] | "add", out.mode)) return fail(true, "Modo inválido");
      break;

    case Cmd::SetSchedule: {
      JsonArrayConst meals = a["meals"];
      if (meals.isNull() || meals.size() > MAX_MEALS) return fail(true, "Agenda com até 8 refeições");
      for (JsonObjectConst m : meals) {
        if (!parseMeal(m, out.meals[out.mealCount])) return fail(true, "Refeição inválida");
        for (int j = 0; j < out.mealCount; j++)
          if (out.meals[j].id == out.meals[out.mealCount].id) return fail(true, "id de refeição repetido");
        out.mealCount++;
      }
      break;
    }

    case Cmd::SetSettings: {
      out.settings = current;
      double n;
      if (!a["pet_name"].isNull()) {
        const char* p = a["pet_name"];
        if (!p || strlen(p) >= sizeof(out.settings.petName)) return fail(true, "Nome do pet até 32 letras");
        copyStr(out.settings.petName, sizeof(out.settings.petName), p);
      }
      if (!a["button_grams"].isNull()) {
        if (!getNumber(a["button_grams"], 5, 200, n)) return fail(true, "Porção do botão entre 5 e 200 g");
        out.settings.buttonGrams = (uint16_t)lround(n);
      }
      if (!a["max_bowl_g"].isNull()) {
        if (!getNumber(a["max_bowl_g"], 50, 2000, n)) return fail(true, "Capacidade da vasilha entre 50 e 2000 g");
        out.settings.maxBowlG = (uint16_t)lround(n);
      }
      if (!a["battery_chemistry"].isNull()) {
        const char* c = a["battery_chemistry"] | "";
        if (strcmp(c, "alkaline") != 0) return fail(true, "Só pilhas alcalinas por enquanto");
        copyStr(out.settings.batteryChemistry, sizeof(out.settings.batteryChemistry), c);
      }
      if (!a["timezone"].isNull()) {
        const char* tz = a["timezone"];
        if (!tz || !*tz || strlen(tz) >= sizeof(out.settings.timezone)) return fail(true, "Fuso horário inválido");
        copyStr(out.settings.timezone, sizeof(out.settings.timezone), tz);
      }
      break;
    }

    case Cmd::History: {
      double since = 0, limit = 20;
      if (!a["since_seq"].isNull() && !getNumber(a["since_seq"], 0, 4294967295.0, since))
        return fail(true, "since_seq inválido");
      if (!a["limit"].isNull() && !getNumber(a["limit"], 1, HISTORY_MAX_LIMIT, limit))
        return fail(true, "limit entre 1 e 50");
      const char* kind = a["kind"] | "feeds";
      if (strcmp(kind, "feeds") != 0 && strcmp(kind, "consumption") != 0) return fail(true, "kind inválido");
      out.sinceSeq = (uint32_t)since;
      out.limit = (uint8_t)limit;
      out.kindConsumption = strcmp(kind, "consumption") == 0;
      break;
    }

    case Cmd::Calibrate:
      if (!getNumber(a["known_g"], 10, 4500, out.knownG)) return fail(true, "Peso conhecido entre 10 e 4500 g");
      break;

    case Cmd::RotorTest: {
      const char* dir = a["dir"] | "";
      if (strcmp(dir, "fwd") != 0 && strcmp(dir, "rev") != 0) return fail(true, "dir deve ser fwd ou rev");
      double ms;
      if (!getNumber(a["ms"], 50, 2000, ms)) return fail(true, "ms entre 50 e 2000");
      out.dirReverse = strcmp(dir, "rev") == 0;
      out.ms = (uint16_t)ms;
      break;
    }

    case Cmd::ServoTrim: {
      double us;
      if (!getNumber(a["neutral_us"], 1400, 1600, us)) return fail(true, "neutral_us entre 1400 e 1600");
      out.neutralUs = (uint16_t)lround(us);
      break;
    }

    case Cmd::CalibrateBattery:
      if (!getNumber(a["measured_v"], 3, 12, out.measuredV)) return fail(true, "Tensão entre 3 e 12 V");
      break;

    case Cmd::Refill:
      if (a["full"].is<bool>() && a["full"].as<bool>()) {
        out.refillFull = true;
      } else if (!getNumber(a["grams"], 1, 5000, out.grams)) {
        return fail(true, "Informe full=true ou grams");
      }
      break;

    default:
      break;
  }
  return {true, true, nullptr, nullptr};
}

// ---------------- Montagem ----------------

std::string buildOk(const char* reqId, JsonDocument& data) {
  JsonDocument d;
  d["req_id"] = reqId;
  d["ok"] = true;
  d["data"] = data.as<JsonVariantConst>();
  return serialize(d);
}

std::string buildOkEmpty(const char* reqId) {
  JsonDocument data;
  data.to<JsonObject>();
  return buildOk(reqId, data);
}

std::string buildError(const char* reqId, const char* code, const char* msg) {
  JsonDocument d;
  d["req_id"] = reqId;
  d["ok"] = false;
  d["error"] = code;
  d["msg"] = msg;
  return serialize(d);
}

std::string buildStatus(const StatusSnapshot& s) {
  JsonDocument d;
  d["proto"] = PROTO_VERSION;
  d["ts"] = s.ts;
  d["fw"] = s.fw;
  d["power"]["source"] = s.onMains ? "mains" : "battery";
  JsonObject b = d["battery"].to<JsonObject>();
  b["pct"] = s.battery.pct;
  b["v"] = round2(s.battery.volts);
  b["level"] = toString(s.battery.level);
  b["installed"] = s.battery.installed;
  d["bowl"]["present"] = s.bowlPresent;
  d["bowl"]["food_g"] = round1(s.foodG);
  JsonObject h = d["hopper"].to<JsonObject>();
  h["remaining_g"] = lround(s.hopperRemainingG);
  h["pct"] = s.hopperPct;
  h["capacity_g"] = lround(s.hopperCapacityG);
  h["capacity_learned"] = s.hopperCapacityLearned;
  if (s.hopperDaysLeft >= 0) h["days_left"] = s.hopperDaysLeft;
  else h["days_left"] = nullptr;
  d["feeding"] = s.feeding;
  if (s.hasNextMeal) {
    char t[6];
    snprintf(t, sizeof(t), "%02u:%02u", s.nextMeal.hour, s.nextMeal.minute);
    d["next_meal"]["id"] = s.nextMeal.id;
    d["next_meal"]["time"] = t;
    d["next_meal"]["grams"] = s.nextMeal.grams;
  } else {
    d["next_meal"] = nullptr;
  }
  d["wifi_rssi"] = s.wifiRssi;
  d["time_synced"] = s.timeSynced;
  JsonArray al = d["alerts"].to<JsonArray>();
  for (int i = 0; i < ALERT_COUNT; i++)
    if (s.alerts & (1 << i)) al.add(alertCode(1 << i));
  return serialize(d);
}

void fillMeal(JsonObject o, const Meal& m) {
  char t[6];
  snprintf(t, sizeof(t), "%02u:%02u", m.hour, m.minute);
  o["id"] = m.id;
  o["time"] = t;
  o["grams"] = m.grams;
  JsonArray days = o["days"].to<JsonArray>();
  for (int i = 0; i < 7; i++)
    if (m.daysMask & (1 << i)) days.add(i);
  o["enabled"] = m.enabled;
  o["mode"] = toString(m.mode);
}

std::string buildConfig(const Schedule& sched, const Settings& set, const Calibration& cal) {
  JsonDocument d;
  d["proto"] = PROTO_VERSION;
  JsonArray meals = d["meals"].to<JsonArray>();
  for (int i = 0; i < sched.count; i++) fillMeal(meals.add<JsonObject>(), sched.meals[i]);
  JsonObject s = d["settings"].to<JsonObject>();
  s["pet_name"] = set.petName;
  s["button_grams"] = set.buttonGrams;
  s["max_bowl_g"] = set.maxBowlG;
  s["battery_chemistry"] = set.batteryChemistry;
  s["timezone"] = set.timezone;
  JsonObject c = d["calibration"].to<JsonObject>();
  c["scale_factor"] = round1(cal.scaleFactor);
  c["bowl_weight_g"] = round1(cal.bowlWeightG);
  c["servo_neutral_us"] = cal.servoNeutralUs;
  c["flow_g_per_ms"] = round(cal.flowGPerMs * 10000.0) / 10000.0;
  return serialize(d);
}

void fillFeedRecord(JsonObject o, const FeedRecord& r) {
  o["seq"] = r.seq;
  o["ts"] = r.ts;
  o["feed_id"] = r.feedId;
  o["source"] = toString((FeedSource)r.source);
  if (r.mealId) o["meal_id"] = r.mealId;
  o["target_g"] = round1(r.targetG);
  o["served_g"] = round1(r.servedG);
  o["duration_ms"] = r.durationMs;
  o["pulses"] = r.pulses;
  o["unjam_tries"] = r.unjamTries;
  o["status"] = toString((FeedStatus)r.status);
  o["unstable"] = (r.flags & 1) != 0;
  o["interference"] = (r.flags & 2) != 0;
  o["battery_pct"] = r.batteryPct;
}

void fillConsumption(JsonObject o, const ConsumptionRecord& r) {
  o["seq"] = r.seq;
  o["ts"] = r.ts;
  o["food_g"] = round1(r.foodG);
}

std::string buildFeedStarted(uint32_t seq, uint32_t ts, uint32_t feedId, FeedSource src, uint8_t mealId, double targetG) {
  JsonDocument d;
  putMeta(d, seq, ts, "feed_started");
  d["feed_id"] = feedId;
  d["source"] = toString(src);
  if (mealId) d["meal_id"] = mealId;
  d["target_g"] = round1(targetG);
  return serialize(d);
}

std::string buildFeedProgress(uint32_t seq, uint32_t ts, uint32_t feedId, double servedG) {
  JsonDocument d;
  putMeta(d, seq, ts, "feed_progress");
  d["feed_id"] = feedId;
  d["served_g"] = round1(servedG);
  return serialize(d);
}

std::string buildFeedResult(const FeedRecord& r) {
  JsonDocument d;
  putMeta(d, r.seq, r.ts, "feed_result");
  JsonObject o = d.as<JsonObject>();
  fillFeedRecord(o, r);
  return serialize(d);
}

std::string buildAlert(uint32_t ts, const char* code, const char* msg) {
  JsonDocument d;
  putMeta(d, 0, ts, "alert");
  d["code"] = code;
  d["msg"] = msg;
  return serialize(d);
}

std::string buildConsumption(const ConsumptionRecord& r) {
  JsonDocument d;
  putMeta(d, r.seq, r.ts, "consumption");
  d["food_g"] = round1(r.foodG);
  return serialize(d);
}
