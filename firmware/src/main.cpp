// Alimentador de Pet IoT — firmware do ESP32. Arquitetura em specs/04-firmware.md.
#include <Arduino.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "control.h"
#include "history.h"
#include "monitor.h"
#include "net.h"
#include "power.h"
#include "rotor.h"
#include "scale.h"
#include "state.h"
#include "storage.h"
#include "ui.h"

void setup() {
  // Primeiro de tudo: rotor parado (segurança do pet; specs/04-firmware.md §4, RNF05)
  rotor::begin(1500);
  Serial.begin(115200);
  Serial.printf("\n[main] Alimentador de Pet IoT %s\n", FW_VERSION);

  stateBegin();
  storage::begin();
  storage::load(g.settings, g.cal, g.schedule, g.hopper, g.seq, g.feedId);
  rotor::setNeutral(g.cal.servoNeutralUs);
  applyTimezone(g.settings.timezone);
  ui::begin();
  power::begin();
  scale::begin();
  g.scaleOk = scale::ready();
  g.onMains = power::onMains();
  if (history::begin() && history::maxSeq() > g.seq) g.seq = history::maxSeq();  // NVS atrasado
  net::begin();
  control::begin();

  xTaskCreatePinnedToCore(net::task, "net", 12288, nullptr, 1, nullptr, 0);
  xTaskCreatePinnedToCore(control::task, "control", 8192, nullptr, 2, nullptr, 1);
  xTaskCreatePinnedToCore(monitor::task, "monitor", 6144, nullptr, 1, nullptr, 1);
  xTaskCreatePinnedToCore(ui::task, "ui", 3072, nullptr, 1, nullptr, 1);
}

void loop() { vTaskDelete(nullptr); }  // tudo roda nas tasks
