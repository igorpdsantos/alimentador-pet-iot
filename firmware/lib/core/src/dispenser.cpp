#include "dispenser.h"
#include <math.h>

double feedTolerance(double target) { return fmax(3.0, 0.05 * target); }

uint16_t pulseMs(double missing, double flow) {
  if (flow < FLOW_MIN) flow = FLOW_MIN;
  double t = missing * 0.6 / flow;
  if (t < PULSE_MIN_MS) t = PULSE_MIN_MS;
  if (t > PULSE_MAX_MS) t = PULSE_MAX_MS;
  return (uint16_t)t;
}

double effectiveTarget(const FeedRequest& req) {
  double t = req.grams;
  if (req.mode == FeedMode::FillTo) t = req.grams - req.currentFoodG;
  if (req.maxBowlG > 0 && req.currentFoodG + t > req.maxBowlG) t = req.maxBowlG - req.currentFoodG;
  return t > 0 ? t : 0;
}

namespace {

// Aplica uma nova leitura: soma só ganhos positivos e marca pet comendo / leitura instável.
void account(FeedResult& r, const ScaleReading& now, double& last, double& delta) {
  delta = now.grams - last;
  if (delta < -INTERFERENCE_DROP_G) r.interference = true;
  if (delta > 0) r.servedG += delta;
  if (!now.stable) r.unstable = true;
  last = now.grams;
}

}  // namespace

FeedResult runFeed(const FeedRequest& req, DispenserIO& io) {
  FeedResult r{};
  r.flowGPerMs = req.flowGPerMs < FLOW_MIN ? 0.01 : req.flowGPerMs;
  uint32_t start = io.nowMs();
  uint32_t maxMs = req.maxDurationMs ? req.maxDurationMs : FEED_MAX_MS;
  r.targetG = effectiveTarget(req);

  // PRECHECK
  if (!req.scaleOk) { r.status = FeedStatus::ScaleError; return r; }
  if (!req.powerOk) { r.status = FeedStatus::LowBattery; return r; }
  if (req.requireBowl && !req.bowlPresent) { r.status = FeedStatus::BowlMissing; return r; }
  if (r.targetG < MIN_SERVE_G) { r.status = FeedStatus::SkippedFull; return r; }

  // DESTRAVA: solta grãos assentados
  io.rotor(RotorDir::Reverse, false, LOOSEN_MS);
  io.rotor(RotorDir::Forward, false, LOOSEN_MS);

  // BASELINE
  ScaleReading base = io.readStable();
  if (!base.ok) { r.status = FeedStatus::ScaleError; r.durationMs = io.nowMs() - start; return r; }
  if (!base.stable) r.unstable = true;
  double last = base.grams;

  double tol = feedTolerance(r.targetG);
  uint8_t noGain = 0;
  bool finished = false;
  r.status = FeedStatus::Ok;

  while (!finished) {
    if (io.cancelRequested()) { r.status = FeedStatus::Canceled; break; }
    if (io.nowMs() - start > maxMs) { r.status = FeedStatus::Timeout; break; }
    double missing = r.targetG - r.servedG;
    if (missing <= tol * STOP_FRACTION) break;

    // GIRA → ASSENTA → PESA
    bool slow = missing < POCKET_G;
    uint16_t t = pulseMs(missing, r.flowGPerMs);
    io.rotor(RotorDir::Forward, slow, t);
    r.pulses++;
    io.waitMs(SETTLE_MS);
    ScaleReading now = io.readStable();
    if (!now.ok) { r.status = FeedStatus::ScaleError; break; }
    double delta;
    account(r, now, last, delta);
    io.progress(r.servedG);

    if (delta >= NO_GAIN_G) {
      noGain = 0;
      if (!slow) {
        double f = (1 - FLOW_ALPHA) * r.flowGPerMs + FLOW_ALPHA * (delta / t);
        r.flowGPerMs = fmin(FLOW_MAX, fmax(FLOW_MIN, f));
      }
      continue;
    }
    // RECUA: anti-travamento. Antes do primeiro recuo espera 2 giros sem ganho;
    // depois, cada "avança de novo" sem ganho já conta como tentativa falha.
    if (++noGain >= (r.unjamTries ? 1 : NO_GAIN_PULSES)) {
      if (r.unjamTries >= MAX_UNJAM_TRIES) { r.status = FeedStatus::NoFlow; finished = true; break; }
      r.unjamTries++;
      noGain = 0;
      io.rotor(RotorDir::Reverse, false, UNJAM_REVERSE_MS);
    }
  }

  // DONE / ERROR: alivia as pás e pesa o final
  io.rotor(RotorDir::Reverse, false, RELIEF_MS);
  if (r.status != FeedStatus::ScaleError) {
    io.waitMs(SETTLE_MS);
    ScaleReading fin = io.readStable();
    if (fin.ok) {
      double delta;
      account(r, fin, last, delta);
    }
  }
  if (r.status == FeedStatus::Ok && r.servedG < r.targetG - tol) r.status = FeedStatus::Partial;
  r.durationMs = io.nowMs() - start;
  return r;
}
