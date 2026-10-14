# App mobile

> **Em desenvolvimento.** O app será feito do zero; esta pasta já tem o modelo de configuração.
> A especificação completa está em [`specs/06-app-mobile.md`](../specs/06-app-mobile.md).

App em Expo + React Native + TypeScript para programar os horários e as gramas de cada refeição, servir na hora,
ver o histórico do que foi servido, o consumo do pet e a bateria do alimentador. Conversa com o ESP32 por MQTT
(contrato em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md)).

## Telas previstas

Pareamento · Início · Agenda · Histórico · Ajustes · Calibração da balança

## Estrutura prevista

```
app/
  app/            rotas (expo-router)
  src/
    protocol/     tipos e schemas (zod) do contrato MQTT
    mqtt/         cliente, reconexão, pedido/resposta
    store/        estado (zustand)
    db/           histórico local (expo-sqlite)
    components/
    theme/
```

## Como rodar (quando o código existir)

1. Instale o [Node.js](https://nodejs.org) 20 ou mais novo.
2. Copie `.env.example` para `.env` e preencha com os dados do seu broker MQTT
   (use um usuário **diferente** do usado no ESP32).
3. Instale e rode:

```bash
npm install
npx expo start
```

Abra no celular com o Expo Go ou num emulador Android. Para testar sem o alimentador montado, use o
simulador em [`tools/simulador/`](../tools/simulador/).
