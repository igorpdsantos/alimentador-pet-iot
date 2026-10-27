// Servo 360° do rotor dosador: só sentido e velocidade (specs/04-firmware.md §4.3).
#pragma once
#include <stdint.h>
#include "dispenser.h"

namespace rotor {
// Deixa o servo sem pulso (parado). Chamado antes de qualquer outra coisa no boot.
void begin(uint16_t neutralUs);
void setNeutral(uint16_t neutralUs);
// Gira por `ms` (bloqueia a task com vTaskDelay) e para.
void run(RotorDir dir, bool slow, uint16_t ms);
// Segura o neutro por `ms` (para conferir o trim: o rotor não pode andar).
void holdNeutral(uint16_t ms);
void stop();
uint32_t lastMoveMs();
}  // namespace rotor
