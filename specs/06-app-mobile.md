# 06 — App (PWA)

App web instalável (PWA): abre no navegador do celular, vai para a tela inicial com "Adicionar à tela inicial"
e funciona como um app, sem loja. Decisão D19 em [README.md](README.md) (substituiu o Expo de D3).

## 1. Stack

| Item | Escolha |
|---|---|
| Base | Vite 6 + React 19 + **TypeScript estrito** |
| PWA | `vite-plugin-pwa` (manifesto, service worker, ícones em `public/icons/`); funciona offline com o último estado salvo |
| Navegação | 4 abas + rota no hash (`#/agenda`, `#/historico`, `#/ajustes`, `#/calibracao`); serve em qualquer hospedagem estática |
| MQTT | `mqtt` (mqtt.js v5) por WebSocket seguro (`wss://…:8884/mqtt`) |
| Estado | `zustand` |
| Armazenamento local | IndexedDB via `idb` (histórico, um banco por alimentador); `localStorage` (pareamento e credenciais do broker) |
| Gráficos | SVG próprio (`src/components/Charts.tsx`), sem biblioteca |
| Validação de mensagens | `zod` — os schemas espelham 05-protocolo |
| Testes | `vitest` + Testing Library + `fake-indexeddb`, com os JSON de `tools/protocol-fixtures/` |

Roda no navegador do computador (`npm run dev`) e no celular pela rede local (`npm run dev -- --host`) ou publicado
(`npm run build` → `app/dist/`, estático).

## 2. Estrutura

```
app/
  index.html, vite.config.ts      manifesto da PWA e config dos testes
  public/icons/                   ícones (SVG + PNG 192/512/maskable/apple)
  src/
    App.tsx                       abas e rotas
    protocol/                     schemas zod, tópicos, comandos e textos pt-BR do contrato (único lugar com nomes de tópico)
    mqtt/client.ts                conexão, pedido/resposta por req_id com timeout de 8 s
    store/device.ts               zustand: pareamento, conexão, status, config, refeição em andamento, avisos
    db/history.ts                 IndexedDB: feeds, consumption, last_seq
    lib/                          métricas dos gráficos e formatação pt-BR
    components/                   botões, folhas, stepper, gráficos, ícones
    screens/                      Pareamento, Início, Agenda, Histórico, Ajustes, Calibração
```

## 3. Telas

### Pareamento (primeiro uso)
1. Explica: ligar o alimentador, conectar o celular à rede "Alimentador-XXXXXX" (senha na etiqueta, D21), escolher o Wi-Fi da casa
   no portal (WiFiManager). O portal mostra o `device_id`.
2. Usuário digita o `device_id` (ou lê o QR da etiqueta pela câmera, onde o navegador tem `BarcodeDetector` — QR contém `pf-xxxxxx`).
3. Broker (URL, usuário, senha) vem preenchido do `.env`; dá para trocar em "Servidor MQTT (avançado)".
4. App assina `petfeeder/{id}/online` e espera `true` (timeout 30 s) → sucesso.

### Início
- Online/offline (com "visto há X min" quando offline) e avisos ativos.
- **Ração na vasilha** (g) e "sem vasilha"; **próxima refeição**.
- **Reservatório**: % restante, gramas e "dura mais ~N dias"; botão **Reabasteci** (cheio ou informar gramas).
- **Energia** (tomada / pilhas) e **pilhas de reserva** (% + tensão), aviso de troca.
- Botão **Alimentar agora** → folha com seletor de gramas (5–200, passos de 5, atalhos 10/20/50/100) e modo (servir / completar até).
- Durante a dosagem: progresso `served_g / target_g` (eventos `feed_progress`) e botão cancelar.
- Resultado: "Servido 49,6 g de 50,0 g" ou mensagem de erro amigável (05-protocolo §6).

### Agenda
- Lista de refeições (hora, gramas, dias, chave ativa). Adicionar/editar/remover (máx. 8).
- Salvar envia `set_schedule` com a lista inteira; só confirma na tela após `resp ok` (o `config` retido atualiza a lista).

### Histórico
- Lista de refeições: data/hora, origem, meta × servido, destravas, status (cor).
- Gráficos (7/30 dias): (a) servido × comido por dia (barras); (b) ração na vasilha ao longo de hoje (linha);
  comido = soma das quedas de peso entre amostras de consumo.
- Precisão: erro médio e desvio-padrão (servido − meta), erro médio absoluto (%) e % de refeições OK.
- Sincronização: ao conectar e no botão de atualizar, pede `history` a partir do último `seq` salvo, paginando.

### Ajustes
- Nome do pet, porção do botão, capacidade da vasilha.
- Calibração da balança (assistente) e da bateria (tensão do multímetro).
- Rotor: girar 1 s para frente/trás, destravar, ajuste do neutro do servo, esvaziar reservatório (com confirmação).
- Dispositivo: `device_id`, firmware, sinal Wi-Fi, vazão aprendida, reiniciar, desparear (apaga o histórico local).

### Calibração (assistente)
1. "Tire tudo da plataforma" → `tare_platform`.
2. "Coloque um objeto de peso conhecido" + gramas → `calibrate`.
3. "Coloque a vasilha vazia" → `tare_bowl`.
4. Leitura ao vivo (`read_scale` a cada 1 s, sem empilhar pedidos) para conferência.

## 4. Regras

- Toda mensagem recebida passa por `zod`; payload inválido é descartado e logado, nunca derruba a tela.
- Comando sem `resp` em 8 s → "O alimentador não respondeu" e botão **Tentar de novo** com o **mesmo `req_id`**.
- Offline (`online=false` ou sem conexão com o broker): botões de comando desabilitados; mostra o último status.
- Nada de UI otimista em `feed`: o progresso só aparece com os eventos do dispositivo.
- Credenciais do broker: `app/.env` (`VITE_MQTT_URL`, `VITE_MQTT_USER`, `VITE_MQTT_PASS`) ou digitadas no pareamento.
  `VITE_*` vai embutido no app publicado — aceitável para o trabalho; usar credencial **separada** da do ESP32,
  com permissão só em `petfeeder/#`.
- Português do Brasil, gramas com 1 casa, hora 24 h, datas `dd/mm`, fuso de Brasília.
- Acessibilidade: alvos de toque ≥ 44 px, contraste AA, `aria-label` nos ícones, modo escuro pelo sistema,
  respeita "reduzir movimento".

## 5. Simulador do dispositivo

`tools/simulador/` (Node + mqtt.js) implementa o lado do ESP32 do contrato com balança, bateria e reservatório
falsos, para desenvolver o app sem hardware: responde comandos, simula a dosagem (giros com ruído, falha `NO_FLOW`
configurável), publica `status`, `config` e eventos, e gera 7 dias de histórico. Com `--local` sobe um broker
próprio em `ws://localhost:9001/mqtt` (sem internet nem conta no HiveMQ).
