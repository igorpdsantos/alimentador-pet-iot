// Buffer circular de registros de tamanho fixo sobre um armazenamento abstrato
// (LittleFS no ESP32, memória nos testes). Ver specs/04-firmware.md §7.
#pragma once
#include <stdint.h>
#include <stddef.h>

struct RecordStore {
  virtual ~RecordStore() {}
  virtual bool read(uint32_t slot, void* buf, size_t len) = 0;
  virtual bool write(uint32_t slot, const void* buf, size_t len) = 0;
};

// T precisa ter o campo uint32_t seq (0 = slot vazio).
template <typename T>
class HistoryRing {
 public:
  HistoryRing(RecordStore& store, uint32_t capacity) : store_(store), capacity_(capacity) {}

  // Recupera a posição de escrita depois do boot (procura o maior seq gravado).
  void recover() {
    head_ = 0;
    uint32_t best = 0;
    T rec;
    for (uint32_t i = 0; i < capacity_; i++) {
      if (store_.read(i, &rec, sizeof(T)) && rec.seq > best) {
        best = rec.seq;
        head_ = (i + 1) % capacity_;
      }
    }
    maxSeq_ = best;
  }

  bool append(const T& rec) {
    if (!store_.write(head_, &rec, sizeof(T))) return false;
    head_ = (head_ + 1) % capacity_;
    if (rec.seq > maxSeq_) maxSeq_ = rec.seq;
    return true;
  }

  uint32_t maxSeq() const { return maxSeq_; }

  // Copia até `limit` registros com seq > sinceSeq, em ordem crescente de seq.
  // Devolve quantos copiou; hasMore indica que ficou algo para a próxima página.
  size_t query(uint32_t sinceSeq, T* out, size_t limit, bool& hasMore) {
    size_t n = 0;
    hasMore = false;
    T rec;
    // Do mais antigo (head) ao mais novo.
    for (uint32_t k = 0; k < capacity_; k++) {
      uint32_t slot = (head_ + k) % capacity_;
      if (!store_.read(slot, &rec, sizeof(T)) || rec.seq == 0 || rec.seq <= sinceSeq) continue;
      if (n == limit) { hasMore = true; break; }
      out[n++] = rec;
    }
    return n;
  }

 private:
  RecordStore& store_;
  uint32_t capacity_;
  uint32_t head_ = 0;
  uint32_t maxSeq_ = 0;
};
