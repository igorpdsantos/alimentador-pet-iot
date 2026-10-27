# App (PWA)

App web instalável para programar os horários e as gramas de cada refeição, servir na hora, ver o histórico do que
foi servido, o consumo do pet e a bateria do alimentador. Conversa com o ESP32 por MQTT
(contrato em [`specs/05-protocolo-mqtt.md`](../specs/05-protocolo-mqtt.md)). Especificação completa em
[`specs/06-app-mobile.md`](../specs/06-app-mobile.md).

**Publicado em:** <https://igorpdsantos.github.io/alimentador-pet-iot/app/> (compilado pelo workflow do GitHub Pages a cada
push na `main`; não leva credencial nenhuma — o broker é informado no pareamento).

**Telas:** Pareamento · Início · Agenda · Histórico (lista, gráficos e precisão da dose) · Ajustes · Calibração da balança

## Testar sem o alimentador (simulador)

Em um terminal, suba o simulador com broker próprio:

```bash
cd tools/simulador && npm install && node simulador.mjs --local --id pf-sim001
```

Em outro, o app:

```bash
cd app && npm install && npm run dev
```

Abra <http://localhost:5173>, digite o código `pf-sim001` e, em "Servidor MQTT (avançado)", o endereço
`ws://localhost:9001/mqtt` (usuário e senha em branco).

## Usar com o alimentador de verdade

1. Copie `.env.example` para `.env` e preencha com o broker do HiveMQ Cloud (`wss://…:8884/mqtt`). Use um usuário
   **diferente** do usado no ESP32 — tudo que começa com `VITE_` fica embutido no app.
2. `npm run build` gera o app estático em `dist/`. Publique em qualquer hospedagem HTTPS (ex.: GitHub Pages).
3. No celular, abra o endereço e use **Adicionar à tela inicial**. Ele passa a abrir como um app.

Para abrir no celular direto do computador na mesma rede: `npm run dev -- --host` e acesse o IP mostrado.

## Comandos

```bash
npm run dev        # servidor de desenvolvimento
npx tsc --noEmit   # tipos
npx vitest run     # testes (usam os JSON de tools/protocol-fixtures)
npm run build      # build de produção com service worker
```

## Estrutura

```
src/
  protocol/   schemas zod, tópicos, comandos e textos do contrato MQTT
  mqtt/       cliente, pedido/resposta por req_id (timeout 8 s, tentar de novo com o mesmo req_id)
  store/      estado (zustand)
  db/         histórico local (IndexedDB)
  lib/        métricas dos gráficos e formatação pt-BR
  components/ peças de interface, gráficos em SVG, ícones
  screens/    as telas
```
