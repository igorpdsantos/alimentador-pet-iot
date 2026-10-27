// Protocolo contra os exemplos de tools/protocol-fixtures (os mesmos que o app usa).
#include <unity.h>
#include <string.h>
#include "../fixtures.h"
#include "protocol.h"
#include "alerts.h"

void setUp() {}
void tearDown() {}

static Settings settings() {
  Settings s;
  defaultSettings(s);
  return s;
}

static ParseResult parse(const std::string& json, Command& c) {
  TEST_ASSERT_FALSE_MESSAGE(json.empty(), "fixture não encontrada");
  return parseCommand(json.c_str(), json.size(), settings(), c);
}

// Compara JSON pelo conteúdo (ordem das chaves não importa).
static void assertSameJson(const std::string& expected, const std::string& actual) {
  JsonDocument a, b;
  TEST_ASSERT_FALSE(deserializeJson(a, expected));
  TEST_ASSERT_FALSE(deserializeJson(b, actual));
  if (a.as<JsonVariantConst>() != b.as<JsonVariantConst>()) {
    std::string norm;
    serializeJson(a, norm);
    TEST_FAIL_MESSAGE(("esperado " + norm + "\nobtido   " + actual).c_str());
  }
}

void test_all_valid_commands_parse() {
  const char* files[] = {"cmd_ping.json", "cmd_feed.json", "cmd_feed_fill_to.json", "cmd_cancel_feed.json",
                         "cmd_set_schedule.json", "cmd_set_settings.json", "cmd_history.json", "cmd_calibrate.json",
                         "cmd_rotor_test.json", "cmd_servo_trim.json", "cmd_calibrate_battery.json",
                         "cmd_refill.json", "cmd_refill_grams.json"};
  for (const char* f : files) {
    Command c;
    ParseResult r = parse(fixture(f), c);
    TEST_ASSERT_TRUE_MESSAGE(r.ok, f);
  }
}

void test_command_fields() {
  Command c;
  parse(fixture("cmd_feed_fill_to.json"), c);
  TEST_ASSERT_EQUAL(Cmd::Feed, c.cmd);
  TEST_ASSERT_EQUAL_STRING("a1b2c4", c.reqId);
  TEST_ASSERT_EQUAL_FLOAT(80, c.grams);
  TEST_ASSERT_EQUAL(FeedMode::FillTo, c.mode);

  parse(fixture("cmd_set_schedule.json"), c);
  TEST_ASSERT_EQUAL(2, c.mealCount);
  TEST_ASSERT_EQUAL(18, c.meals[1].hour);
  TEST_ASSERT_EQUAL(0x3E, c.meals[1].daysMask);
  TEST_ASSERT_EQUAL(FeedMode::FillTo, c.meals[1].mode);

  parse(fixture("cmd_set_settings.json"), c);
  TEST_ASSERT_EQUAL_STRING("Thor", c.settings.petName);
  TEST_ASSERT_EQUAL(25, c.settings.buttonGrams);
  TEST_ASSERT_EQUAL(300, c.settings.maxBowlG);  // não enviado: mantém o atual

  parse(fixture("cmd_history.json"), c);
  TEST_ASSERT_EQUAL(120, c.sinceSeq);
  TEST_ASSERT_EQUAL(20, c.limit);
  TEST_ASSERT_FALSE(c.kindConsumption);

  parse(fixture("cmd_rotor_test.json"), c);
  TEST_ASSERT_TRUE(c.dirReverse);
  TEST_ASSERT_EQUAL(800, c.ms);

  parse(fixture("cmd_refill_grams.json"), c);
  TEST_ASSERT_FALSE(c.refillFull);
  TEST_ASSERT_EQUAL_FLOAT(400, c.grams);
}

void test_invalid_commands() {
  const char* files[] = {"invalid/feed_grams_too_low.json", "invalid/feed_bad_mode.json",
                         "invalid/schedule_bad_time.json", "invalid/rotor_test_too_long.json",
                         "invalid/unknown_cmd.json"};
  for (const char* f : files) {
    Command c;
    ParseResult r = parse(fixture(f), c);
    TEST_ASSERT_FALSE_MESSAGE(r.ok, f);
    TEST_ASSERT_TRUE_MESSAGE(r.hasReqId, f);
    TEST_ASSERT_EQUAL_STRING("INVALID_ARGS", r.error);
  }
  Command c;
  ParseResult r = parse(fixture("invalid/missing_req_id.json"), c);
  TEST_ASSERT_FALSE(r.ok);
  TEST_ASSERT_FALSE(r.hasReqId);
  r = parseCommand("{oops", 5, settings(), c);
  TEST_ASSERT_FALSE(r.hasReqId);
}

void test_status_matches_fixture() {
  StatusSnapshot s{};
  s.ts = 1760360400;
  s.fw = "0.1.0";
  s.onMains = true;
  s.battery = {true, 8.62, 78, BatteryLevel::Ok};
  s.bowlPresent = true;
  s.foodG = 42.5;
  s.hopperRemainingG = 610;
  s.hopperPct = 76;
  s.hopperCapacityG = 800;
  s.hopperDaysLeft = 10;
  s.hasNextMeal = true;
  s.nextMeal = {2, 18, 0, 50, 0x7F, true, FeedMode::Add};
  s.wifiRssi = -61;
  s.timeSynced = true;
  s.alerts = ALERT_LOW_BATTERY;
  assertSameJson(fixture("status.json"), buildStatus(s));
}

void test_config_matches_fixture() {
  Schedule sched{};
  Meal m = {1, 7, 30, 40, 0x7F, true, FeedMode::Add};
  replaceMeals(sched, &m, 1);
  Settings set = settings();
  strcpy(set.petName, "Thor");
  Calibration cal;
  defaultCalibration(cal);
  cal.scaleFactor = 412.3;
  cal.bowlWeightG = 180.0;
  assertSameJson(fixture("config.json"), buildConfig(sched, set, cal));
}

static FeedRecord record57() {
  FeedRecord r{};
  r.seq = 123;
  r.ts = 1760385600;
  r.feedId = 57;
  r.source = (uint8_t)FeedSource::App;
  r.status = (uint8_t)FeedStatus::Ok;
  r.targetG = 50;
  r.servedG = 49.6f;
  r.durationMs = 9120;
  r.pulses = 6;
  r.unjamTries = 1;
  r.batteryPct = 79;
  return r;
}

void test_events_match_fixtures() {
  assertSameJson(fixture("event_feed_result.json"), buildFeedResult(record57()));
  assertSameJson(fixture("event_feed_started.json"),
                 buildFeedStarted(123, 1760385591, 57, FeedSource::App, 0, 50));
  assertSameJson(fixture("event_feed_progress.json"), buildFeedProgress(123, 1760385595, 57, 31.4));
  assertSameJson(fixture("event_alert.json"), buildAlert(1760385000, alertCode(ALERT_ON_BATTERY),
                                                         alertMessage(ALERT_ON_BATTERY)));
  assertSameJson(fixture("event_consumption.json"), buildConsumption({124, 1760362200, 30.1f}));

  FeedRecord nf{};
  nf.seq = 125; nf.ts = 1760400000; nf.feedId = 58; nf.source = (uint8_t)FeedSource::Schedule; nf.mealId = 2;
  nf.status = (uint8_t)FeedStatus::NoFlow; nf.targetG = 50; nf.servedG = 3.1f; nf.durationMs = 19800;
  nf.pulses = 10; nf.unjamTries = 4; nf.batteryPct = 79;
  assertSameJson(fixture("event_feed_result_no_flow.json"), buildFeedResult(nf));
}

void test_responses_match_fixtures() {
  JsonDocument data;
  data["feed_id"] = 57;
  assertSameJson(fixture("resp_ok_feed.json"), buildOk("a1b2c3", data));
  assertSameJson(fixture("resp_error_busy.json"), buildError("a1b2c3", "BUSY", "Já há uma refeição em andamento"));

  JsonDocument h;
  JsonArray items = h["items"].to<JsonArray>();
  FeedRecord a = record57();
  a.seq = 121; a.ts = 1760360400; a.feedId = 56; a.source = (uint8_t)FeedSource::Schedule; a.mealId = 1;
  a.targetG = 40; a.servedG = 41.2f; a.durationMs = 8400; a.pulses = 5; a.unjamTries = 0; a.batteryPct = 80;
  fillFeedRecord(items.add<JsonObject>(), a);
  fillFeedRecord(items.add<JsonObject>(), record57());
  h["next_seq"] = 124;
  h["has_more"] = false;
  assertSameJson(fixture("resp_history_feeds.json"), buildOk("h1", h));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_all_valid_commands_parse);
  RUN_TEST(test_command_fields);
  RUN_TEST(test_invalid_commands);
  RUN_TEST(test_status_matches_fixture);
  RUN_TEST(test_config_matches_fixture);
  RUN_TEST(test_events_match_fixtures);
  RUN_TEST(test_responses_match_fixtures);
  return UNITY_END();
}
