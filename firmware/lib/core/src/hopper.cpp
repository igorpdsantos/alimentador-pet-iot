#include "hopper.h"
#include <string.h>

void hopperInit(Hopper& h) {
  memset(&h, 0, sizeof(h));
  h.capacityG = HOPPER_DEFAULT_CAPACITY_G;
}

void hopperRollDay(Hopper& h, uint32_t today, int daysElapsed) {
  if (h.dayKey == 0) { h.dayKey = today; h.daysTracked = 1; return; }
  if (today == h.dayKey || daysElapsed <= 0) return;
  if (daysElapsed > HOPPER_AVG_DAYS) daysElapsed = HOPPER_AVG_DAYS;
  memmove(h.dayServed + daysElapsed, h.dayServed, (HOPPER_AVG_DAYS - daysElapsed) * sizeof(double));
  for (int i = 0; i < daysElapsed; i++) h.dayServed[i] = 0;
  h.daysTracked = h.daysTracked + daysElapsed > HOPPER_AVG_DAYS ? HOPPER_AVG_DAYS : h.daysTracked + daysElapsed;
  h.dayKey = today;
}

void hopperServed(Hopper& h, double g) {
  if (g <= 0) return;
  h.remainingG = h.remainingG > g ? h.remainingG - g : 0;
  h.servedSinceRefill += g;
  h.dayServed[0] += g;
}

void hopperRefillFull(Hopper& h) {
  h.remainingG = h.capacityG;
  h.fullSinceRefill = true;
  h.servedSinceRefill = 0;
}

void hopperRefillGrams(Hopper& h, double g) {
  if (g <= 0) return;
  h.remainingG += g;
  if (h.remainingG > h.capacityG) h.remainingG = h.capacityG;
  h.fullSinceRefill = false;
}

bool hopperNoFlow(Hopper& h) {
  bool reallyEmpty = h.remainingG <= 0.15 * h.capacityG;
  if (h.fullSinceRefill && h.servedSinceRefill > 0.3 * h.capacityG) {
    // Esvaziou desde um refill cheio: o total servido é a capacidade real.
    h.capacityG = h.capacityLearned ? 0.5 * h.capacityG + 0.5 * h.servedSinceRefill : h.servedSinceRefill;
    h.capacityLearned = true;
    h.fullSinceRefill = false;
    reallyEmpty = true;
  }
  if (reallyEmpty) h.remainingG = 0;
  return reallyEmpty;
}

void hopperEmptied(Hopper& h) {
  h.remainingG = 0;
  h.fullSinceRefill = false;
}

int hopperPercent(const Hopper& h) {
  if (h.capacityG <= 0) return 0;
  int p = (int)(100.0 * h.remainingG / h.capacityG + 0.5);
  return p > 100 ? 100 : p;
}

double hopperDailyAverage(const Hopper& h) {
  // Ignora o dia de hoje (incompleto) quando já há dias completos.
  int from = h.daysTracked > 1 ? 1 : 0;
  int n = 0;
  double s = 0;
  for (int i = from; i < h.daysTracked; i++, n++) s += h.dayServed[i];
  return n ? s / n : 0;
}

int hopperDaysLeft(const Hopper& h) {
  double avg = hopperDailyAverage(h);
  if (avg < 1) return -1;
  return (int)(h.remainingG / avg);
}

bool hopperLow(const Hopper& h) { return hopperPercent(h) <= 20; }
