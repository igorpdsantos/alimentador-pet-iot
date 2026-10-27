# Simulador do dispositivo

Programa em Node (mqtt.js) que faz o papel do ESP32 no contrato MQTT
([`specs/05-protocolo-mqtt.md`](../../specs/05-protocolo-mqtt.md)), com balança, bateria e reservatório falsos.
Serve para desenvolver, testar e **apresentar** o app sem o hardware: responde aos comandos, simula a dosagem
(com ruído e falhas `NO_FLOW` configuráveis), publica `status`, `config` e eventos e já começa com 7 dias de histórico.

```bash
npm install
node simulador.mjs --local --id pf-sim001     # broker próprio em ws://localhost:9001/mqtt
node simulador.mjs --id pf-sim001             # broker de .env (MQTT_URL, MQTT_USER, MQTT_PASS)
```

Opções: `--fail-rate 0.1` (chance de travar), `--no-seed` (sem histórico inicial), `--port 9001`.

Teclas no terminal: `p` tomada/pilhas · `b` tira/põe a vasilha · `v` esvazia o reservatório · `q` sai.

`.env` (fora do git), para usar o HiveMQ Cloud:

```
MQTT_URL=wss://xxxxxxxx.s1.eu.hivemq.cloud:8884/mqtt
MQTT_USER=usuario-do-simulador
MQTT_PASS=senha
```
