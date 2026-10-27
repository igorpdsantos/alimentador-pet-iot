// Configuração persistente em NVS (Preferences).
#pragma once
#include "protocol.h"
#include "schedule.h"
#include "hopper.h"

namespace storage {
void begin();
void load(Settings& s, Calibration& c, Schedule& sch, Hopper& h, uint32_t& seq, uint32_t& feedId);
void saveSettings(const Settings& s);
void saveCalibration(const Calibration& c);
void saveSchedule(const Schedule& s);
void saveHopper(const Hopper& h);
void saveCounters(uint32_t seq, uint32_t feedId);
}  // namespace storage
