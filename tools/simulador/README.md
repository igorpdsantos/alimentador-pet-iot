# Simulador do dispositivo

> **Em desenvolvimento.** Ver [`specs/06-app-mobile.md` §5](../../specs/06-app-mobile.md).

Programa em Node (mqtt.js) que faz o papel do ESP32 no contrato MQTT, com balança e bateria falsas. Serve para
desenvolver e testar o app sem o hardware: responde aos comandos, simula a dosagem (com ruído e falhas `NO_FLOW`
configuráveis) e publica `status`, `config` e eventos.

Credenciais em `.env` (fora do git), no mesmo formato do `app/.env.example`.
