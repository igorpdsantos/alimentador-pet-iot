#include <unity.h>
#include "battery_curve.h"

void setUp() {}
void tearDown() {}

void test_table_points() {
  TEST_ASSERT_EQUAL(100, cellPercent(1.60));
  TEST_ASSERT_EQUAL(100, cellPercent(1.55));
  TEST_ASSERT_EQUAL(55, cellPercent(1.30));
  TEST_ASSERT_EQUAL(15, cellPercent(1.15));
  TEST_ASSERT_EQUAL(0, cellPercent(1.00));
  TEST_ASSERT_EQUAL(0, cellPercent(0.9));
}

void test_interpolation() {
  TEST_ASSERT_EQUAL(65, cellPercent(1.34));  // entre 1,30 (55) e 1,38 (75)
}

void test_divider() {
  // 1,83 V no pino com divisor 100k/27k ≈ 8,61 V no pack
  TEST_ASSERT_FLOAT_WITHIN(0.02, 8.61, packVoltsFromMv(1830, 1.0));
  TEST_ASSERT_FLOAT_WITHIN(0.02, 8.61 * 1.02, packVoltsFromMv(1830, 1.02));
}

void test_levels() {
  BatteryState s = evaluateBattery(9.0);  // 1,5 V/célula
  TEST_ASSERT_TRUE(s.installed);
  TEST_ASSERT_EQUAL(BatteryLevel::Ok, s.level);
  s = evaluateBattery(6 * 1.17);
  TEST_ASSERT_EQUAL(BatteryLevel::Low, s.level);
  s = evaluateBattery(6 * 1.06);
  TEST_ASSERT_EQUAL(BatteryLevel::Critical, s.level);
  s = evaluateBattery(1.2);
  TEST_ASSERT_FALSE(s.installed);
  TEST_ASSERT_EQUAL(0, s.pct);
}

void test_calibration_factor() {
  TEST_ASSERT_FLOAT_WITHIN(0.001, 1.05, batteryCalibrationFactor(8.4, 8.0, 1.0));
  TEST_ASSERT_EQUAL_FLOAT(1.0, batteryCalibrationFactor(12.0, 6.0, 1.0));  // absurdo: ignora
  TEST_ASSERT_EQUAL_FLOAT(1.0, batteryCalibrationFactor(8.0, 0.5, 1.0));   // sem pilhas
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_table_points);
  RUN_TEST(test_interpolation);
  RUN_TEST(test_divider);
  RUN_TEST(test_levels);
  RUN_TEST(test_calibration_factor);
  return UNITY_END();
}
