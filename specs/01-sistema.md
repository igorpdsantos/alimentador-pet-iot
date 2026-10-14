# 01 — Sistema

## 1. Objetivo

Alimentador automático para pets que **dosa ração por peso**, em horários programados ou sob
demanda pelo celular, e informa no app o que foi realmente servido e quanto resta de bateria.

Alinhado à apresentação:

| Objetivo da apresentação | Como o sistema atende |
|---|---|
| 01 Geral — dosar e dispensar de forma autônoma, agendada ou sob demanda | Agenda no ESP32 (funciona sem internet) + comando "alimentar agora" |
| 02 Automação do processo — porção correta em horários definidos | Dosagem em malha fechada pela balança (§4.2) |
| 03 Integração HW/SW — ESP32 com Wi-Fi respondendo ao celular | MQTT com TLS, app mobile |
| 04 Desenvolvimento mecânico — peças em FreeCAD/3D, escoamento sem entupimento | Funil + comporta + agitador impresso + base com balança |

Fluxo resumido (slide do app): **1. Programa** horários e gramas no celular → **2. Libera** até o peso
definido → **3. Informa** no app o que foi servido.

## 2. Escopo

**Dentro**
- Agenda de até 8 refeições/dia (horário + gramas + ativo/inativo).
- Alimentar agora com gramas escolhidas.
- Balança sob a vasilha: dose por peso, leitura da ração na vasilha, consumo ao longo do dia.
- Detecção de falhas: reservatório vazio/entupido, vasilha ausente, bateria crítica, balança sem resposta.
- Medidor de bateria em % e tensão, com alerta para trocar pilhas.
- App mobile com status, agenda, histórico, gráficos, calibração e configurações.

**Fora (por enquanto)**
- Notificação push com o app fechado (exige servidor; alternativa futura: ntfy.sh).
- Câmera, múltiplos pets, reconhecimento de pet.
- Sensor de nível do reservatório (estimado indiretamente: "sem fluxo" = vazio ou entupido).

## 3. Requisitos

### Funcionais

| ID | Requisito | Prioridade |
|----|-----------|-----------|
| RF01 | Usuário cadastra/edita/remove refeições (HH:MM, gramas 5–200, dias da semana, ativo) | P1 |
| RF02 | Usuário dispara "alimentar agora" com gramas escolhidas | P1 |
| RF03 | Firmware libera ração até atingir a meta medida pela balança, com tolerância de ±max(3 g, 5 %) | P1 |
| RF04 | Cada refeição gera um registro: meta, servido, duração, origem, status | P1 |
| RF05 | App mostra % de bateria, tensão e alerta de troca (≤ 20 %) e crítico (≤ 5 %) | P1 |
| RF06 | App mostra ração atual na vasilha (g) e se a vasilha está presente | P1 |
| RF07 | Detecta "sem fluxo" (vazio/travado), inverte o rotor para destravar, e reporta erro se persistir | P1 |
| RF08 | Agenda continua funcionando sem internet (guardada no ESP32, hora via NTP + RTC interno) | P1 |
| RF09 | Assistente de calibração da balança no app (tara, peso conhecido, tara da vasilha) | P1 |
| RF10 | Gráfico de consumo: ração na vasilha ao longo do dia e total comido por dia | P2 |
| RF11 | Modo "completar até X g" (serve só a diferença) além de "servir X g" | P2 |
| RF12 | Configuração de Wi-Fi sem reprogramar (portal cativo) | P1 |
| RF13 | Modo econômico de energia (deep sleep entre refeições) | P3 |
| RF14 | Nível do reservatório estimado automaticamente (gramas servidos pesados × carga aprendida), com alerta de ração acabando | P1 |

### Não funcionais

| ID | Requisito |
|----|-----------|
| RNF01 | Latência app → início da liberação < 3 s com dispositivo online |
| RNF02 | Nenhuma senha/credencial versionada (arquivos `secrets` no `.gitignore`) |
| RNF03 | Comunicação com o broker sempre com TLS |
| RNF04 | Comandos idempotentes por `req_id` (reenvio não dispara dose dupla) |
| RNF05 | Firmware nunca deixa a comporta aberta: toda abertura tem tempo máximo e o fechamento é garantido no boot |
| RNF06 | Textos do app em português do Brasil |

## 4. Arquitetura

```
┌──────────────── Dispositivo ────────────────┐          ┌──────────────┐          ┌───────────┐
│ 12 V (+6×AA) → 5 V ───┬─ ESP32 (VIN)        │  MQTT    │ HiveMQ Cloud │  MQTT    │ App Expo  │
│                        └─ Servo MG90S        │◄──TLS───►│  (broker)    │◄──WSS───►│ (celular) │
│ Divisor R1/R2 → GPIO34 (bateria)             │  8883    └──────────────┘  8884    └───────────┘
│ Célula 5 kg → HX711 → GPIO16/4 (balança)     │
│ Servo 360° → GPIO18 (rotor dosador)          │
└──────────────────────────────────────────────┘
```

### 4.1 Responsabilidades

- **Firmware (ESP32)**: dono da agenda, da dosagem, do histórico e da calibração. Publica estado; executa comandos.
- **Broker**: só transporta mensagens. Mensagens *retained* guardam o último status/config.
- **App**: interface. Guarda cópia local do histórico para gráficos e uso offline.

### 4.2 Fluxo de uma refeição

1. Gatilho: agenda (minuto atual = refeição ativa e ainda não servida hoje) ou comando `feed`.
2. Pré-checagens: bateria > 5 %, balança responde, vasilha presente.
3. Lê peso estável inicial `W0`.
4. Ciclo gira o rotor → espera assentar → pesa, até `W − W0 ≥ meta − antecipação`.
5. Sem ganho de peso em 2 giros → recua e avança (destrava); após 4 tentativas → erro `NO_FLOW`.
6. Para o rotor, recua um pouco (alivia as pás), pesa final, grava registro, publica evento.

Detalhes em [04-firmware.md](04-firmware.md) §4.

## 5. Estrutura do repositório

```
specs/                 ← estes documentos
firmware/              ← PlatformIO (ESP32)
app/                   ← Expo / React Native
tools/                 ← simulador do dispositivo (Node) e utilitários
cad/                   ← FreeCAD (.FCStd), STLs, scripts/ e renders/
docs/                  ← apresentação, fotos, diagramas
site/                  ← site estático (GitHub Pages)
```
