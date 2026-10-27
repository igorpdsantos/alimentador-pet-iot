// Máquina de estados da dosagem com rotor e balança simulados.
#include <unity.h>
#include <math.h>
#include <initializer_list>
#include "dispenser.h"

void setUp() {}
void tearDown() {}

// Simula o mecanismo: cada ms de giro para frente derruba `flow` g (metade no lento),
// até acabar a ração; travamentos opcionais que só soltam depois de recuar.
struct FakeIO : DispenserIO {
  uint32_t t = 0;
  double bowl = 0;        // g na vasilha
  double hopper = 1000;   // g no reservatório
  double flow = 0.012;    // g/ms real
  int jamPulses = 0;      // giros para frente que não derrubam nada até recuar
  bool jamForever = false;
  bool scaleBroken = false;
  int cancelAfterPulses = -1;
  int forwardPulses = 0;
  int petEatsAtPulse = -1;
  double lastProgress = -1;
  uint32_t maxContinuousMs = 0;

  uint32_t nowMs() override { return t; }
  void rotor(RotorDir dir, bool slow, uint16_t ms) override {
    t += ms;
    if (ms > maxContinuousMs) maxContinuousMs = ms;
    if (dir == RotorDir::Reverse) {
      if (!jamForever && ms == UNJAM_REVERSE_MS) jamPulses = 0;
      return;
    }
    if (ms == LOOSEN_MS) return;  // destrava inicial: assume que não cai nada
    forwardPulses++;
    if (petEatsAtPulse == forwardPulses) bowl -= 30;
    if (jamForever || jamPulses > 0) return;
    double g = fmin(hopper, ms * flow * (slow ? 0.5 : 1.0));
    hopper -= g;
    bowl += g;
  }
  void waitMs(uint16_t ms) override { t += ms; }
  ScaleReading readStable() override {
    t += 1000;
    return {!scaleBroken, true, bowl};
  }
  bool cancelRequested() override { return cancelAfterPulses >= 0 && forwardPulses >= cancelAfterPulses; }
  void progress(double g) override { lastProgress = g; }
};

static FeedRequest req(double grams) {
  FeedRequest r{};
  r.grams = grams;
  r.mode = FeedMode::Add;
  r.powerOk = r.scaleOk = r.bowlPresent = r.requireBowl = true;
  r.maxBowlG = 300;
  r.flowGPerMs = 0.01;
  return r;
}

void test_doses_within_tolerance() {
  for (double g : {10.0, 20.0, 50.0, 100.0, 200.0}) {
    FakeIO io;
    FeedResult r = runFeed(req(g), io);
    TEST_ASSERT_EQUAL_MESSAGE(FeedStatus::Ok, r.status, "status");
    TEST_ASSERT_FLOAT_WITHIN(feedTolerance(g), g, r.servedG);
    TEST_ASSERT_FLOAT_WITHIN(0.01, io.bowl, r.servedG);
    TEST_ASSERT_TRUE(r.durationMs < FEED_MAX_MS);
    TEST_ASSERT_TRUE(io.maxContinuousMs <= PULSE_MAX_MS);
    TEST_ASSERT_EQUAL(0, r.unjamTries);
  }
}

void test_learns_flow() {
  FakeIO io;
  io.flow = 0.02;
  FeedResult r = runFeed(req(100), io);
  TEST_ASSERT_TRUE(r.flowGPerMs > 0.012);
  TEST_ASSERT_TRUE(r.flowGPerMs <= 0.02 * 1.01);
}

void test_precheck_failures() {
  FakeIO io;
  FeedRequest q = req(50);
  q.bowlPresent = false;
  TEST_ASSERT_EQUAL(FeedStatus::BowlMissing, runFeed(q, io).status);
  q = req(50);
  q.powerOk = false;
  TEST_ASSERT_EQUAL(FeedStatus::LowBattery, runFeed(q, io).status);
  q = req(50);
  q.scaleOk = false;
  TEST_ASSERT_EQUAL(FeedStatus::ScaleError, runFeed(q, io).status);
  TEST_ASSERT_EQUAL(0, io.t);  // rotor não se mexeu
}

void test_empty_hopper_gives_no_flow() {
  FakeIO io;
  io.hopper = 0;
  FeedResult r = runFeed(req(50), io);
  TEST_ASSERT_EQUAL(FeedStatus::NoFlow, r.status);
  TEST_ASSERT_EQUAL(MAX_UNJAM_TRIES, r.unjamTries);
  TEST_ASSERT_TRUE(r.durationMs <= 25000);  // T-VAZIO
}

void test_jam_is_cleared_by_reversing() {
  FakeIO io;
  io.jamPulses = 1;
  FeedResult r = runFeed(req(50), io);
  TEST_ASSERT_EQUAL(FeedStatus::Ok, r.status);
  TEST_ASSERT_EQUAL(1, r.unjamTries);
}

void test_permanent_jam() {
  FakeIO io;
  io.jamForever = true;
  FeedResult r = runFeed(req(50), io);
  TEST_ASSERT_EQUAL(FeedStatus::NoFlow, r.status);
}

void test_partial_when_hopper_runs_out() {
  FakeIO io;
  io.hopper = 20;
  FeedResult r = runFeed(req(50), io);
  TEST_ASSERT_EQUAL(FeedStatus::NoFlow, r.status);
  TEST_ASSERT_FLOAT_WITHIN(0.01, 20, r.servedG);
}

void test_fill_to_and_bowl_limit() {
  FakeIO io;
  FeedRequest q = req(80);
  q.mode = FeedMode::FillTo;
  q.currentFoodG = 60;
  TEST_ASSERT_FLOAT_WITHIN(0.01, 20, effectiveTarget(q));
  q.currentFoodG = 79;
  TEST_ASSERT_EQUAL(FeedStatus::SkippedFull, runFeed(q, io).status);
  q = req(100);
  q.currentFoodG = 250;  // limite de 300 g
  TEST_ASSERT_FLOAT_WITHIN(0.01, 50, effectiveTarget(q));
}

void test_cancel() {
  FakeIO io;
  io.cancelAfterPulses = 2;
  FeedResult r = runFeed(req(100), io);
  TEST_ASSERT_EQUAL(FeedStatus::Canceled, r.status);
  TEST_ASSERT_TRUE(r.servedG < 100);
}

void test_scale_failure_mid_feed() {
  struct BreakingIO : FakeIO {
    int reads = 0;
    ScaleReading readStable() override {
      t += 1000;
      return {++reads < 3, true, bowl};
    }
  } io;
  FeedResult r = runFeed(req(100), io);
  TEST_ASSERT_EQUAL(FeedStatus::ScaleError, r.status);
}

void test_pet_eating_sets_interference() {
  FakeIO io;
  io.bowl = 40;
  io.petEatsAtPulse = 2;
  FeedResult r = runFeed(req(50), io);
  TEST_ASSERT_TRUE(r.interference);
  TEST_ASSERT_EQUAL(FeedStatus::Ok, r.status);  // não trava: segue somando só os ganhos
}

void test_timeout() {
  // Cada giro derruba só 0,6 g (nunca "sem ganho"), então a meta não chega antes do limite de tempo.
  struct SlowIO : FakeIO {
    void rotor(RotorDir dir, bool slow, uint16_t ms) override {
      FakeIO::rotor(dir, slow, ms);
      if (dir == RotorDir::Forward && ms != LOOSEN_MS) bowl += 0.6;
    }
  } io;
  io.flow = 0;
  FeedResult r = runFeed(req(200), io);
  TEST_ASSERT_EQUAL(FeedStatus::Timeout, r.status);
  TEST_ASSERT_TRUE(r.durationMs <= FEED_MAX_MS + 5000);
}

void test_pulse_clamp() {
  TEST_ASSERT_EQUAL(PULSE_MIN_MS, pulseMs(0.1, 0.01));
  TEST_ASSERT_EQUAL(PULSE_MAX_MS, pulseMs(500, 0.01));
  TEST_ASSERT_EQUAL(600, pulseMs(10, 0.01));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_doses_within_tolerance);
  RUN_TEST(test_learns_flow);
  RUN_TEST(test_precheck_failures);
  RUN_TEST(test_empty_hopper_gives_no_flow);
  RUN_TEST(test_jam_is_cleared_by_reversing);
  RUN_TEST(test_permanent_jam);
  RUN_TEST(test_partial_when_hopper_runs_out);
  RUN_TEST(test_fill_to_and_bowl_limit);
  RUN_TEST(test_cancel);
  RUN_TEST(test_scale_failure_mid_feed);
  RUN_TEST(test_pet_eating_sets_interference);
  RUN_TEST(test_timeout);
  RUN_TEST(test_pulse_clamp);
  return UNITY_END();
}
