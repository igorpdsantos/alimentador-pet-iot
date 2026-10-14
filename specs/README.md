# Specs — Alimentador de Pet IoT

Fonte da verdade do projeto. Código, modelagem e apresentação seguem estes documentos;
quando a implementação divergir, **atualize a spec no mesmo passo**.

| # | Documento | Conteúdo |
|---|-----------|----------|
| 01 | [01-sistema.md](01-sistema.md) | Objetivo, escopo, requisitos, arquitetura, fluxos principais |
| 02 | [02-hardware.md](02-hardware.md) | Lista de materiais, pinagem, esquema elétrico, divisor de bateria, consumo |
| 03 | [03-mecanica.md](03-mecanica.md) | Peças do modelo 3D, agitador (substitui o prego), base com balança |
| 04 | [04-firmware.md](04-firmware.md) | Arquitetura do ESP32, dosagem por peso em malha fechada, bateria, agenda |
| 05 | [05-protocolo-mqtt.md](05-protocolo-mqtt.md) | Contrato app ↔ firmware: tópicos, comandos, eventos, erros |
| 06 | [06-app-mobile.md](06-app-mobile.md) | Stack, telas, fluxos, armazenamento local |
| 07 | [07-testes-e-metricas.md](07-testes-e-metricas.md) | Plano de testes e métricas para a apresentação |

Documentação para o grupo (em `docs/`): [componentes.md](../docs/componentes.md) (modelos, medidas, parafusos, ligações), [montagem.md](../docs/montagem.md) (montagem, uso, nível de ração, troca de pilhas, limpeza), [orcamento.md](../docs/orcamento.md), **[passo_a_passo.md](../docs/passo_a_passo.md)** (montagem fase a fase) e o modelo 3D detalhado `cad/montagem/IoT3D_v3_montagem.FCStd`.

## Referência

- Projeto base: [arthurmacedo01/ped_feeder](https://github.com/arthurmacedo01/ped_feeder) (ESP-IDF + MQTT + página web; servo abre comporta por tempo)
- Vídeo: https://youtu.be/HcdWtQP4j1U

**O que muda em relação à referência**

| Referência | Este projeto |
|---|---|
| Dose por *tempo* de abertura ("intensidade") | Dose por **peso medido** (HX711 + célula de 5 kg) em malha fechada |
| Sem feedback do que caiu | App mostra gramas **efetivamente servidas** e consumo do pet |
| Página web (Paho MQTT) | **App mobile** (Expo / React Native) |
| Sem monitoramento de energia | **Medidor de bateria** (% e alerta de troca de pilhas) |
| Prego como agitador | **Agitador impresso** integrado à tampa + rotina de vibração no servo |

## Decisões tomadas (podem ser revistas — registre aqui se mudar)

| ID | Decisão | Motivo |
|----|---------|--------|
| D1 | Firmware em **PlatformIO + Arduino framework** (não ESP-IDF puro como a referência) | Bibliotecas prontas para HX711, servo, Wi-Fi manager; curva menor para a equipe. FreeRTOS continua disponível. |
| D2 | Comunicação por **MQTT com broker na nuvem (HiveMQ Cloud, plano gratuito, TLS)** | Funciona fora da rede de casa, igual à referência, sem backend próprio. |
| D3 | App em **Expo (React Native + TypeScript)** | Android e iOS com um código só; roda no emulador Android já instalado. |
| D4 | **Histórico guardado no ESP32** (buffer circular em flash) e sincronizado pelo app | Sem servidor; o app pode ficar fechado e não perde eventos. |
| D5 | Wi-Fi configurado por **portal cativo** (WiFiManager) | Sem credenciais no código. |
| D6 | **Fonte 12 V na tomada + 6×AA alcalinas como no-break** (diodos em "OU") | Só pilhas durariam ~2–3 dias; assim duram anos e o app responde na hora (02-hardware §3) |
| D7 | ~~Servo MG90S 180°~~ → ver D13 | — |
| D8 | **PVC esgoto série normal DN100** (DE 101,6 × 1,8 mm), tubo de **640 mm**, 1 cap (só em cima) | Fácil de achar, barato. Comprimento definido pelo requisito de **≥ 1,2 kg** de ração leve (D17) |
| D9 | ~~Superfície 45° + luva com agitador em U + caixa de eletrônica (v2)~~ → substituída pela v3 (D13) | v2 fica como histórico |
| D10 | Peças em **PETG** | Calor, fluência e contato com ração |
| D12 | **Teto de R$ 371** (≈ R$ 46,40 × 8 pessoas) para tudo, inclusive filamento (era R$ 320) | `docs/orcamento.md`: ~R$ 268 econômico, ~R$ 345 faixa média, ~R$ 444 pior caso (cortes previstos) |
| D13 | **v3: rotor de 6 bolsos com pás curvas (rígidas, D15) + servo MG90S 360°** (SG90 360° descartado: torque insuficiente com o tubo cheio, D15), eletrônica dentro do tubo, pilhas no pedestal, balança sob saia | À prova de travamento/entupimento, grãos 4–22 mm, tudo coberto, 13 tipos de peça (19 arquivos) / 773 g com chapéu, gaveta e patas (03-mecanica) |
| D14 | Step-down MP1584 no lugar do buck-boost | Entrada sempre ≥ 6,5 V (fonte 12 V ou pilhas); mais barato e menor |
| D15 | **Chapéu P10 sobre o rotor + pás rígidas de 2,4 mm** (eram 1 mm flexíveis) | Pás de 1 mm podiam trincar por fadiga e soltar lasca na ração; sem alívio, o tubo cheio pedia ~2,9 kgf·cm (servo trava em 1,8). Estudo DEM em 03-mecanica §3.1 |
| D16 | **Gaveta das pilhas (P11)** saindo pela esquerda do pedestal | Trocar pilhas sem levantar o tubo cheio nem virar o alimentador; o fundo do pedestal fica aberto sob a gaveta |
| D17 | **Capacidade mínima 1,2 kg** (1 kg + 200 g de margem) com ração leve de 0,45 kg/L → tubo de 640 mm (era 450) | Pedido do grupo; aumenta a altura para ~67 cm e o risco de tombar (03-mecanica §2) |
| D18 | **4 patas anti-tombamento (P12) com lastro**, em vez de prender na parede ou trocar para PVC DN 150 | Grupo não quer prender na parede; DN 150 estourava o orçamento. Patas dobram a força para tombar (~3 → ~6,3 N) por ~R$ 20 (03-mecanica §5.1) |
| D11 | **Projeto tolerante** às peças compradas: tubo encaixa direto na caixa (sem cap embaixo), rasgos na célula, envelope de vasilha | A equipe ainda não tem as peças; dá para imprimir antes de comprar |

## Decisões em aberto

| ID | Pergunta | Recomendação |
|----|----------|--------------|
| A5 | Itens que o grupo já tem (servo SG90, protoboard, pilhas…) | Abater do orçamento. Servo SG90 do grupo **não** serve para o rotor (torque baixo, D15); dá para usar em testes de bancada do firmware |
