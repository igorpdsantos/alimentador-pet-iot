#include "storage.h"
#include <Preferences.h>
#include <string.h>

namespace storage {
namespace {
Preferences prefs;
constexpr uint8_t LAYOUT = 1;  // mudou algum struct salvo → incremente (volta aos padrões)

template <typename T>
bool loadBlob(const char* key, T& out) {
  return prefs.getBytesLength(key) == sizeof(T) && prefs.getBytes(key, &out, sizeof(T)) == sizeof(T);
}
}  // namespace

void begin() {
  prefs.begin("petfeeder", false);
  if (prefs.getUChar("layout", 0) != LAYOUT) {
    prefs.clear();
    prefs.putUChar("layout", LAYOUT);
  }
}

void load(Settings& s, Calibration& c, Schedule& sch, Hopper& h, uint32_t& seq, uint32_t& feedId) {
  if (!loadBlob("settings", s)) defaultSettings(s);
  if (!loadBlob("calib", c)) defaultCalibration(c);
  if (!loadBlob("schedule", sch)) memset(&sch, 0, sizeof(sch));
  if (!loadBlob("hopper", h)) hopperInit(h);
  seq = prefs.getUInt("seq", 0);
  feedId = prefs.getUInt("feed_id", 0);
}

void saveSettings(const Settings& s) { prefs.putBytes("settings", &s, sizeof(s)); }
void saveCalibration(const Calibration& c) { prefs.putBytes("calib", &c, sizeof(c)); }
void saveSchedule(const Schedule& s) { prefs.putBytes("schedule", &s, sizeof(s)); }
void saveHopper(const Hopper& h) { prefs.putBytes("hopper", &h, sizeof(h)); }

void saveCounters(uint32_t seq, uint32_t feedId) {
  prefs.putUInt("seq", seq);
  prefs.putUInt("feed_id", feedId);
}
}  // namespace storage
