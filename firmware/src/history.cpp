#include "history.h"
#include <Arduino.h>
#include <LittleFS.h>
#include "config.h"
#include "history_ring.h"

namespace history {
namespace {

// Arquivo de tamanho fixo com um registro por slot.
class FileStore : public RecordStore {
 public:
  FileStore(const char* path, size_t recSize, uint32_t slots) : path_(path), recSize_(recSize), slots_(slots) {}

  void ensure() {
    File f = LittleFS.open(path_, "r");
    size_t want = recSize_ * slots_;
    bool ok = f && f.size() == want;
    if (f) f.close();
    if (ok) return;
    Serial.printf("[hist] criando %s (%u bytes)\n", path_, (unsigned)want);
    f = LittleFS.open(path_, "w");
    uint8_t zero[64] = {0};
    for (size_t left = want; left;) {
      size_t n = left < sizeof(zero) ? left : sizeof(zero);
      f.write(zero, n);
      left -= n;
    }
    f.close();
  }

  bool read(uint32_t slot, void* buf, size_t len) override {
    File f = LittleFS.open(path_, "r");
    if (!f || !f.seek(slot * recSize_)) return false;
    bool ok = f.read((uint8_t*)buf, len) == len;
    f.close();
    return ok;
  }

  bool write(uint32_t slot, const void* buf, size_t len) override {
    File f = LittleFS.open(path_, "r+");
    if (!f || !f.seek(slot * recSize_)) return false;
    bool ok = f.write((const uint8_t*)buf, len) == len;
    f.close();
    return ok;
  }

 private:
  const char* path_;
  size_t recSize_;
  uint32_t slots_;
};

FileStore feedStore("/feeds.bin", sizeof(FeedRecord), HISTORY_FEEDS);
FileStore consStore("/consumption.bin", sizeof(ConsumptionRecord), HISTORY_CONSUMPTION);
HistoryRing<FeedRecord> feeds(feedStore, HISTORY_FEEDS);
HistoryRing<ConsumptionRecord> cons(consStore, HISTORY_CONSUMPTION);
SemaphoreHandle_t mutex;

struct Lock {
  Lock() { xSemaphoreTake(mutex, portMAX_DELAY); }
  ~Lock() { xSemaphoreGive(mutex); }
};

template <typename T, typename Fill>
void queryRing(HistoryRing<T>& ring, uint32_t since, uint8_t limit, JsonDocument& data, Fill fill) {
  static T buf[HISTORY_MAX_LIMIT];
  bool more;
  size_t n = ring.query(since, buf, limit, more);
  JsonArray items = data["items"].to<JsonArray>();
  uint32_t next = since;
  for (size_t i = 0; i < n; i++) {
    fill(items.add<JsonObject>(), buf[i]);
    if (measureJson(data) > MQTT_MAX_PAYLOAD) {  // não cabe numa mensagem: o resto vai na próxima página
      items.remove(items.size() - 1);
      more = true;
      break;
    }
    next = buf[i].seq;
  }
  data["next_seq"] = next;
  data["has_more"] = more;
}
}  // namespace

bool begin() {
  mutex = xSemaphoreCreateMutex();
  if (!LittleFS.begin(true)) {
    Serial.println("[hist] falha ao montar LittleFS");
    return false;
  }
  feedStore.ensure();
  consStore.ensure();
  feeds.recover();
  cons.recover();
  Serial.printf("[hist] refeições até seq %u, consumo até seq %u\n", feeds.maxSeq(), cons.maxSeq());
  return true;
}

uint32_t maxSeq() { return feeds.maxSeq() > cons.maxSeq() ? feeds.maxSeq() : cons.maxSeq(); }

void appendFeed(const FeedRecord& r) {
  Lock l;
  feeds.append(r);
}

void appendConsumption(const ConsumptionRecord& r) {
  Lock l;
  cons.append(r);
}

void query(uint32_t since, uint8_t limit, bool consumption, JsonDocument& data) {
  Lock l;
  if (consumption) queryRing(cons, since, limit, data, fillConsumption);
  else queryRing(feeds, since, limit, data, fillFeedRecord);
}
}  // namespace history
