// Dosagem por peso em malha fechada com o rotor + servo 360° (specs/04-firmware.md §4).
// Não fala com hardware: tudo passa por DispenserIO, que no ESP32 bloqueia a task de controle
// e nos testes simula tempo e balança.
#pragma once
#include <stdint.h>
#include "types.h"

constexpr double POCKET_G = 11.0;            // ~1 bolso do rotor
constexpr double NO_GAIN_G = 0.5;            // ganho menor que isso = "sem ganho"
constexpr double INTERFERENCE_DROP_G = 5.0;  // queda maior = pet comendo
constexpr double STOP_FRACTION = 0.4;        // para quando falta ≤ 40 % da tolerância
constexpr double MIN_SERVE_G = 3.0;          // fill_to com menos que isso = SKIPPED_FULL
constexpr uint16_t PULSE_MIN_MS = 120;
constexpr uint16_t PULSE_MAX_MS = 1500;
constexpr uint16_t SETTLE_MS = 500;
constexpr uint16_t LOOSEN_MS = 250;
constexpr uint16_t UNJAM_REVERSE_MS = 600;
constexpr uint16_t RELIEF_MS = 150;
constexpr uint8_t NO_GAIN_PULSES = 2;
constexpr uint8_t MAX_UNJAM_TRIES = 4;
constexpr uint32_t FEED_MAX_MS = 90000;
constexpr double FLOW_ALPHA = 0.3;
constexpr double FLOW_MIN = 0.001, FLOW_MAX = 0.2;  // g/ms

enum class RotorDir : int8_t { Reverse = -1, Forward = 1 };

struct ScaleReading {
  bool ok;       // HX711 respondeu e o valor é plausível
  bool stable;   // desvio-padrão < 0,5 g
  double grams;  // ração na vasilha (já descontada a tara da vasilha)
};

struct DispenserIO {
  virtual ~DispenserIO() {}
  virtual uint32_t nowMs() = 0;
  // Gira o rotor por `ms` e para (bloqueante).
  virtual void rotor(RotorDir dir, bool slow, uint16_t ms) = 0;
  virtual void waitMs(uint16_t ms) = 0;
  virtual ScaleReading readStable() = 0;
  virtual bool cancelRequested() = 0;
  virtual void progress(double servedG) = 0;
};

struct FeedRequest {
  double grams;
  FeedMode mode;
  // Pré-checagens (feitas por quem chama, que tem acesso a bateria/balança).
  bool powerOk;
  bool scaleOk;
  bool bowlPresent;
  double currentFoodG;   // ração já na vasilha (para fill_to e limite da vasilha)
  double maxBowlG;       // 0 = sem limite
  double flowGPerMs;     // vazão aprendida
  uint32_t maxDurationMs;  // 0 = FEED_MAX_MS
  bool requireBowl;        // false em empty_hopper
};

struct FeedResult {
  FeedStatus status;
  double targetG;
  double servedG;
  uint32_t durationMs;
  uint16_t pulses;
  uint8_t unjamTries;
  bool unstable;
  bool interference;
  double flowGPerMs;  // vazão atualizada (salvar em NVS)
};

double feedTolerance(double target);
uint16_t pulseMs(double missingG, double flowGPerMs);
// Meta efetiva depois de aplicar o modo e o limite da vasilha.
double effectiveTarget(const FeedRequest& req);
FeedResult runFeed(const FeedRequest& req, DispenserIO& io);
