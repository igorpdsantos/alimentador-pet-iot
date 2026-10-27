// Nível estimado do reservatório, sem sensor (specs/04-firmware.md §4.6).
#pragma once
#include <stdint.h>

constexpr double HOPPER_DEFAULT_CAPACITY_G = 800;
constexpr int HOPPER_AVG_DAYS = 7;

struct Hopper {
  double remainingG;
  double capacityG;
  bool capacityLearned;
  bool fullSinceRefill;     // o último refill foi "cheio" (permite aprender a capacidade)
  double servedSinceRefill;
  double dayServed[HOPPER_AVG_DAYS];  // gramas servidas por dia, [0] = hoje
  uint32_t dayKey;                    // AAAAMMDD de dayServed[0]
  uint8_t daysTracked;
};

void hopperInit(Hopper& h);
// Avança o dia (pode pular dias: zera os intermediários).
void hopperRollDay(Hopper& h, uint32_t today, int daysElapsed);
void hopperServed(Hopper& h, double grams);
void hopperRefillFull(Hopper& h);
void hopperRefillGrams(Hopper& h, double grams);
// Refeição terminou em NO_FLOW: reservatório considerado vazio; aprende a capacidade.
// Devolve true se foi "vazio de verdade" (HOPPER_EMPTY), false se foi travamento com ração estimada.
bool hopperNoFlow(Hopper& h);
void hopperEmptied(Hopper& h);
int hopperPercent(const Hopper& h);
double hopperDailyAverage(const Hopper& h);
int hopperDaysLeft(const Hopper& h);  // -1 = sem dados
bool hopperLow(const Hopper& h);
