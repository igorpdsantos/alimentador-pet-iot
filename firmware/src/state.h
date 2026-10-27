// Estado compartilhado entre as tasks. Campos não atômicos só com `Lock` (mutex global).
#pragma once
#include <Arduino.h>
#include <atomic>
#include "protocol.h"
#include "schedule.h"
#include "hopper.h"
#include "battery_curve.h"

struct DeviceState {
  char deviceId[16];  // pf-xxxxxx
  Settings settings;
  Calibration cal;
  Schedule schedule;
  Hopper hopper;
  uint32_t seq;
  uint32_t feedId;
  // Leituras recentes
  BatteryState battery;
  bool onMains;
  bool scaleOk;
  bool bowlPresent;
  double platformG;
  double foodG;
  // Alertas que só a task de controle sabe (NO_FLOW, reservatório vazio)
  bool noFlow;
  bool hopperEmpty;
};

extern DeviceState g;
extern std::atomic<bool> gFeeding;
extern std::atomic<bool> gCancel;
extern std::atomic<bool> gStatusDirty;  // publicar status assim que possível
extern std::atomic<uint16_t> gAlerts;

struct Lock {
  Lock();
  ~Lock();
};

void stateBegin();
bool timeSynced();
uint32_t nowTs();
bool localNow(LocalTime& out);
void applyTimezone(const char* tz);
