#include "scale.h"
#include <Arduino.h>
#include <HX711.h>
#include "config.h"
#include "stats.h"

namespace scale {
namespace {
HX711 hx;
}

void begin() {
  hx.begin(PIN_HX711_DOUT, PIN_HX711_SCK, 128);  // canal A, ganho 128
}

bool ready() { return hx.wait_ready_timeout(SCALE_TIMEOUT_MS); }

Raw readRaw(const Calibration& cal) {
  double v[SCALE_SAMPLES];
  Raw r{false, false, 0};
  for (int attempt = 0; attempt < SCALE_ATTEMPTS; attempt++) {
    int n = 0;
    for (; n < SCALE_SAMPLES; n++) {
      if (!hx.wait_ready_timeout(SCALE_TIMEOUT_MS)) break;  // HX711 a 10 Hz: ~100 ms por leitura
      v[n] = hx.read();
    }
    if (n < SCALE_SAMPLES) return r;  // sem resposta
    r.ok = true;
    // O critério de estabilidade é em gramas; sem calibração assume ~400 contagens/g (célula de 5 kg).
    double countsPerGram = isCalibrated(cal) ? fabs(cal.scaleFactor) : 400;
    r.counts = mean(v, n);
    r.stable = stddev(v, n) < SCALE_STABLE_STDDEV_G * countsPerGram;
    if (r.stable) return r;
    r.counts = median(v, n);
  }
  return r;
}

double toPlatformGrams(double counts, const Calibration& cal) {
  if (!isCalibrated(cal)) return 0;
  return (counts - cal.scaleOffset) / cal.scaleFactor;
}

ScaleReading readFood(const Calibration& cal) {
  Raw raw = readRaw(cal);
  if (!raw.ok || !isCalibrated(cal)) return {false, false, 0};
  double platform = toPlatformGrams(raw.counts, cal);
  if (platform > SCALE_OVERLOAD_G || platform < -500) return {false, raw.stable, 0};  // leitura absurda
  return {true, raw.stable, platform - cal.bowlWeightG};
}

bool bowlPresent(double platformG, const Calibration& cal) {
  if (cal.bowlWeightG > BOWL_MIN_G) return platformG > cal.bowlWeightG * 0.5;
  return platformG > BOWL_MIN_G;
}
}  // namespace scale
