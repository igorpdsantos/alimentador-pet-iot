// Task de controle: única dona do rotor e da balança. Executa uma dosagem por vez,
// cumpre a agenda e faz as leituras periódicas da vasilha (specs/04-firmware.md §3).
#pragma once
#include "protocol.h"

namespace control {
void begin();
void task(void*);
// Comando do app que mexe no hardware (feed, calibração, rotor…). false = fila cheia.
bool submit(const Command& c);
// Gatilhos locais (botão do pedestal).
void buttonFeed();
void buttonRefill();
}  // namespace control
