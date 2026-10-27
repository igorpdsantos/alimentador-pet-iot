# 05 — Protocolo MQTT (contrato app ↔ firmware)

**Este arquivo é o contrato.** Qualquer mudança aqui exige atualizar firmware (`protocol.cpp`),
app (`app/src/protocol/`) e simulador (`tools/simulador/`) no mesmo passo. Incrementar `proto` se
quebrar compatibilidade.

- Versão do protocolo: `proto: 1`
- Broker: HiveMQ Cloud. ESP32 em `mqtts://…:8883`; app em `wss://…:8884/mqtt`.
- Payload: JSON UTF-8. Tempo: `ts` em segundos Unix (UTC). Peso em gramas com 1 casa decimal.
- `{id}` = `device_id` (ex.: `pf-a1b2c3`).

## 1. Tópicos

| Tópico | Sentido | QoS | Retained | Conteúdo |
|---|---|---|---|---|
| `petfeeder/{id}/online` | disp → app | 1 | sim | `true` / `false` (LWT) |
| `petfeeder/{id}/status` | disp → app | 0 | sim | Snapshot (§3) |
| `petfeeder/{id}/config` | disp → app | 1 | sim | Agenda e configurações atuais (§4) |
| `petfeeder/{id}/cmd` | app → disp | 1 | **não** | Comandos (§2) |
| `petfeeder/{id}/resp` | disp → app | 1 | não | Resposta a cada comando |
| `petfeeder/{id}/event` | disp → app | 1 | não | Refeições, progresso, alertas (§5) |

O ESP32 publica com QoS 0 (a PubSubClient não publica com QoS 1); o app compensa sincronizando o histórico por `seq`
ao reconectar. O simulador e o app usam os QoS da tabela.

## 2. Comandos (`cmd`)

Envelope: `{"proto":1, "req_id":"<uuid curto>", "cmd":"<nome>", ...args}`

Resposta em `resp`: `{"req_id":"…", "ok":true, "data":{…}}` ou `{"req_id":"…", "ok":false, "error":"CODIGO", "msg":"texto"}`.
O firmware guarda os últimos 16 `req_id`; repetido → responde igual e **não executa de novo**.

| `cmd` | Args | Efeito / `data` |
|---|---|---|
| `ping` | — | `{fw, proto, uptime_s}` |
| `feed` | `grams` (5–200), `mode` (`add`\|`fill_to`, padrão `add`) | Inicia dosagem; resposta imediata `{feed_id}`; resultado vem em `event` |
| `cancel_feed` | — | Para o rotor e encerra com status `CANCELED` → `{was_feeding}` |
| `set_schedule` | `meals: [{id, time:"HH:MM", grams, days:[0-6], enabled, mode}]` (≤ 8) | Substitui a agenda; republica `config` |
| `set_settings` | qualquer subconjunto de §4 `settings` | Atualiza; republica `config` |
| `history` | `since_seq`, `limit` (≤ 50), `kind` (`feeds`\|`consumption`) | `{items:[…], next_seq, has_more}`; pode vir menos que `limit` se não couber numa mensagem (aí `has_more = true`) |
| `tare_platform` | — | Calibração passo 1 (plataforma vazia) |
| `calibrate` | `known_g` | Passo 2 (peso conhecido na plataforma) → `{scale_factor}` |
| `tare_bowl` | — | Passo 3 (vasilha vazia) → `{bowl_weight_g}` |
| `read_scale` | — | `{raw, grams, stable}` |
| `rotor_test` | `dir` (`fwd`\|`rev`), `ms` (≤ 2000) | Gira o rotor (teste/limpeza) |
| `servo_trim` | `neutral_us` (1400–1600) | Ajusta o "parado" do servo 360° |
| `unjam` | — | Executa a sequência recua/avança |
| `calibrate_battery` | `measured_v` (multímetro) | Ajusta fator do divisor |
| `refill` | `full` (bool) ou `grams` | Registra reabastecimento → `{remaining_g, capacity_g}` |
| `empty_hopper` | — | Gira até `NO_FLOW` (limpeza/troca de ração) |
| `reboot` | — | Reinicia |

## 3. `status` (retained)

```json
{
  "proto": 1, "ts": 1760360400, "fw": "0.1.0",
  "power": {"source": "mains"},
  "battery": {"pct": 78, "v": 8.62, "level": "ok", "installed": true},
  "bowl": {"present": true, "food_g": 42.5},
  "hopper": {"remaining_g": 610, "pct": 76, "capacity_g": 800, "capacity_learned": false, "days_left": 10},
  "feeding": false,
  "next_meal": {"id": 2, "time": "18:00", "grams": 50},
  "wifi_rssi": -61,
  "time_synced": true,
  "alerts": ["LOW_BATTERY"]
}
```

`next_meal` e `hopper.days_left` podem ser `null` (sem refeição ativa / sem média de consumo ainda).
`battery.level`: `ok` | `low` (≤ 20 %) | `critical` (≤ 5 %). Publicado ao conectar, a cada mudança relevante
(Δbateria ≥ 1 %, Δração ≥ 2 g, início/fim de refeição) e no máximo a cada 60 s.

## 4. `config` (retained)

```json
{
  "proto": 1,
  "meals": [{"id": 1, "time": "07:30", "grams": 40, "days": [0,1,2,3,4,5,6], "enabled": true, "mode": "add"}],
  "settings": {
    "pet_name": "Thor",
    "button_grams": 20,
    "max_bowl_g": 300,
    "battery_chemistry": "alkaline",
    "timezone": "<-03>3"
  },
  "calibration": {"scale_factor": 412.3, "bowl_weight_g": 180.0, "servo_neutral_us": 1500, "flow_g_per_ms": 0.010}
}
```

## 5. Eventos (`event`)

Envelope: `{"proto":1, "seq": 123, "ts": …, "type": "<tipo>", ...}` — `seq` é o mesmo do histórico
(reservado no início da refeição: `feed_started`, `feed_progress` e `feed_result` têm o mesmo). `alert` não vai
para o histórico e usa `seq: 0`.

| `type` | Campos |
|---|---|
| `feed_started` | `feed_id`, `source` (`schedule`\|`app`\|`button`), `meal_id?`, `target_g` |
| `feed_progress` | `feed_id`, `served_g` (no máximo 1 por segundo) |
| `feed_result` | `feed_id`, `source`, `meal_id?`, `target_g`, `served_g`, `duration_ms`, `pulses`, `unjam_tries`, `status`, `unstable`, `interference`, `battery_pct` |
| `alert` | `code`, `msg` |
| `consumption` | `food_g` (amostra a cada 15 min; também vem no `history kind=consumption`) |

`feed_result.status`: `OK` | `PARTIAL` (servido < meta − tolerância) | `NO_FLOW` | `BOWL_MISSING` |
`LOW_BATTERY` | `SCALE_ERROR` | `CANCELED` | `SKIPPED_FULL` | `TIMEOUT`.

## 6. Códigos de erro / alerta

| Código | Significado | Ação sugerida no app |
|---|---|---|
| `BUSY` | Já há dosagem em andamento | Aguardar |
| `INVALID_ARGS` | Validação falhou | Corrigir formulário |
| `BOWL_MISSING` | Vasilha fora da plataforma | "Coloque a vasilha" |
| `NO_FLOW` | Sem ganho de peso após 4 tentativas de destravar | "Reservatório vazio ou travado — confira a ração" |
| `LOW_BATTERY` | Bateria ≤ 20 % (alerta) / ≤ 5 % (bloqueia) | "Troque as pilhas" |
| `SCALE_ERROR` | HX711 não responde / leitura absurda | "Verifique a balança" |
| `NOT_CALIBRATED` | Balança sem calibração | Abrir assistente de calibração |
| `NO_TIME` | Hora não sincronizada | Verificar internet |
| `HOPPER_LOW` | Reservatório ≤ 20 % (estimado) | "Ração acabando — ~N dias" |
| `HOPPER_EMPTY` | Reservatório vazio | "Reabasteça o alimentador" |
| `ON_BATTERY` | Faltou energia, rodando nas pilhas | "Sem energia na tomada — usando pilhas" |
| `MAINS_RESTORED` | Energia voltou | — |
| `OVERLOAD` | Leitura > 4500 g | "Algo pesado na plataforma" |
