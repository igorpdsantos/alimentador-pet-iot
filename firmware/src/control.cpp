#include "control.h"
#include <Arduino.h>
#include "config.h"
#include "dispenser.h"
#include "history.h"
#include "monitor.h"
#include "net.h"
#include "power.h"
#include "rotor.h"
#include "scale.h"
#include "stats.h"
#include "state.h"
#include "storage.h"

namespace control {
namespace {

enum class MsgKind : uint8_t { AppCommand, ButtonFeed, ButtonRefill };

struct Msg {
  MsgKind kind;
  Command cmd;
};

QueueHandle_t queue;

// Liga a máquina de estados da dosagem ao hardware real.
class HardwareIO : public DispenserIO {
 public:
  HardwareIO(uint32_t seq, uint32_t feedId, const Calibration& cal) : seq_(seq), feedId_(feedId), cal_(cal) {}
  uint32_t nowMs() override { return millis(); }
  void rotor(RotorDir dir, bool slow, uint16_t ms) override { rotor::run(dir, slow, ms); }
  void waitMs(uint16_t ms) override { vTaskDelay(pdMS_TO_TICKS(ms)); }
  ScaleReading readStable() override { return scale::readFood(cal_); }
  bool cancelRequested() override { return gCancel; }
  void progress(double servedG) override {
    if (millis() - lastProgress_ < PROGRESS_INTERVAL_MS) return;
    lastProgress_ = millis();
    net::publish(Topic::Event, buildFeedProgress(seq_, nowTs(), feedId_, servedG));
  }

 private:
  uint32_t seq_, feedId_;
  Calibration cal_;
  uint32_t lastProgress_ = 0;
};

void respondOk(const Command& c, JsonDocument& data) { net::respond(c.reqId, buildOk(c.reqId, data)); }
void respondError(const Command& c, const char* code, const char* msg) {
  net::respond(c.reqId, buildError(c.reqId, code, msg));
}

// Lê a vasilha e atualiza o estado. Devolve a leitura.
ScaleReading refreshBowl() {
  Calibration cal;
  {
    Lock l;
    cal = g.cal;
  }
  scale::Raw raw = scale::readRaw(cal);
  Lock l;
  g.scaleOk = raw.ok;
  if (!raw.ok || !isCalibrated(cal)) return {raw.ok, raw.stable, 0};
  double platform = scale::toPlatformGrams(raw.counts, cal);
  double oldFood = g.foodG;
  bool oldPresent = g.bowlPresent;
  g.platformG = platform;
  g.bowlPresent = scale::bowlPresent(platform, cal);
  g.foodG = g.bowlPresent ? fmax(0, platform - cal.bowlWeightG) : 0;
  if (fabs(g.foodG - oldFood) >= 2 || oldPresent != g.bowlPresent) gStatusDirty = true;
  return {true, raw.stable, g.foodG};
}

bool powerAllowsFeeding() {
  Lock l;
  if (g.onMains) return true;
  return g.battery.installed && g.battery.pct > BATTERY_BLOCK_PCT;
}

// Uma refeição completa: pré-checagem, dosagem, histórico, eventos. `c` só existe para pedidos do app.
void feed(double grams, FeedMode mode, FeedSource source, uint8_t mealId, const Command* c) {
  Calibration cal;
  Settings set;
  uint32_t seq, feedId;
  {
    Lock l;
    cal = g.cal;
    set = g.settings;
  }
  if (!isCalibrated(cal)) {
    if (c) respondError(*c, "NOT_CALIBRATED", "Calibre a balança antes de servir");
    return;
  }
  {
    Lock l;
    seq = ++g.seq;
    feedId = ++g.feedId;
    storage::saveCounters(g.seq, g.feedId);
  }
  if (c) {
    JsonDocument data;
    data["feed_id"] = feedId;
    respondOk(*c, data);
  }
  gCancel = false;
  gFeeding = true;
  gStatusDirty = true;

  ScaleReading now = refreshBowl();
  FeedRequest req{};
  req.grams = grams;
  req.mode = mode;
  req.powerOk = powerAllowsFeeding();
  req.scaleOk = now.ok;
  {
    Lock l;
    req.bowlPresent = g.bowlPresent;
    req.currentFoodG = g.foodG;
  }
  req.maxBowlG = set.maxBowlG;
  req.flowGPerMs = cal.flowGPerMs;
  req.requireBowl = true;
  net::publish(Topic::Event, buildFeedStarted(seq, nowTs(), feedId, source, mealId, effectiveTarget(req)));
  Serial.printf("[disp] refeição %u: %.0f g (%s, %s)\n", feedId, grams, toString(mode), toString(source));

  HardwareIO io(seq, feedId, cal);
  FeedResult r = runFeed(req, io);
  Serial.printf("[disp] %s: %.1f de %.1f g em %u ms, %u giros, %u destravas\n", toString(r.status), r.servedG,
                r.targetG, r.durationMs, r.pulses, r.unjamTries);

  FeedRecord rec{};
  rec.seq = seq;
  rec.ts = nowTs();
  rec.feedId = feedId;
  rec.source = (uint8_t)source;
  rec.mealId = mealId;
  rec.status = (uint8_t)r.status;
  rec.flags = (r.unstable ? 1 : 0) | (r.interference ? 2 : 0);
  rec.targetG = r.targetG;
  rec.servedG = r.servedG;
  rec.durationMs = r.durationMs;
  rec.pulses = r.pulses;
  rec.unjamTries = r.unjamTries;
  {
    Lock l;
    rec.batteryPct = g.battery.pct;
    hopperServed(g.hopper, r.servedG);
    if (r.status == FeedStatus::NoFlow) {
      bool empty = hopperNoFlow(g.hopper);
      g.hopperEmpty = empty;
      g.noFlow = !empty;
    } else if (r.servedG > NO_GAIN_G) {
      g.noFlow = false;
      g.hopperEmpty = false;
    }
    if (r.pulses) {
      g.cal.flowGPerMs = r.flowGPerMs;
      storage::saveCalibration(g.cal);
    }
    storage::saveHopper(g.hopper);
  }
  history::appendFeed(rec);
  net::publish(Topic::Event, buildFeedResult(rec));
  gFeeding = false;
  gCancel = false;
  refreshBowl();
  gStatusDirty = true;
}

void emptyHopper(const Command& c) {
  Calibration cal;
  {
    Lock l;
    cal = g.cal;
  }
  JsonDocument data;
  respondOk(c, data);
  gCancel = false;
  gFeeding = true;
  gStatusDirty = true;
  FeedRequest req{};
  req.grams = 5000;
  req.mode = FeedMode::Add;
  req.powerOk = powerAllowsFeeding();
  req.scaleOk = isCalibrated(cal) && scale::ready();
  req.flowGPerMs = cal.flowGPerMs;
  req.maxDurationMs = EMPTY_HOPPER_MAX_MS;
  req.requireBowl = false;
  HardwareIO io(0, 0, cal);
  FeedResult r = runFeed(req, io);
  Serial.printf("[disp] esvaziar: %s, %.0f g\n", toString(r.status), r.servedG);
  {
    Lock l;
    if (r.status == FeedStatus::NoFlow) hopperEmptied(g.hopper);
    storage::saveHopper(g.hopper);
  }
  gFeeding = false;
  gStatusDirty = true;
}

void calibration(const Command& c) {
  JsonDocument data;
  Calibration cal;
  {
    Lock l;
    cal = g.cal;
  }
  scale::Raw raw = scale::readRaw(cal);
  if (!raw.ok) return respondError(c, "SCALE_ERROR", "A balança não respondeu");
  switch (c.cmd) {
    case Cmd::TarePlatform:
      cal.scaleOffset = raw.counts;
      break;
    case Cmd::Calibrate: {
      double f = (raw.counts - cal.scaleOffset) / c.knownG;
      if (fabs(f) < 1) return respondError(c, "INVALID_ARGS", "Nenhum peso detectado: confira o objeto");
      cal.scaleFactor = f;
      data["scale_factor"] = round1(f);
      break;
    }
    case Cmd::TareBowl:
      if (!isCalibrated(cal)) return respondError(c, "NOT_CALIBRATED", "Faça os passos 1 e 2 antes");
      cal.bowlWeightG = scale::toPlatformGrams(raw.counts, cal);
      data["bowl_weight_g"] = round1(cal.bowlWeightG);
      break;
    case Cmd::ReadScale: {
      data["raw"] = lround(raw.counts);
      data["grams"] = round1(scale::toPlatformGrams(raw.counts, cal));
      data["stable"] = raw.stable;
      return respondOk(c, data);
    }
    default:
      break;
  }
  if (!raw.stable) data["unstable"] = true;
  {
    Lock l;
    g.cal = cal;
    storage::saveCalibration(cal);
  }
  monitor::publishConfig();
  respondOk(c, data);
  refreshBowl();
}

void handle(const Msg& m) {
  const Command& c = m.cmd;
  if (m.kind == MsgKind::ButtonFeed) {
    uint16_t grams;
    {
      Lock l;
      grams = g.settings.buttonGrams;
    }
    return feed(grams, FeedMode::Add, FeedSource::Button, 0, nullptr);
  }
  if (m.kind == MsgKind::ButtonRefill) {
    Lock l;
    hopperRefillFull(g.hopper);
    g.hopperEmpty = g.noFlow = false;
    storage::saveHopper(g.hopper);
    gStatusDirty = true;
    return;
  }
  JsonDocument data;
  switch (c.cmd) {
    case Cmd::Feed:
      return feed(c.grams, c.mode, FeedSource::App, 0, &c);
    case Cmd::EmptyHopper:
      return emptyHopper(c);
    case Cmd::TarePlatform: case Cmd::Calibrate: case Cmd::TareBowl: case Cmd::ReadScale:
      return calibration(c);
    case Cmd::RotorTest:
      rotor::run(c.dirReverse ? RotorDir::Reverse : RotorDir::Forward, false, c.ms);
      return respondOk(c, data);
    case Cmd::Unjam:
      rotor::run(RotorDir::Reverse, false, UNJAM_REVERSE_MS);
      rotor::run(RotorDir::Forward, false, UNJAM_REVERSE_MS);
      return respondOk(c, data);
    case Cmd::ServoTrim: {
      {
        Lock l;
        g.cal.servoNeutralUs = c.neutralUs;
        storage::saveCalibration(g.cal);
      }
      rotor::setNeutral(c.neutralUs);
      rotor::holdNeutral(2000);  // o rotor não pode andar com o neutro certo
      data["neutral_us"] = c.neutralUs;
      monitor::publishConfig();
      return respondOk(c, data);
    }
    case Cmd::CalibrateBattery: {
      double factor, v;
      {
        Lock l;
        factor = g.cal.batteryFactor;
      }
      v = power::packVolts(factor);
      double nf = batteryCalibrationFactor(c.measuredV, v, factor);
      if (nf == factor && fabs(v - c.measuredV) > 0.05)
        return respondError(c, "INVALID_ARGS", "Tensão muito diferente da medida: confira o multímetro e as pilhas");
      {
        Lock l;
        g.cal.batteryFactor = nf;
        storage::saveCalibration(g.cal);
      }
      data["v"] = round2(power::packVolts(nf));
      return respondOk(c, data);
    }
    default:
      return respondError(c, "INVALID_ARGS", "Comando não tratado");
  }
}

// Agenda, amostra de consumo e exercício diário (só com a hora sincronizada).
void periodic() {
  static uint32_t lastSchedule = 0, lastBowl = 0, lastConsumptionSlot = 0, lastExercise = 0;
  uint32_t ms = millis();
  if (ms - lastBowl > BOWL_READ_MS || lastBowl == 0) {
    lastBowl = ms;
    refreshBowl();
  }
  if (ms - lastSchedule < SCHEDULE_CHECK_MS && lastSchedule != 0) return;
  lastSchedule = ms;
  LocalTime now;
  if (!localNow(now)) return;

  int due;
  Meal meal;
  {
    Lock l;
    hopperRollDay(g.hopper, dateKey(now), dayNumber(dateKey(now)) - dayNumber(g.hopper.dayKey));
    due = dueMeal(g.schedule, now);
    if (due >= 0) {
      meal = g.schedule.meals[due];
      markServed(g.schedule, due, now);  // antes de servir: um reset no meio não serve de novo
      storage::saveSchedule(g.schedule);
    }
  }
  if (due >= 0) feed(meal.grams, meal.mode, FeedSource::Schedule, meal.id, nullptr);

  uint32_t slot = nowTs() / CONSUMPTION_PERIOD_S;
  if (slot != lastConsumptionSlot) {
    lastConsumptionSlot = slot;
    ScaleReading r = refreshBowl();
    bool present;
    {
      Lock l;
      present = g.bowlPresent;
    }
    if (r.ok && present) {
      ConsumptionRecord rec;
      {
        Lock l;
        rec.seq = ++g.seq;
        storage::saveCounters(g.seq, g.feedId);
      }
      rec.ts = nowTs();
      rec.foodG = r.grams;
      history::appendConsumption(rec);
      net::publish(Topic::Event, buildConsumption(rec));
    }
  }

  if (now.hour == EXERCISE_HOUR && now.minute == EXERCISE_MINUTE && lastExercise != dateKey(now)) {
    lastExercise = dateKey(now);
    Serial.println("[disp] exercício diário do rotor");
    rotor::run(RotorDir::Forward, true, 1000);
    rotor::run(RotorDir::Reverse, true, 1000);
  }
}
}  // namespace

void begin() { queue = xQueueCreate(4, sizeof(Msg)); }

bool submit(const Command& c) {
  static Msg m;  // copiado pela fila; evita ~400 bytes na pilha da task de rede
  m.kind = MsgKind::AppCommand;
  m.cmd = c;
  return xQueueSend(queue, &m, 0) == pdTRUE;
}

void buttonFeed() {
  static Msg m;
  m.kind = MsgKind::ButtonFeed;
  if (!gFeeding) xQueueSend(queue, &m, 0);
}

void buttonRefill() {
  static Msg m;
  m.kind = MsgKind::ButtonRefill;
  xQueueSend(queue, &m, 0);
}

void task(void*) {
  static Msg m;
  for (;;) {
    if (xQueueReceive(queue, &m, pdMS_TO_TICKS(200)) == pdTRUE) handle(m);
    periodic();
  }
}
}  // namespace control
