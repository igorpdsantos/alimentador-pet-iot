#include "schedule.h"
#include <string.h>

uint32_t dateKey(const LocalTime& t) { return (uint32_t)t.year * 10000 + t.month * 100 + t.day; }

int32_t dayNumber(uint32_t key) {
  // Algoritmo days_from_civil (H. Hinnant)
  int y = key / 10000, m = (key / 100) % 100, d = key % 100;
  y -= m <= 2;
  int era = (y >= 0 ? y : y - 399) / 400;
  unsigned yoe = (unsigned)(y - era * 400);
  unsigned doy = (153 * (m + (m > 2 ? -3 : 9)) + 2) / 5 + d - 1;
  unsigned doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  return era * 146097 + (int32_t)doe - 719468;
}

int dueMeal(const Schedule& s, const LocalTime& now) {
  uint32_t today = dateKey(now);
  for (int i = 0; i < s.count; i++) {
    const Meal& m = s.meals[i];
    if (!m.enabled || !(m.daysMask & (1 << now.wday))) continue;
    if (m.hour != now.hour || m.minute != now.minute) continue;
    if (s.lastServed[i] == today) continue;
    return i;
  }
  return -1;
}

void markServed(Schedule& s, int index, const LocalTime& now) {
  if (index >= 0 && index < s.count) s.lastServed[index] = dateKey(now);
}

int nextMeal(const Schedule& s, const LocalTime& now) {
  int best = -1, bestDist = 8 * 1440;
  int nowMin = now.hour * 60 + now.minute;
  for (int i = 0; i < s.count; i++) {
    const Meal& m = s.meals[i];
    if (!m.enabled || !m.daysMask) continue;
    int mealMin = m.hour * 60 + m.minute;
    for (int d = 0; d < 8; d++) {
      int wday = (now.wday + d) % 7;
      if (!(m.daysMask & (1 << wday))) continue;
      int dist = d * 1440 + mealMin - nowMin;
      if (dist < 0 || (dist == 0 && s.lastServed[i] == dateKey(now))) continue;
      if (dist < bestDist) { bestDist = dist; best = i; }
      break;
    }
  }
  return best;
}

void replaceMeals(Schedule& s, const Meal* meals, uint8_t count) {
  uint32_t served[MAX_MEALS] = {0};
  if (count > MAX_MEALS) count = MAX_MEALS;
  for (int i = 0; i < count; i++)
    for (int j = 0; j < s.count; j++)
      if (s.meals[j].id == meals[i].id) served[i] = s.lastServed[j];
  memcpy(s.meals, meals, count * sizeof(Meal));
  memcpy(s.lastServed, served, sizeof(served));
  s.count = count;
}

bool parseHHMM(const char* s, uint8_t& h, uint8_t& m) {
  if (!s || strlen(s) != 5 || s[2] != ':') return false;
  const int digits[] = {0, 1, 3, 4};
  for (int i : digits)
    if (s[i] < '0' || s[i] > '9') return false;
  int hh = (s[0] - '0') * 10 + (s[1] - '0');
  int mm = (s[3] - '0') * 10 + (s[4] - '0');
  if (hh > 23 || mm > 59) return false;
  h = hh;
  m = mm;
  return true;
}
