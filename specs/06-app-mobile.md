# 06 — App mobile

## 1. Stack

| Item | Escolha |
|---|---|
| Framework | Expo (SDK estável mais recente) + React Native + **TypeScript estrito** |
| Navegação | `expo-router` (abas) |
| MQTT | `mqtt` (mqtt.js v5) via WebSocket seguro (`wss://…:8884/mqtt`). **Validar num spike no 1º dia** no Android; se falhar, plano B: `paho-mqtt` |
| Estado | `zustand` |
| Armazenamento local | `expo-sqlite` (histórico), `expo-secure-store` (credenciais do broker) |
| Gráficos | `react-native-gifted-charts` |
| Validação de mensagens | `zod` — os schemas espelham 05-protocolo |
| Testes | `jest-expo` + React Native Testing Library |

Roda no emulador Android já existente (`Medium_Phone` AVD) e no celular via Expo Go / development build.

## 2. Estrutura

```
app/
  app/                      ← rotas (expo-router)
    (tabs)/index.tsx        ← Início
    (tabs)/agenda.tsx
    (tabs)/historico.tsx
    (tabs)/ajustes.tsx
    pareamento.tsx
    calibracao.tsx
  src/
    protocol/               ← tipos + schemas zod do contrato (05-protocolo), único lugar com nomes de tópico
    mqtt/                   ← cliente, reconexão, request/response por req_id com timeout 8 s
    store/                  ← zustand: device, status, config, history
    db/                     ← sqlite: feeds, consumption, last_seq
    components/
    theme/
```

## 3. Telas

### Pareamento (primeiro uso)
1. Explica: ligar o alimentador, conectar o celular à rede "Alimentador-XXXXXX", escolher o Wi-Fi da casa
   no portal (WiFiManager). O portal mostra o `device_id`.
2. Usuário digita o `device_id` (ou lê QR da etiqueta colada no alimentador — QR contém `pf-xxxxxx`).
3. App assina `petfeeder/{id}/online` e espera `true` (timeout 30 s) → sucesso.

### Início
- Cartão de status: online/offline, **energia (tomada / pilhas)**, **bateria reserva (% + tensão)**, aviso de troca e de falta de energia.
- **Ração na vasilha** (g) e "vasilha ausente".
- **Reservatório**: % restante, gramas e "dura mais ~N dias"; botão **Reabasteci** (cheio ou informar gramas).
- Próxima refeição (hora e gramas).
- Botão **Alimentar agora** → folha com seletor de gramas (5–200, passos de 5, atalhos 10/20/50) e modo.
- Durante a dosagem: barra de progresso `served_g / target_g` (eventos `feed_progress`), botão cancelar.
- Resultado: "Servido 49,6 g de 50 g" ou mensagem de erro amigável (05-protocolo §6).

### Agenda
- Lista de refeições (hora, gramas, dias, chave ativa). Adicionar/editar/remover (máx. 8).
- Salvar envia `set_schedule` com a lista inteira; só confirma na tela após `resp ok` e `config` atualizado.

### Histórico
- Lista de refeições: data/hora, origem, meta × servido, status (cor/ícone).
- Gráficos: (a) gramas servidas por dia (barras, 7/30 dias); (b) ração na vasilha ao longo do dia (linha);
  (c) consumo estimado por dia = soma das quedas de peso entre amostras.
- Métricas de precisão: erro médio e desvio-padrão (servido − meta) — úteis para a apresentação.
- Sincronização: ao abrir e ao reconectar, pede `history` a partir do último `seq` salvo, paginando.

### Ajustes
- Nome do pet, porção do botão, capacidade máxima da vasilha, química das pilhas.
- Calibração da balança (assistente), calibração de bateria (tensão do multímetro), ângulos da comporta (avançado).
- Dispositivo: `device_id`, firmware, sinal Wi-Fi, reiniciar, desparear.

### Calibração (assistente)
1. "Tire tudo da plataforma" → `tare_platform`.
2. "Coloque um objeto de peso conhecido" + campo gramas → `calibrate`.
3. "Coloque a vasilha vazia" → `tare_bowl`.
4. Mostra leitura ao vivo (`read_scale` a cada 1 s) para conferência.

## 4. Regras

- Toda mensagem recebida passa por `zod`; payload inválido é descartado e logado, nunca derruba a tela.
- Comando sem `resp` em 8 s → erro "Alimentador não respondeu" e botão de tentar de novo (mesmo `req_id`).
- Offline (`online=false` ou sem conexão com broker): botões de comando desabilitados; mostra último status com "há X min".
- Credenciais do broker: em `expo-secure-store`; valores padrão de desenvolvimento via `app/.env` (`EXPO_PUBLIC_MQTT_URL`, `…_USER`, `…_PASS`).
  Observação: `EXPO_PUBLIC_*` vai embutido no app — aceitável para o trabalho; usar credencial **separada** da do ESP32.
- Português do Brasil, unidades em g, hora 24 h, datas `dd/mm`.
- Acessibilidade: alvos de toque ≥ 44 pt, contraste AA, `accessibilityLabel` nos ícones.

## 5. Simulador do dispositivo

`tools/simulador/` (Node + mqtt.js) implementa o lado do ESP32 do contrato com balança e bateria
falsas, para desenvolver o app sem hardware: responde comandos, simula dosagem (pulsos com ruído,
falha `NO_FLOW` aleatória configurável), publica `status`, `config` e eventos.
