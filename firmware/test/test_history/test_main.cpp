#include <unity.h>
#include <string.h>
#include <vector>
#include "history_ring.h"
#include "protocol.h"
#include "req_cache.h"

void setUp() {}
void tearDown() {}

struct RamStore : RecordStore {
  std::vector<uint8_t> data;
  size_t recSize;
  RamStore(size_t slots, size_t size) : data(slots * size, 0), recSize(size) {}
  bool read(uint32_t slot, void* buf, size_t len) override {
    memcpy(buf, &data[slot * recSize], len);
    return true;
  }
  bool write(uint32_t slot, const void* buf, size_t len) override {
    memcpy(&data[slot * recSize], buf, len);
    return true;
  }
};

static ConsumptionRecord rec(uint32_t seq) { return {seq, 1000 + seq, (float)seq}; }

void test_query_pages_in_order() {
  RamStore store(5, sizeof(ConsumptionRecord));
  HistoryRing<ConsumptionRecord> ring(store, 5);
  ring.recover();
  for (uint32_t s = 1; s <= 3; s++) ring.append(rec(s));
  ConsumptionRecord out[5];
  bool more;
  size_t n = ring.query(0, out, 2, more);
  TEST_ASSERT_EQUAL(2, n);
  TEST_ASSERT_TRUE(more);
  TEST_ASSERT_EQUAL(1, out[0].seq);
  n = ring.query(out[1].seq, out, 2, more);
  TEST_ASSERT_EQUAL(1, n);
  TEST_ASSERT_FALSE(more);
  TEST_ASSERT_EQUAL(3, out[0].seq);
}

void test_wraps_and_recovers() {
  RamStore store(4, sizeof(ConsumptionRecord));
  HistoryRing<ConsumptionRecord> ring(store, 4);
  ring.recover();
  for (uint32_t s = 1; s <= 10; s += 1) ring.append(rec(s * 2));  // seq com saltos (feeds intercalados)
  // depois do boot
  HistoryRing<ConsumptionRecord> again(store, 4);
  again.recover();
  TEST_ASSERT_EQUAL(20, again.maxSeq());
  ConsumptionRecord out[4];
  bool more;
  size_t n = again.query(0, out, 4, more);
  TEST_ASSERT_EQUAL(4, n);
  TEST_ASSERT_EQUAL(14, out[0].seq);  // os 4 mais novos, do mais antigo ao mais novo
  TEST_ASSERT_EQUAL(20, out[3].seq);
  again.append(rec(22));
  n = again.query(18, out, 4, more);
  TEST_ASSERT_EQUAL(2, n);
  TEST_ASSERT_EQUAL(20, out[0].seq);
  TEST_ASSERT_EQUAL(22, out[1].seq);
}

void test_req_cache() {
  ReqCache c;
  std::string resp;
  TEST_ASSERT_EQUAL(ReqCache::Lookup::New, c.check("a", resp));
  TEST_ASSERT_EQUAL(ReqCache::Lookup::Pending, c.check("a", resp));
  c.complete("a", "{\"ok\":true}");
  TEST_ASSERT_EQUAL(ReqCache::Lookup::Done, c.check("a", resp));
  TEST_ASSERT_EQUAL_STRING("{\"ok\":true}", resp.c_str());
  // 16 novos pedidos expulsam o mais antigo
  for (int i = 0; i < REQ_CACHE_SIZE; i++) c.check(std::to_string(i).c_str(), resp);
  TEST_ASSERT_EQUAL(ReqCache::Lookup::New, c.check("a", resp));
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_query_pages_in_order);
  RUN_TEST(test_wraps_and_recovers);
  RUN_TEST(test_req_cache);
  return UNITY_END();
}
