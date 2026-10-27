// Códigos de alerta do contrato (specs/05-protocolo-mqtt.md §6) como bits, para saber o que mudou.
#pragma once
#include <stdint.h>

enum Alert : uint16_t {
  ALERT_LOW_BATTERY = 1 << 0,
  ALERT_ON_BATTERY = 1 << 1,
  ALERT_HOPPER_LOW = 1 << 2,
  ALERT_HOPPER_EMPTY = 1 << 3,
  ALERT_NO_TIME = 1 << 4,
  ALERT_NOT_CALIBRATED = 1 << 5,
  ALERT_SCALE_ERROR = 1 << 6,
  ALERT_OVERLOAD = 1 << 7,
  ALERT_NO_FLOW = 1 << 8,
};
constexpr int ALERT_COUNT = 9;

const char* alertCode(uint16_t bit);
const char* alertMessage(uint16_t bit);
