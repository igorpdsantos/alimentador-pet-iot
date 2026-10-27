# Firmware (ESP32)

Firmware do ESP32 DOIT DevKit V1, em PlatformIO + Arduino. Ele gira o rotor dosador (servo de rotação contínua),
lê a balança (HX711 + célula de 5 kg) e para quando o peso pedido cai na vasilha (malha fechada). Também mede a
bateria, cumpre a agenda, guarda o histórico e conversa com o app por MQTT
(contrato em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md)). Arquitetura em
[`specs/04-firmware.md`](../specs/04-firmware.md).

> Compila e passa nos testes do PC; **ainda não foi gravado numa placa montada**. Os testes de bancada estão em
> [`specs/07-testes-e-metricas.md`](../specs/07-testes-e-metricas.md).

## Estrutura

```
platformio.ini      envs esp32 (placa) e native (testes no PC)
include/
  config.h          pinos, constantes e limites (espelha specs/02-hardware.md §2)
  ca_cert.h         certificado raiz do broker (ISRG Root X1)
  secrets.example.h modelo de credenciais; copie para secrets.h (fora do git)
lib/core/src/       lógica pura, sem hardware: dosagem, bateria, agenda, reservatório, protocolo, histórico
src/                hardware (rotor, balança, energia, NVS, LittleFS, rede) e tasks (control, monitor, ui, net)
test/               testes da lib/core no PC, usando tools/protocol-fixtures
```

## Bibliotecas

`ArduinoJson` v7, `ESP32Servo`, `HX711` (bogde), `PubSubClient`, `WiFiManager` — baixadas pelo PlatformIO.

## Como compilar e gravar

1. Instale o [PlatformIO](https://platformio.org/install) (extensão do VS Code ou `pip install platformio`).
2. Copie `include/secrets.example.h` para `include/secrets.h` e preencha com o broker MQTT e uma senha de OTA.
3. Rode os testes e compile:

```bash
pio test -e native
pio run
```

4. **Desligue a chave das pilhas/fonte**, ligue a placa pelo USB e grave:

```bash
pio run -t upload
pio device monitor
```

Na primeira vez, o ESP32 abre a rede Wi-Fi **"Alimentador-XXXXXX"**: conecte o celular, escolha a rede da sua casa
e anote o código `pf-xxxxxx` mostrado na página. Depois de montado, dá para regravar pelo Wi-Fi (OTA).

## Primeiro uso

1. Pareie o app com o código `pf-xxxxxx`.
2. Ajustes → **Calibrar a balança** (plataforma vazia → peso conhecido → vasilha vazia).
3. Ajustes → rotor: se o rotor anda sozinho quando deveria estar parado, ajuste o "ponto parado" do servo.
4. Encha o reservatório e toque em **Reabasteci → Enchi até o topo**.

## Botões e LED

| | |
|---|---|
| Botão do pedestal, clique | Serve a porção padrão (20 g, muda no app) |
| Botão do pedestal, 3 s | "Reabasteci" (reservatório cheio) |
| BOOT, 10 s | Apaga o Wi-Fi e abre o portal de novo |
| LED aceso | Tudo certo |
| LED piscando devagar | Sem Wi-Fi (agenda continua funcionando) |
| LED piscando rápido | Erro: sem ração / travado, balança, pilhas no fim |

## Segurança do pet

- O boot sempre deixa o rotor **parado** (sem pulso no servo) antes de qualquer outra coisa.
- Todo giro dura no máximo 1,5 s e a dosagem no máximo 90 s; sem ração caindo, ele recua, tenta de novo e para
  com `NO_FLOW`.
- Refeição perdida com o alimentador desligado não é servida depois; reset no meio não serve em dobro.
