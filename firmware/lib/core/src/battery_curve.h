// Tensão do pack de 6×AA → porcentagem e nível (specs/02-hardware.md §3, specs/04-firmware.md §5).
#pragma once
#include <stdint.h>

constexpr int BATTERY_CELLS = 6;
constexpr double BATTERY_DIVIDER = 27.0 / (100.0 + 27.0);  // 0,2126
constexpr double BATTERY_MIN_INSTALLED_V = 3.0;

enum class BatteryLevel : uint8_t { Ok, Low, Critical };

struct BatteryState {
  bool installed;
  double volts;   // tensão do pack
  int pct;        // 0–100
  BatteryLevel level;
};

const char* toString(BatteryLevel l);
// Porcentagem por célula, interpolada na tabela das alcalinas.
int cellPercent(double cellVolts);
double packVoltsFromMv(double mv, double calibrationFactor);
BatteryState evaluateBattery(double packVolts);
// Novo fator a partir da tensão medida no multímetro.
double batteryCalibrationFactor(double measuredVolts, double rawPackVolts, double oldFactor);
