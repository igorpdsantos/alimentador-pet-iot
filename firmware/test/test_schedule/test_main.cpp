#include <unity.h>
#include <string.h>
#include "schedule.h"

void setUp() {}
void tearDown() {}

static Schedule makeSchedule() {
  Schedule s;
  memset(&s, 0, sizeof(s));
  Meal m[] = {
      {1, 7, 30, 40, 0x7F, true, FeedMode::Add},       // todo dia
      {2, 18, 0, 50, 0x3E, true, FeedMode::FillTo},    // seg–sex
      {3, 12, 0, 30, 0x7F, false, FeedMode::Add},      // desativada
  };
  replaceMeals(s, m, 3);
  return s;
}

// 13/10/2026 é uma terça (wday 2)
static LocalTime at(int day, int wday, int h, int m) { return {2026, 10, day, wday, h, m}; }

void test_fires_on_exact_minute_once() {
  Schedule s = makeSchedule();
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 7, 29)));
  int i = dueMeal(s, at(13, 2, 7, 30));
  TEST_ASSERT_EQUAL(0, i);
  markServed(s, i, at(13, 2, 7, 30));
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 7, 30)));  // mesma checagem 20 s depois
  TEST_ASSERT_EQUAL(0, dueMeal(s, at(14, 3, 7, 30)));   // dia seguinte, de novo
}

void test_missed_meal_not_served_later() {
  Schedule s = makeSchedule();
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 7, 31)));
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 9, 0)));
}

void test_weekdays_and_disabled() {
  Schedule s = makeSchedule();
  TEST_ASSERT_EQUAL(1, dueMeal(s, at(13, 2, 18, 0)));   // terça
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(18, 0, 18, 0)));  // domingo
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 12, 0)));  // desativada
}

void test_next_meal() {
  Schedule s = makeSchedule();
  TEST_ASSERT_EQUAL(0, nextMeal(s, at(13, 2, 6, 0)));
  TEST_ASSERT_EQUAL(1, nextMeal(s, at(13, 2, 8, 0)));
  // sábado 20h: domingo 7:30 vem antes de segunda 18:00
  TEST_ASSERT_EQUAL(0, nextMeal(s, at(17, 6, 20, 0)));
  // sexta 19h, só a refeição de dias úteis: próxima é segunda
  Schedule only;
  memset(&only, 0, sizeof(only));
  Meal m = {2, 18, 0, 50, 0x3E, true, FeedMode::Add};
  replaceMeals(only, &m, 1);
  TEST_ASSERT_EQUAL(0, nextMeal(only, at(16, 5, 19, 0)));
  // já servida agora: não conta como próxima no mesmo minuto
  markServed(s, 0, at(13, 2, 7, 30));
  TEST_ASSERT_EQUAL(1, nextMeal(s, at(13, 2, 7, 30)));
}

void test_replace_keeps_served_flag() {
  Schedule s = makeSchedule();
  markServed(s, 0, at(13, 2, 7, 30));
  Meal m[] = {{5, 9, 0, 20, 0x7F, true, FeedMode::Add}, {1, 7, 30, 45, 0x7F, true, FeedMode::Add}};
  replaceMeals(s, m, 2);
  TEST_ASSERT_EQUAL(2, s.count);
  TEST_ASSERT_EQUAL(-1, dueMeal(s, at(13, 2, 7, 30)));  // id 1 continua marcada como servida
}

void test_parse_hhmm() {
  uint8_t h, m;
  TEST_ASSERT_TRUE(parseHHMM("07:05", h, m));
  TEST_ASSERT_EQUAL(7, h);
  TEST_ASSERT_EQUAL(5, m);
  TEST_ASSERT_FALSE(parseHHMM("24:00", h, m));
  TEST_ASSERT_FALSE(parseHHMM("7:05", h, m));
  TEST_ASSERT_FALSE(parseHHMM("07:60", h, m));
  TEST_ASSERT_FALSE(parseHHMM(nullptr, h, m));
}

void test_day_number() {
  TEST_ASSERT_EQUAL(0, dayNumber(19700101));
  TEST_ASSERT_EQUAL(1, dayNumber(20261101) - dayNumber(20261031));
  TEST_ASSERT_EQUAL(1, dayNumber(20280301) - dayNumber(20280229));  // ano bissexto
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_fires_on_exact_minute_once);
  RUN_TEST(test_missed_meal_not_served_later);
  RUN_TEST(test_weekdays_and_disabled);
  RUN_TEST(test_next_meal);
  RUN_TEST(test_replace_keeps_served_flag);
  RUN_TEST(test_parse_hhmm);
  RUN_TEST(test_day_number);
  return UNITY_END();
}
