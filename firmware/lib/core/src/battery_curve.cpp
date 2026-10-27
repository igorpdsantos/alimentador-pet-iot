#include "battery_curve.h"

namespace {
const double kVolts[] = {1.55, 1.45, 1.38, 1.30, 1.25, 1.20, 1.15, 1.10, 1.05, 1.00};
const int kPct[] = {100, 90, 75, 55, 40, 25, 15, 8, 3, 0};
const int kPoints = sizeof(kPct) / sizeof(kPct[0]);
}  // namespace

const char* toString(BatteryLevel l) {
  switch (l) {
    case BatteryLevel::Low: return "low";
    case BatteryLevel::Critical: return "critical";
    default: return "ok";
  }
}

int cellPercent(double v) {
  if (v >= kVolts[0]) return 100;
  if (v <= kVolts[kPoints - 1]) return 0;
  for (int i = 1; i < kPoints; i++) {
    if (v >= kVolts[i]) {
      double t = (v - kVolts[i]) / (kVolts[i - 1] - kVolts[i]);
      return (int)(kPct[i] + t * (kPct[i - 1] - kPct[i]) + 0.5);
    }
  }
  return 0;
}

double packVoltsFromMv(double mv, double factor) { return mv / 1000.0 / BATTERY_DIVIDER * factor; }

BatteryState evaluateBattery(double packVolts) {
  BatteryState s{};
  s.volts = packVolts;
  s.installed = packVolts >= BATTERY_MIN_INSTALLED_V;
  s.pct = s.installed ? cellPercent(packVolts / BATTERY_CELLS) : 0;
  s.level = s.pct <= 5 ? BatteryLevel::Critical : s.pct <= 20 ? BatteryLevel::Low : BatteryLevel::Ok;
  return s;
}

double batteryCalibrationFactor(double measured, double raw, double oldFactor) {
  if (raw < BATTERY_MIN_INSTALLED_V || measured < BATTERY_MIN_INSTALLED_V) return oldFactor;
  double f = oldFactor * measured / raw;
  return (f < 0.8 || f > 1.2) ? oldFactor : f;  // mais de 20 % de erro = medida errada
}
