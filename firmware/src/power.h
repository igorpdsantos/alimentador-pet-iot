// Fonte 12 V e pilhas do no-break (specs/04-firmware.md §5).
#pragma once

namespace power {
void begin();
bool onMains();
// Tensão do pack (média aparada de 16 leituras), já com o fator de calibração.
double packVolts(double factor);
}  // namespace power
