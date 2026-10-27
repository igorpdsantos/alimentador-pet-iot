#include "state.h"
#include <time.h>
#include "config.h"

DeviceState g;
std::atomic<bool> gFeeding{false};
std::atomic<bool> gCancel{false};
std::atomic<bool> gStatusDirty{true};
std::atomic<uint16_t> gAlerts{0};

namespace {
SemaphoreHandle_t mutex;
}

Lock::Lock() { xSemaphoreTakeRecursive(mutex, portMAX_DELAY); }
Lock::~Lock() { xSemaphoreGiveRecursive(mutex); }

void stateBegin() { mutex = xSemaphoreCreateRecursiveMutex(); }

bool timeSynced() { return time(nullptr) > TIME_VALID_AFTER; }

uint32_t nowTs() { return (uint32_t)time(nullptr); }

bool localNow(LocalTime& out) {
  if (!timeSynced()) return false;
  time_t t = time(nullptr);
  struct tm tm;
  localtime_r(&t, &tm);
  out = {tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday, tm.tm_wday, tm.tm_hour, tm.tm_min};
  return true;
}

void applyTimezone(const char* tz) {
  setenv("TZ", tz, 1);
  tzset();
}
