# 04 — Firmware (ESP32)

## 1. Stack

| Item | Escolha |
|---|---|
| Build | PlatformIO, `platform = espressif32`, `board = esp32doit-devkit-v1`, `framework = arduino` |
| Servo | `madhephaestus/ESP32Servo` (`writeMicroseconds` para o servo 360°) |
| Balança | `bogde/HX711` |
| JSON | `bblanchon/ArduinoJson` v7 |
| MQTT | `knolleary/PubSubClient` sobre `WiFiClientSecure` (TLS, porta 8883); buffer 8192 B (páginas do histórico). Publica sempre com QoS 0 (limite da biblioteca); assina `cmd` com QoS 1 |
| Wi-Fi | `tzapu/WiFiManager` (portal cativo "Alimentador-XXXXXX", **com senha** `PORTAL_PASS`, D21) |
| Hora | `configTzTime("<-03>3", "a.st1.ntp.br", "pool.ntp.org")` |
| Persistência | `Preferences` (NVS) para config/calibração; `LittleFS` para histórico |

## 2. Estrutura de pastas

```
firmware/
  platformio.ini          envs esp32 (placa) e native (testes no PC)
  include/
    config.h              ← pinos, constantes, limites (espelha 02-hardware §2)
    ca_cert.h             ← ISRG Root X1 (HiveMQ Cloud), válido até 2035
    secrets.example.h     ← modelo; secrets.h fica no .gitignore
  lib/core/src/           ← LÓGICA PURA, sem Arduino: compila no ESP32 e no PC
    dispenser.{h,cpp}     ← máquina de estados da dosagem (§4)
    battery_curve.{h,cpp} ← tensão → %, nível, calibração (§5)
    schedule.{h,cpp}      ← agenda e disparo (§6)
    hopper.{h,cpp}        ← nível estimado do reservatório (§4.6)
    history_ring.h        ← buffer circular sobre armazenamento abstrato (§7)
    protocol.{h,cpp}      ← parse/validação de comandos e montagem de mensagens (05-protocolo)
    req_cache.{h,cpp}     ← idempotência por req_id
    alerts, stats, types
  src/                    ← hardware e tasks
    main.cpp              ← rotor parado primeiro; carrega NVS; cria as tasks
    rotor, scale, power   ← servo 360°, HX711, ADC da bateria/fonte
    storage               ← NVS (Preferences)
    history               ← LittleFS (/feeds.bin, /consumption.bin)
    net                   ← Wi-Fi (portal não bloqueante), MQTT/TLS, OTA
    control, monitor, ui  ← tasks (§3)
    state                 ← estado compartilhado + mutex
  test/                   ← testes nativos (Unity) da lib/core, com tools/protocol-fixtures
```

**Lógica pura separada do hardware** (D20): tudo em `lib/core` recebe leituras e tempo por parâmetro ou interface
(`DispenserIO`, `RecordStore`) e é testado no PC com `pio test -e native`.

## 3. Tasks (FreeRTOS)

| Task | Prioridade | Função |
|---|---|---|
| `net` | 1 | Wi-Fi, MQTT, OTA; publica a fila de saída; valida comandos e responde os que não mexem no hardware (ping, agenda, ajustes, histórico, refill, cancel); os demais vão para a fila de `control` (`BUSY` se houver dosagem) |
| `control` | 2 | Única dona do rotor e da balança: comandos de hardware, agenda (a cada 20 s), peso da vasilha (60 s), amostra de consumo (15 min), exercício diário; uma dosagem por vez |
| `monitor` | 1 | A cada 1 s: fonte presente; a cada 60 s: bateria; calcula alertas (evento a cada alerta novo) e publica `status` quando muda |
| `ui` | 1 | LED de status, botão do pedestal (clique / 3 s) e BOOT 10 s |

Regras: nenhuma task bloqueia > 100 ms sem `vTaskDelay`; servo e HX711 só são acessados pela task `control`
(monitor pede leitura via fila/mutex); watchdog de task habilitado.

## 4. Dosagem por peso (malha fechada) — rotor + servo 360°

O rotor tem 6 bolsos (~23 mL ≈ 11 g cada). Girar o rotor leva bolsos até a saída; a balança diz quanto
caiu. O servo 360° só controla **sentido e velocidade** (sem posição) — o "sensor" do mecanismo é a balança.

### 4.1 Máquina de estados

```
IDLE → PRECHECK → DESTRAVA → BASELINE → GIRA → ASSENTA → PESA ─┬─► DONE
                                           ▲                      ├─► GIRA (falta ração)
                                           └──── RECUA ◄──────────┤ (sem ganho 2×)
                                                                  └─► ERROR
```

| Estado | Ação | Saída |
|---|---|---|
| PRECHECK | balança calibrada (senão `resp` `NOT_CALIBRATED`, sem refeição), energia ok (na tomada, ou pilhas > 15 %), HX711 pronto, vasilha presente, sem dosagem em andamento | falha → ERROR (`LOW_BATTERY`, `SCALE_ERROR`, `BOWL_MISSING`, `BUSY`) |
| DESTRAVA | recua 250 ms e avança 250 ms (solta grãos assentados) | — |
| BASELINE | peso estável `W0` (§4.4) | — |
| GIRA | servo avança por `t_giro` ms e para (1500 µs) | — |
| ASSENTA | espera 500 ms | — |
| PESA | `servido` = soma dos ganhos positivos; `falta = meta − servido` | `falta ≤ 0,4 × tolerância` → DONE (parar antes dava dose sempre abaixo da meta) |
| RECUA | **anti-travamento**: depois de 2 giros sem ganho, recua 600 ms e avança de novo; depois do 1º recuo, cada avanço sem ganho já é uma tentativa | 4 tentativas sem ganho → ERROR `NO_FLOW` (~24 s com o reservatório vazio) |
| DONE / ERROR | para o servo, recua 150 ms (alivia as pás), pesa final, grava histórico, publica evento | → IDLE |

### 4.2 Tempo de giro

- `vazao` (g/ms de giro) aprendida por média móvel (α = 0,3), salva em NVS; inicial 0,01 g/ms (ajustar em T-VAZ).
- `t_giro = clamp(falta × 0,6 / vazao, 120 ms, 1500 ms)`; perto da meta (falta < 1 bolso) usar
  velocidade baixa (ex.: 1600 µs) para cair grão a grão.
- `tolerancia = max(3 g, 5 % da meta)`. Limites: dosagem ≤ 90 s; giro contínuo ≤ 2 s.
- "Sem ganho": < 0,5 g depois de um giro.

### 4.3 Servo 360° e anti-travamento

- `SERVO_PARADO` (≈ 1500 µs) calibrável (`servo_trim`): servos contínuos "andam" devagar se o neutro
  estiver errado. `SERVO_AVANCA` e `SERVO_RECUA` = neutro ± 200 µs; lento = neutro + 100 µs.
- Desligar o PWM (`detach`) parado → zero consumo e zero "zumbido".
- Travamento sem encoder: detectado por **ausência de ganho de peso**. Sequência: recua 600 ms →
  avança; repete até 4×. O **chapéu** (mecânica §3.1) tira boa parte do peso de cima do rotor e o chanfro do escudo levanta o grão, então um grão
  prensado no escudo passa na maioria das vezes sem chegar a travar.
- `NO_FLOW` significa "reservatório vazio **ou** travado" (sem sensor de nível); a mensagem do app sugere
  olhar o reservatório.
- Periodicamente (1×/dia, sem refeição em andamento): "exercício" de 1 volta para frente e trás, para
  a ração não compactar parada.

### 4.4 Leitura estável

- 10 leituras a 10 Hz; estável se desvio-padrão < 0,5 g. Até 3 tentativas; senão, usa a mediana e marca
  `unstable = true` no registro (pet mexendo na vasilha).
- Se durante a dosagem o peso **cair** > 5 g entre medições → pet comendo: marca `interference = true`
  e continua (o servido é calculado pela soma dos ganhos positivos).

### 4.5 Modos

- `add` (padrão): serve `grams` a mais.
- `fill_to` (RF11): serve `max(0, grams − ração_atual)`; se já houver ração suficiente, status `SKIPPED_FULL`.
- Nos dois modos a meta é cortada para não passar de `max_bowl_g` na vasilha; meta < 3 g → `SKIPPED_FULL`.

## 4.6 Nível do reservatório (sem sensor extra)

- `restante_g = carga_g − Σ servido_g` desde o último `refill`. Cada `served_g` vem da balança (exato).
- `carga_g`: `refill` com `full=true` usa `capacidade_g`; com `grams` usa o valor informado (somado ao restante).
- `capacidade_g` é **aprendida**: quando uma refeição termina em `NO_FLOW` depois de um refill cheio,
  `capacidade_g = Σ servido desde o refill` (média móvel com a anterior). Valor inicial 800 g.
- `dias_restantes = restante_g / média diária servida (7 dias)`.
- Alertas: `HOPPER_LOW` (≤ 20 %), `HOPPER_EMPTY` (`NO_FLOW` com restante ≤ 15 % da capacidade).
- Botão do pedestal segurado 3 s = `refill full`. Persistir em NVS a cada refeição.

## 5. Energia e bateria

- Fonte presente: `analogReadMilliVolts(35)` > 1500 mV. Ao mudar de estado → evento `alert` `ON_BATTERY`
  (faltou energia) / `MAINS_RESTORED`; `status.power.source` = `mains` | `battery`.
- Em `battery`: publica status no máximo a cada 5 min, bloqueia dosagem se ≤ 5 %, continua cumprindo a agenda.

- `analogReadMilliVolts(34)`, atenuação 11 dB, 16 amostras, descarta mín/máx, média.
- `V_pack = mV / 1000 / 0,2126 × fator_calibracao`. Pack < 3 V → `battery.installed = false`.
- `%` pela tabela de 02-hardware §3.3, por célula (`V_pack / 6`); filtros de 02-hardware §3.3.
- Não medir nos 2 s após mover o servo.

## 6. Agenda

- Até 8 refeições `{id, time "HH:MM", grams, days[0..6], enabled, mode}` em NVS. Dias: 0 = domingo … 6 = sábado.
- Checa a cada 20 s: refeição dispara se `hora == time`, dia ativo e **não servida hoje** (marca `last_served_date` por id **antes** de servir: um reset no meio não serve de novo, T-RST).
- Sem hora válida (NTP nunca sincronizou desde o boot) → não dispara agenda e publica alerta `NO_TIME`.
- Refeição perdida (dispositivo desligado no horário) **não** é servida depois — evita refeição dupla.

## 7. Histórico

- LittleFS, arquivo em buffer circular de **200 refeições** + **672 amostras de consumo** (7 dias × 96/dia).
- Cada registro tem `seq` crescente (uint32, persistido). O app pede `history` com `since_seq`.
- Registro de refeição: ver 05-protocolo §5 `feed_result`.

## 8. Conectividade

- `device_id = "pf-" + 6 últimos hex do MAC` (ex.: `pf-a1b2c3`).
- Last Will: `status/online` = `false` (retained). Ao conectar: `true` (retained).
- Reconexão com backoff 1 s → 60 s. Dosagem e agenda **não dependem** de rede.
- Wi-Fi em modem sleep (`WiFi.setSleep(true)`).
- Botão (GPIO 23): clique → serve porção padrão (config `button_grams`, 20 g). BOOT 10 s → apaga Wi-Fi e abre portal.
- LED (GPIO 22): aceso = ok; piscando lento = sem Wi-Fi; piscando rápido = erro (`NO_FLOW`, bateria).
- **OTA** (`ArduinoOTA`, senha `OTA_PASS`): depois de montado, não é preciso abrir o tubo para regravar. Ao iniciar o OTA o rotor para e a dosagem é cancelada.

## 9. Configuração de credenciais

`include/secrets.h` (fora do git):

```cpp
#define MQTT_HOST "xxxxxxxx.s1.eu.hivemq.cloud"
#define MQTT_PORT 8883
#define MQTT_USER "..."
#define MQTT_PASS "..."
#define OTA_PASS  "..."
#define PORTAL_PASS "..."   // 8 a 63 caracteres; não compila fora disso. Vai na etiqueta do alimentador
```

Certificado raiz do broker (ISRG Root X1 para HiveMQ Cloud) em `include/ca_cert.h`.
