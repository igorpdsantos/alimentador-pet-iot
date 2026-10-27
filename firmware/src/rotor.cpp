#include "rotor.h"
#include <Arduino.h>
#include <ESP32Servo.h>
#include "config.h"

namespace rotor {
namespace {
Servo servo;
uint16_t neutral = 1500;
volatile uint32_t lastMove = 0;
}  // namespace

void begin(uint16_t neutralUs) {
  // Sem pulso PWM o servo contínuo fica parado: garante o rotor parado já no boot.
  pinMode(PIN_SERVO, OUTPUT);
  digitalWrite(PIN_SERVO, LOW);
  neutral = neutralUs;
  ESP32PWM::allocateTimer(0);
  servo.setPeriodHertz(50);
}

void setNeutral(uint16_t neutralUs) { neutral = neutralUs; }

void stop() {
  if (servo.attached()) {
    servo.writeMicroseconds(neutral);
    delay(20);
    servo.detach();  // sem PWM: zero consumo e zero zumbido
  }
  digitalWrite(PIN_SERVO, LOW);
  lastMove = millis();
}

void run(RotorDir dir, bool slow, uint16_t ms) {
  if (ms > 2000) ms = 2000;  // giro contínuo ≤ 2 s
  int delta = slow ? SERVO_SLOW_DELTA_US : SERVO_FAST_DELTA_US;
  int us = neutral + (int)dir * ROTOR_FWD_SIGN * delta;
  if (!servo.attached()) servo.attach(PIN_SERVO, SERVO_MIN_US, SERVO_MAX_US);
  servo.writeMicroseconds(us);
  Serial.printf("[rotor] %s%s %u ms\n", dir == RotorDir::Forward ? "avança" : "recua", slow ? " lento" : "", ms);
  vTaskDelay(pdMS_TO_TICKS(ms));
  stop();
}

void holdNeutral(uint16_t ms) {
  if (!servo.attached()) servo.attach(PIN_SERVO, SERVO_MIN_US, SERVO_MAX_US);
  servo.writeMicroseconds(neutral);
  vTaskDelay(pdMS_TO_TICKS(ms));
  stop();
}

uint32_t lastMoveMs() { return lastMove; }
}  // namespace rotor
