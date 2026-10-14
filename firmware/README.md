# Firmware (ESP32)

> **Em desenvolvimento.** O código ainda não foi escrito; esta pasta já tem a estrutura e o modelo de credenciais.
> A especificação completa está em [`specs/04-firmware.md`](../specs/04-firmware.md).

Firmware do ESP32 DOIT DevKit V1, em PlatformIO + Arduino. Ele gira o rotor dosador (servo de rotação contínua),
lê a balança (HX711 + célula de 5 kg) e para quando o peso pedido cai na vasilha (malha fechada). Também mede a
bateria, cumpre a agenda e conversa com o app por MQTT
(contrato em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md)).

## Estrutura prevista

```
firmware/
  platformio.ini
  include/
    config.h              pinos, constantes e limites (espelha specs/02-hardware.md §2)
    secrets.example.h     modelo de credenciais; copie para secrets.h (fora do git)
    ca_cert.h             certificado raiz do broker
  src/
    main.cpp              setup + criação das tasks (FreeRTOS)
    scale.{h,cpp}         HX711, leitura estável, calibração
    rotor.{h,cpp}         servo 360°: avança, recua, para; parado no boot
    dispenser.{h,cpp}     máquina de estados da dosagem
    battery.{h,cpp}       ADC, tensão e porcentagem
    scheduler.{h,cpp}     agenda e disparo
    history.{h,cpp}       histórico em LittleFS
    net.{h,cpp}           Wi-Fi, MQTT, reconexão
    protocol.{h,cpp}      comandos e mensagens do contrato MQTT
  test/                   testes da lógica pura no PC (env native)
```

## Bibliotecas

`ESP32Servo`, `HX711` (bogde), `ArduinoJson` v7, `PubSubClient`, `WiFiManager`.

## Como compilar (quando o código existir)

1. Instale o [PlatformIO](https://platformio.org/install) (extensão do VS Code ou `pip install platformio`).
2. Copie `include/secrets.example.h` para `include/secrets.h` e preencha com os dados do seu broker MQTT.
3. Rode os testes e compile:

```bash
pio test -e native
pio run
```

4. Grave com a placa ligada pelo USB:

```bash
pio run -t upload
```

Na primeira vez, o ESP32 abre a rede Wi-Fi **"Alimentador-XXXXXX"** para você escolher a rede da sua casa.

## Segurança do pet

- O boot sempre deixa o rotor **parado**.
- Toda dosagem tem limite de tempo e de peso; sem queda de ração, ele para e avisa (`NO_FLOW`).
