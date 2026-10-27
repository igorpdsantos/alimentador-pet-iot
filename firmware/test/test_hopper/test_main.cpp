#include <unity.h>
#include "hopper.h"

void setUp() {}
void tearDown() {}

void test_refill_and_serve() {
  Hopper h;
  hopperInit(h);
  hopperRefillFull(h);
  TEST_ASSERT_EQUAL(100, hopperPercent(h));
  hopperServed(h, 200);
  TEST_ASSERT_EQUAL_FLOAT(600, h.remainingG);
  TEST_ASSERT_EQUAL(75, hopperPercent(h));
  hopperRefillGrams(h, 1000);  // não passa da capacidade
  TEST_ASSERT_EQUAL_FLOAT(800, h.remainingG);
}

void test_learns_capacity_after_full_refill() {
  Hopper h;
  hopperInit(h);
  hopperRefillFull(h);
  hopperServed(h, 500);
  hopperServed(h, 450);  // serviu mais que a capacidade estimada
  TEST_ASSERT_TRUE(hopperNoFlow(h));
  TEST_ASSERT_TRUE(h.capacityLearned);
  TEST_ASSERT_EQUAL_FLOAT(950, h.capacityG);
  TEST_ASSERT_EQUAL_FLOAT(0, h.remainingG);
}

void test_jam_with_food_left_is_not_empty() {
  Hopper h;
  hopperInit(h);
  hopperRefillGrams(h, 600);
  TEST_ASSERT_FALSE(hopperNoFlow(h));
  TEST_ASSERT_EQUAL_FLOAT(600, h.remainingG);
}

void test_days_left() {
  Hopper h;
  hopperInit(h);
  hopperRefillFull(h);
  TEST_ASSERT_EQUAL(-1, hopperDaysLeft(h));
  hopperRollDay(h, 20261013, 0);
  hopperServed(h, 100);
  hopperRollDay(h, 20261014, 1);
  hopperServed(h, 100);
  hopperRollDay(h, 20261015, 1);
  // dias completos: 13 e 14, média 100 g/dia; restam 600 g
  TEST_ASSERT_EQUAL_FLOAT(100, hopperDailyAverage(h));
  TEST_ASSERT_EQUAL(6, hopperDaysLeft(h));
  hopperRollDay(h, 20261030, 15);  // muitos dias parado: zera tudo
  TEST_ASSERT_EQUAL(-1, hopperDaysLeft(h));
}

void test_low_alert() {
  Hopper h;
  hopperInit(h);
  hopperRefillGrams(h, 160);
  TEST_ASSERT_TRUE(hopperLow(h));
  hopperRefillGrams(h, 10);
  TEST_ASSERT_FALSE(hopperLow(h));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_refill_and_serve);
  RUN_TEST(test_learns_capacity_after_full_refill);
  RUN_TEST(test_jam_with_food_left_is_not_empty);
  RUN_TEST(test_days_left);
  RUN_TEST(test_low_alert);
  return UNITY_END();
}
