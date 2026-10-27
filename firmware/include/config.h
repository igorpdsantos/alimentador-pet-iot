// Pinos, constantes e limites do hardware. Espelha specs/02-hardware.md §2 — mudou aqui, mude lá.
#pragma once

#define FW_VERSION "0.1.0"

// ---- Pinos (ESP32 DOIT DevKit V1) ----
#define PIN_SERVO 18        // servo 360° do rotor (PWM 50 Hz)
#define PIN_HX711_DOUT 16
#define PIN_HX711_SCK 4
#define PIN_BATTERY 34      // divisor 100k/27k, ADC1
#define PIN_MAINS 35        // divisor 100k/22k da fonte 12 V, ADC1
#define PIN_BUTTON 23       // "alimentar agora", INPUT_PULLUP para GND
#define PIN_LED 22          // via 220 Ω
#define PIN_BOOT 0          // 10 s pressionado: apaga Wi-Fi e abre o portal

// ---- Servo 360° ----
#define SERVO_MIN_US 1000
#define SERVO_MAX_US 2000
#define SERVO_FAST_DELTA_US 200   // avança/recua = neutro ± 200 µs
#define SERVO_SLOW_DELTA_US 100   // lento perto da meta
#define ROTOR_FWD_SIGN 1          // -1 se o servo foi montado invertido

// ---- Balança ----
#define SCALE_SAMPLES 10            // 10 leituras a 10 Hz
#define SCALE_STABLE_STDDEV_G 0.5
#define SCALE_ATTEMPTS 3
#define SCALE_OVERLOAD_G 4500
#define SCALE_TIMEOUT_MS 300        // sem DOUT pronto nesse tempo = HX711 sem resposta
#define BOWL_MIN_G 20               // abaixo disso, "vasilha ausente" se a vasilha não foi tarada

// ---- Energia ----
#define MAINS_PRESENT_MV 1500       // > 1,5 V no GPIO35 = na tomada
#define BATTERY_ADC_SAMPLES 16
#define BATTERY_BLOCK_PCT 15        // nas pilhas: não serve abaixo disso (step-down pode não segurar 5 V)
#define BATTERY_QUIET_MS 2000       // não medir logo depois de mover o servo

// ---- Tempos ----
#define SCHEDULE_CHECK_MS 20000
#define BOWL_READ_MS 60000
#define CONSUMPTION_PERIOD_S 900    // amostra de consumo a cada 15 min
#define STATUS_MAX_INTERVAL_MS 60000
#define STATUS_BATTERY_INTERVAL_MS 300000  // nas pilhas, no máximo a cada 5 min
#define PROGRESS_INTERVAL_MS 1000
#define BUTTON_REFILL_HOLD_MS 3000
#define BOOT_RESET_HOLD_MS 10000
#define EMPTY_HOPPER_MAX_MS 300000
#define EXERCISE_HOUR 3             // "exercício" diário do rotor às 03:30
#define EXERCISE_MINUTE 30

// ---- Rede ----
#define NTP_SERVER_1 "a.st1.ntp.br"
#define NTP_SERVER_2 "pool.ntp.org"
#define MQTT_BUFFER_SIZE 8192
#define MQTT_MAX_PAYLOAD 7000       // margem para o tópico e o cabeçalho
#define MQTT_BACKOFF_MAX_MS 60000
#define PORTAL_TIMEOUT_S 180
#define TIME_VALID_AFTER 1700000000 // epoch: antes disso, NTP ainda não sincronizou

// ---- Histórico ----
#define HISTORY_FEEDS 200
#define HISTORY_CONSUMPTION 672     // 7 dias × 96 amostras
