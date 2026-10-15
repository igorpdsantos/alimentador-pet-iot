# 02 — Hardware (v3)

Lista de compras com preços e medidas: **`docs/orcamento.md`** (teto R$ 490 para o grupo).
Posição física de cada componente: `specs/03-mecanica.md` §5 e §8.

## 1. Componentes eletrônicos

| Item | Função |
|---|---|
| ESP32 DOIT DevKit V1 | Controle, Wi-Fi, agenda, dosagem |
| Célula de carga 5 kg + HX711 | Balança sob a vasilha |
| **Servo MG90S 360°** (rotação contínua, engrenagem de metal; SG90 não serve — torque baixo, 03-mecanica §3.1) | Gira o rotor dosador nos dois sentidos |
| Fonte 12 V 1 A (P4) | Alimentação principal |
| 6 × AA alcalinas em suporte chato | Reserva quando falta energia (no-break) |
| 2 × 1N5819 | "OU" entre fonte e pilhas |
| Step-down MP1584 ajustado em **5,0 V** | 5 V para ESP32 (VIN) e servo |
| Divisores 100k/27k (bateria) e 100k/22k (fonte) | Medir pilhas e detectar falta de energia |
| 470 µF no 5 V, 100 nF nos ADCs | Estabilidade |
| Chave KCD11, botão 12 mm, LED 5 mm + 220 Ω | Liga/desliga, "alimentar agora", status |
| Protoboard MB-102 + jumpers | Montagem |

## 2. Pinagem (ESP32 DOIT DevKit V1)

| Sinal | GPIO | Notas |
|---|---|---|
| Servo 360° (PWM 50 Hz) | **18** | 1500 µs = parado; > 1500 um sentido, < 1500 o outro; ajuste fino do "parado" por calibração |
| HX711 DOUT / SCK | **16 / 4** | — |
| Bateria (divisor 100k/27k) | **34** | ADC1 |
| Fonte presente (divisor 100k/22k) | **35** | ADC1; > 1,5 V = na tomada |
| Botão "alimentar agora" | **23** | `INPUT_PULLUP`, botão para GND |
| LED de status | **22** | via 220 Ω |
| Botão BOOT | **0** | 10 s pressionado: apaga Wi-Fi e abre portal |

Evitar: GPIO 6–11, 12, e ADC2 (13–15, 25–27) para leitura analógica com Wi-Fi.

## 3. Alimentação

```
Fonte 12 V ──┬─[1N5819]──┐
             └ 100k ┬ GPIO35
                   22k   ├──[chave KCD11]──► MP1584 IN   OUT 5,0 V ─┬─► ESP32 VIN
6×AA (6–9,9 V) ┬─[1N5819]┘                                          └─► Servo V+  ║470 µF
               └ 100k ┬ GPIO34
                     27k
GND comum.  ESP32 3V3 ──► HX711 VCC.
```

- Na tomada, as pilhas ficam bloqueadas pelo diodo e não gastam. Sem energia, assumem sem interrupção.
- O step-down precisa de entrada ≥ ~6,5 V: as pilhas sustentam até ~1,1 V/célula (≈ 15 % de carga),
  depois o firmware avisa "pilhas no fim".
- Consumo do servo 360° no uso (rotor com chapéu aliviando a coluna): ~0,2–0,5 A; pico de travamento ~0,7 A.
- **Não conectar USB e fonte/pilhas ao mesmo tempo**; desligar a chave para gravar.

### Tensão → % (alcalinas, por célula)

| V/célula | 1,55 | 1,45 | 1,38 | 1,30 | 1,25 | 1,20 | 1,15 | 1,10 | 1,05 | 1,00 |
|---|---|---|---|---|---|---|---|---|---|---|
| % | 100 | 90 | 75 | 55 | 40 | 25 | 15 | 8 | 3 | 0 |

Tabela inicial (ajustar em T-BAT). Pack < 3 V → "sem pilhas". Alertas: ≤ 20 % "trocar em breve", ≤ 15 %
"reserva no fim" (abaixo disso o step-down pode não segurar 5 V).

## 4. Balança

- Fios da célula: **E+ vermelho, E− preto, A− branco, A+ verde** (peso negativo → inverter A+/A−).
- HX711 canal A, ganho 128, 10 amostras/s, na protoboard (fios da célula passam pela canaleta do pedestal).
- Calibração em 3 passos: tara da plataforma → peso conhecido → tara da vasilha.

## 5. Consumo

| Situação | Corrente em 5 V | Autonomia |
|---|---|---|
| Na tomada | ~40–100 mA (picos do servo ao servir) | ilimitada |
| Sem energia, nas pilhas | ~40 mA | ~2 dias — cobre quedas comuns |
