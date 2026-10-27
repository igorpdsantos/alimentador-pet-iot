#include "ui.h"
#include <Arduino.h>
#include "config.h"
#include "control.h"
#include "monitor.h"
#include "net.h"

namespace ui {

void begin() {
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BOOT, INPUT_PULLUP);
}

void task(void*) {
  uint32_t buttonDown = 0, bootDown = 0;
  bool refillSent = false;
  for (;;) {
    uint32_t ms = millis();

    // LED: aceso = ok; lento = sem Wi-Fi; rápido = erro
    bool on;
    if (monitor::hasError()) on = (ms / 125) % 2;
    else if (!net::wifiConnected()) on = (ms / 500) % 2;
    else on = true;
    digitalWrite(PIN_LED, on);

    // Botão do pedestal: clique = porção padrão; segurar 3 s = reabasteci (cheio)
    bool pressed = digitalRead(PIN_BUTTON) == LOW;
    if (pressed && !buttonDown) {
      buttonDown = ms;
      refillSent = false;
    } else if (pressed && !refillSent && ms - buttonDown > BUTTON_REFILL_HOLD_MS) {
      refillSent = true;
      Serial.println("[ui] reabasteci (botão segurado)");
      control::buttonRefill();
    } else if (!pressed && buttonDown) {
      if (!refillSent && ms - buttonDown > 50) {
        Serial.println("[ui] alimentar agora (botão)");
        control::buttonFeed();
      }
      buttonDown = 0;
    }

    // BOOT 10 s: apaga o Wi-Fi e abre o portal
    if (digitalRead(PIN_BOOT) == LOW) {
      if (!bootDown) bootDown = ms;
      else if (ms - bootDown > BOOT_RESET_HOLD_MS) net::requestPortal();
    } else {
      bootDown = 0;
    }
    vTaskDelay(pdMS_TO_TICKS(50));
  }
}
}  // namespace ui
