// Agenda de refeições (specs/04-firmware.md §6). Sem relógio próprio: recebe a hora local já convertida.
#pragma once
#include <stdint.h>
#include "types.h"

constexpr int MAX_MEALS = 8;

struct Meal {
  uint8_t id;
  uint8_t hour, minute;
  uint16_t grams;
  uint8_t daysMask;  // bit 0 = domingo … bit 6 = sábado (igual a tm_wday)
  bool enabled;
  FeedMode mode;
};

struct LocalTime {
  int year, month, day;  // calendário local
  int wday;              // 0 = domingo
  int hour, minute;
};

struct Schedule {
  Meal meals[MAX_MEALS];
  uint8_t count;
  uint32_t lastServed[MAX_MEALS];  // data (AAAAMMDD) em que cada refeição já foi servida
};

uint32_t dateKey(const LocalTime& t);
// Número do dia (dias desde 1970-01-01) de uma data AAAAMMDD, para contar dias entre datas.
int32_t dayNumber(uint32_t dateKey);
// Índice da refeição a disparar agora, ou -1. Só dispara no minuto exato e uma vez por dia.
int dueMeal(const Schedule& s, const LocalTime& now);
void markServed(Schedule& s, int index, const LocalTime& now);
// Próxima refeição ativa a partir de agora (inclui amanhã e demais dias da semana), ou -1.
int nextMeal(const Schedule& s, const LocalTime& now);
// Substitui a agenda mantendo "já servida hoje" das refeições com o mesmo id.
void replaceMeals(Schedule& s, const Meal* meals, uint8_t count);
bool parseHHMM(const char* s, uint8_t& h, uint8_t& m);
