#include "power.h"
#include <Arduino.h>
#include "config.h"
#include "battery_curve.h"
#include "stats.h"

namespace power {

void begin() {
  analogSetPinAttenuation(PIN_BATTERY, ADC_11db);
  analogSetPinAttenuation(PIN_MAINS, ADC_11db);
}

bool onMains() { return analogReadMilliVolts(PIN_MAINS) > MAINS_PRESENT_MV; }

double packVolts(double factor) {
  double v[BATTERY_ADC_SAMPLES];
  for (int i = 0; i < BATTERY_ADC_SAMPLES; i++) {
    v[i] = analogReadMilliVolts(PIN_BATTERY);
    delayMicroseconds(200);
  }
  return packVoltsFromMv(trimmedMean(v, BATTERY_ADC_SAMPLES), factor);
}
}  // namespace power
