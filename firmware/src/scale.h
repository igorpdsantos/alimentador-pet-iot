// Balança: HX711 + célula de 5 kg (specs/02-hardware.md §4, specs/04-firmware.md §4.4).
// Só a task de controle chama estas funções.
#pragma once
#include "dispenser.h"
#include "protocol.h"

namespace scale {
struct Raw {
  bool ok;
  bool stable;
  double counts;  // média (ou mediana se instável) das contagens brutas
};

void begin();
bool ready();
Raw readRaw(const Calibration& cal);  // 10 leituras, até 3 tentativas
double toPlatformGrams(double counts, const Calibration& cal);
// Leitura para a dosagem: ração na vasilha (descontada a tara da vasilha).
ScaleReading readFood(const Calibration& cal);
bool bowlPresent(double platformG, const Calibration& cal);
}  // namespace scale
