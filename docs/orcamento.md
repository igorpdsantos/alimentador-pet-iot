# Orçamento — Alimentador v3

**Teto: R$ 490** (≈ R$ 61 × 8 pessoas; era R$ 371, antes R$ 320 — subiu em 14/10/2026 para incluir a impressão 3D terceirizada). Preços de referência em lojas brasileiras (Mercado Livre, lojas de
eletrônica e home centers) em outubro/2026; **variam bastante**. A coluna "econômico" assume reaproveitar o
que der (fonte velha de roteador, vasilha do pet, retalho de PVC).

**Decisão do grupo:** comprar avulso, cada item onde sai mais barato, com o plano da seção 2 (**~R$ 263** em compras, mais a impressão 3D terceirizada). A tabela
abaixo fica como referência de especificação e faixa de preço.

## 1. Compras

| # | Item | Especificação | Medidas (catálogo) | Faixa (R$) | Econômico (R$) |
|---|------|---------------|--------------------|-----------|----------------|
| 1 | ESP32 DOIT DevKit V1 | 30 pinos, ESP32-WROOM-32 | 51,5 × 28,3 × 13 mm (com pinos) | 35–45 | 35 |
| 2 | Célula de carga 5 kg + HX711 | Barra YZC-131 ou similar | célula 75–80 × 12,7 × 12,7; HX711 ~34 × 20 | 18–25 | 18 |
| 3 | Servo de rotação contínua | **MG90S 360°** (metal). **Não** o SG90 360°: torque abaixo do necessário com o tubo cheio (`docs/componentes.md` E5) | 22,8 × 12,2 × 22,7 mm, abas 32,5 mm | 30–45 | 30 |
| 4 | Regulador step-down | MP1584 (mini) | 22 × 17 × 4 mm | 5–8 | 5 |
| 5 | Fonte 12 V 1 A | Plugue P4 5,5 × 2,1 | externa | 15–25 | 0 (reaproveitar) |
| 6 | Jack P4 fêmea de painel | Rosca Ø8 | furo Ø8, corpo ~15 mm | 2–4 | 2 |
| 7 | Diodo Schottky 1N5819 | 2 unidades | — | 1 | 1 |
| 8 | Suporte 6 pilhas AA **chato** | 1 camada (6 lado a lado) | ~89 × 58 × 16 mm | 5–8 | 5 |
| 9 | 6 pilhas AA alcalinas | reserva (no-break) | — | 15–24 | 15 |
| 10 | Resistores e capacitores | 100 kΩ ×2, 27 kΩ, 22 kΩ, 220 Ω; 470 µF 16 V; 100 nF ×2 | — | 3–5 | 3 |
| 11 | Chave gangorra mini | KCD11 | furo 15 × 10 mm | 1–3 | 1 |
| 12 | Botão + LED | push-button de painel NA, rosca 12 mm + LED 5 mm difuso | furo Ø12 e Ø5 | 3–6 | 3 |
| 13 | Protoboard MB-102 830 furos | — | 165 × 55 × 10 mm | 10–15 | 10 |
| 14 | Jumpers | 40 macho-fêmea + 40 macho-macho | — | 10–15 | 10 |
| 15 | Tubo PVC esgoto DN100 série normal | pedaço ≥ 65 cm (corta 640 mm) | DE 101,6 × 1,8 mm | 15–30 (barra 3 m: 45–60) | 15 |
| 16 | Cap esgoto DN100 | só em cima, sem cola | — | 6–12 | 6 |
| 17 | Parafusos | 20 × M3 inox cabeça panela (2 × 8, 3 × 10, 13 × 12, 2 × 20) + 2 × M2 × 6; M4/M5 × 16 da célula (ver `docs/componentes.md` §3) | — | 12–18 | 12 |
| 17b | Fixação diversa | abraçadeiras 2,5 × 100, fita dupla-face, fio 4 vias ~40 cm (sobra de cabo de rede) | — | 0–8 | 0 |
| 18 | Pés de borracha adesivos | 12 unidades: 4 no pedestal + 4 nas patas (obrigatórios) + 3 na base (opcional) | Ø12 × 3–5 mm | 3–8 | 3 |
| 18b | Ímãs de neodímio | 4 × disco **6 × 2 mm** (pacote de 10) — trava da gaveta das pilhas | — | 5–10 | 5 |
| 18c | Lastro das patas | ~0,5 kg de porcas M8 ou arruelas de aço (ou areia em saquinho — grátis, mas pesa menos) | — | 0–15 | 0 |
| 19 | Vasilha | inox Ø 14–16 cm, altura ≤ 6 cm | — | 0–22 | 0 (a do pet) |
| 20 | Filamento PETG | ~890 g (com 15 % de perdas) — 1 rolo de 1 kg | — | 89 | 89 |
| | **Total** | | | **~295–444** | **~268** |

**Conclusão (estimativa inicial, com o teto antigo de R$ 371 e filamento próprio):** dava para comprar **tudo novo, inclusive o servo MG90S 360° (metal)**, na faixa
média (~R$ 345), sobrando ~R$ 26 para imprevistos (peça que queima, reimpressão, frete). No **pior caso** de
todos os preços (~R$ 444) passa ~R$ 73 do teto — aí entram os cortes: fonte reaproveitada (−R$ 20), vasilha do pet
(−R$ 20), lastro de areia (−R$ 15), kit de parafusos que alguém já tenha (−R$ 15) — ainda ~R$ 3 acima: pesquisar preço.
**Não** trocar o servo pelo SG90 360° para economizar (ver D15).
Não cortar: célula/HX711, ESP32, pilhas de reserva (o medidor de bateria é requisito).

**Por pessoa:** ~R$ 34 (econômico), ~R$ 43 (faixa média), ~R$ 56 (pior caso).

## 2. Plano de compra (cotado em 14/10/2026)

Comprado tudo pelo Mercado Livre, em pacotes, dava ~R$ 674: cada pacotinho de componente custa ~R$ 10–35 lá, e o
projeto usa 1 ou 2 de cada. Avulso no balcão da Santa Ifigênia sai a centavos. Preços lidos nos sites das lojas;
**confirmar estoque e preço de balcão por telefone/WhatsApp antes de ir.**

Fica de fora: fonte 12 V (reaproveitada), protoboard e jumpers (já temos), vasilha (a do pet), lastro (areia em
saquinho), fita dupla-face e fio de 4 vias (sobras).

### Mercado Livre (online, frete grátis)

| Item | Anúncio | R$ |
|---|---|---|
| ESP32 DevKit 30 pinos | [Placa Esp32 Wrom Wifi Bluetooth Pinos Soldados](https://www.mercadolivre.com.br/placa-esp32-wrom-wifi-bluetooth-pinos-soldados/p/MLB2048573048) (Full) | 39,99 |
| Suporte 6×AA chato | [Suporte 6 Pilhas Aa Canoa Com Plug P4](https://www.mercadolivre.com.br/suporte-6-pilhas-aa-canoa-com-plug-p4-p-arduino/up/MLBU1454247359) (6 lado a lado; cortar o plugue) | 19,00 |
| Tubo PVC DN100 | [Tubo Cano Pvc Esgoto 100mm 1,5 m Fortlev](https://www.mercadolivre.com.br/tubo-cano-pvc-esgoto-100mm--15-metro-fortlev/up/MLBU4170876556) | 24,46 |
| Cap DN100 | [Cap Esgoto Tigre 100mm](https://www.mercadolivre.com.br/cap-esgoto-tigre-100mm/p/MLB2063455787) — ou na loja física da Leroy (abaixo) | 19,00 |
| Ímãs 6 × 2 mm | [kit 10x Imã Neodímio 6x2mm N35](https://www.mercadolivre.com.br/kit-10x-ima-neodimio-6x2mm-super-forte-n35/p/MLB34090422) | 19,50 |
| Pés adesivos | [125 un. protetor batente gota de silicone](https://www.mercadolivre.com.br/125-und-protetor-batente-gota-de-silicone-adesivo-multiuso/up/MLBU1484001348) | 29,90 |
| **Subtotal** | | **151,85** |

### Saravati (loja física) — Rua Vitória, 39, Santa Ifigênia, São Paulo — (11) 4574-3058

Site: [saravati.com.br](https://www.saravati.com.br) (dá para pedir online e retirar na loja).

| Item | R$ |
|---|---|
| [Célula de carga 5 kg](https://www.saravati.com.br/sensor-de-peso-celula-de-carga-5kg.html) | 21,90 |
| [MP1584](https://www.saravati.com.br/modulo-mini-conversor-de-tensao-dc-dc-mp1584en-step-down.html) | 10,90 |
| 6 pilhas AA Panasonic (R$ 3,90 cada) | 23,40 |
| **Subtotal** | **56,20** |

### Mamute Eletrônica (loja física) — Rua Vitória, 125, Santa Ifigênia, São Paulo — (11) 3223-7551 / WhatsApp (11) 91232-6557

Seg–sex 8h30–17h, sáb 8h30–13h30. Site: [mamuteeletronica.com.br](https://www.mamuteeletronica.com.br) (pedido online com
retirada grátis).

| Item | R$ |
|---|---|
| [HX711](https://www.mamuteeletronica.com.br/modulo-para-sensor-de-peso-conversor-amplificador-hx711-24-bit-12197) | 8,90 |
| [Servo MG90S 360°](https://www.mamuteeletronica.com.br/micro-servo-tower-pro-mg90s-360-graus-21751) (**conferir no balcão que é rotação contínua**) | 23,90 |
| Resistores 1/4 W: 100k ×2, 27k, 22k, 220 Ω (R$ 0,10 cada) | 0,50 |
| Eletrolítico 470 µF 16 V (0,60) + 2 cerâmicos 100 nF (0,15 cada) | 0,90 |
| [2 × 1N5819](https://www.mamuteeletronica.com.br/diodo-schottky-1n5819-40v-1a-do-41-25) (0,35 cada) | 0,70 |
| LED 5 mm difuso | 0,20 |
| Chave KCD11 | 2,20 |
| [Push button PBS-33B 12 mm](https://www.mamuteeletronica.com.br/chave-push-button-na-12mm-impermeavel-pbs-33b-vermelho-10987) | 3,90 |
| [Jack P4 de painel DC-022](https://www.mamuteeletronica.com.br/conector-jack-j4-dc-022-painel-21mm-x-55mm-16265) | 2,20 |
| **Subtotal** | **43,40** |

### Parafusos e ferragem (lojas físicas)

**Dallanese** — Rua Joaquim Machado, 203, Lapa, São Paulo — (11) 3864-6241 — retira no balcão.
Site: [dallanese.com.br](https://www.dallanese.com.br/8288/pf-mm-panela-phillips-inox304) (inox 304, vende por unidade).
Alternativa no centro: lojas de parafuso da Rua Florêncio de Abreu (Roberfix, nº 288, (11) 3228-3077; San Siro, nº 286),
que não publicam preço — pedir orçamento no balcão.

| Item | Qtd | R$ unit. | R$ |
|---|---|---|---|
| M3 × 8 inox panela | 2 | ~0,15 (estimado) | ~0,30 |
| M3 × 10 inox panela | 3 | 0,18 | 0,54 |
| M3 × 12 inox panela | 13 | 0,16 | 2,08 |
| M3 × 20 inox panela | 2 | ~0,22 (estimado) | ~0,44 |
| M2 × 6 inox panela | 2 | 0,40 | 0,80 |
| M4 × 16 inox panela **ou** M5 × 16 chata (**só depois de ver a rosca da célula**) | 4 | 0,32 (M4) | ~1,30 |
| Abraçadeiras 2,5 × 100 (pacote de 100) | 1 | — | ~5 (qualquer ferragem) |
| **Subtotal** | | | **~11** |

**Cap na loja física (opcional):** Leroy Merlin Center Norte — Av. Otto Baumgart, 500, Vila Guilherme, São Paulo —
[Cap Tigre 100 mm](https://www.leroymerlin.com.br/cap-pvc-para-esgoto-100mm-ou-4-tigre_85227856) a R$ 11,90 (tinha
estoque em 14/10/2026). Só compensa se alguém passar por lá; senão, fica o do Mercado Livre.

### Total

| Onde | R$ |
|---|---|
| Mercado Livre | 151,85 |
| Saravati | 56,20 |
| Mamute | 43,40 |
| Parafusos e ferragem | ~11 |
| **Total das compras** | **~263** |
| Impressão 3D terceirizada (seção 3) | ~188,50 |
| **Total do projeto** | **~451** (≈ R$ 56 por pessoa) — folga de ~R$ 39 no teto de R$ 490 |

Alternativas vistas e descartadas: Eletrogate (online, BH) tem célula, servo MG90D 360°, protoboard, jumpers e suporte
chato baratos, mas o frete (~R$ 13) come a diferença e o MP1584 está esgotado; nas lojas da Santa Ifigênia o suporte de
6×AA é de 2 camadas (3+3) e não cabe na gaveta P11; o ESP32 custa R$ 50–63 nas lojas físicas.

## 3. Impressão 3D (PETG)

**A impressão é terceirizada:** o grupo paga por peça e o filamento é do impressor, então o PETG não entra nas compras.
### Orçamento do impressor

Valores com ~ são estimativa dele (P03 e P11 ainda sem fatiamento final).

| Peça | Filamento | Tempo | Preço (R$) |
|---|---|---|---|
| P01 piso do dosador | 23,2 g | 46 min | 7,00 |
| P02 anel + escudo | 32,8 g | 59 min | 10,00 |
| P03 rotor (40 %, 4 paredes) | ~38 g | ~1h10 | ~12,00 |
| P04 bica | 52,1 g | 1h28 | 16,00 |
| P05 bandeja + espinha | 41,1 g | 2h08 | 13,00 |
| P06 pedestal | 109,5 g | 3h21 | 33,00 |
| P07 base da balança | 42,7 g | 1h12 | 13,00 |
| P08 plataforma | 70,8 g | 1h39 | 22,00 |
| P09 espaçador | 1,5 g | 11 min | 0,50 |
| P10 chapéu | 31,7 g | 1h11 | 10,00 |
| P11 gaveta das pilhas | 31,2 g | 50 min | ~9,50 |
| P12 patas (4) | 92,9 g | 3h07 | 29,00 |
| P13 tampas (4) | 41,8 g | 1h19 | 13,50 |
| **Total (19 peças)** | **~610 g** | **~19,5 h** | **~188,50** |

### Estimativa própria (para conferência)

A tabela abaixo é a estimativa do `orcamento_impressao.py`, só de material, sem a mão de obra do impressor.

Estimado pelo `cad/scripts/orcamento_impressao.py` (casca de 1,2 mm + preenchimento).
PETG a R$ 100/kg. "Rápida" = Creality K1 / Ender-3 V3 / Bambu A1 (~18 g/h em PETG);
"comum" = Ender-3 clássica (~9 g/h).

| Peça | Filamento | Preench. | Tempo (rápida) | Tempo (comum) | Custo |
|---|---|---|---|---|---|
| P01 piso do dosador | 32 g | 20 % | 1,9 h | 3,7 h | R$ 3,16 |
| P02 anel + escudo | 44 g | 20 % | 2,6 h | 5,1 h | R$ 4,43 |
| P03 rotor (pás rígidas de 2,4 mm) | 39 g | 40 % | 2,3 h | 4,5 h | R$ 3,88 |
| P04 bica com moldura | 68 g | 20 % | 3,9 h | 7,7 h | R$ 6,83 |
| P05 bandeja + espinha da protoboard | 55 g | 20 % | 3,2 h | 6,3 h | R$ 5,53 |
| P06 pedestal (guarda as pilhas) | 131 g | 20 % | 7,4 h | 14,7 h | R$ 13,13 |
| P07 base da balança | 58 g | 20 % | 3,4 h | 6,6 h | R$ 5,84 |
| P08 plataforma com saia | 94 g | 20 % | 5,4 h | 10,6 h | R$ 9,44 |
| P09 espaçador da célula | 2 g | 40 % | 0,3 h | 0,4 h | R$ 0,23 |
| P10 chapéu (alívio do rotor) | 43 g | 20 % | 2,5 h | 4,9 h | R$ 4,26 |
| P11 gaveta das pilhas (trava por ímãs) | 37 g | 20 % | 2,2 h | 4,3 h | R$ 3,69 |
| P12 patas anti-tombamento (4: TD, TE, FE, FD) | 121 g | 20 % | 7,3 h | 14,1 h | R$ 12,16 |
| P13 tampas do lastro (4) | 48 g | 20 % | 3,2 h | 5,9 h | R$ 4,80 |
| **Total** | **773 g** | | **~46 h** | **~89 h** | **R$ 77** |
| Com 15 % de perdas | 889 g | | | | **R$ 89** |

Energia da impressora: ~0,12 kWh/h → 46–89 h ≈ R$ 6–11 (se o dono cobrar).

**Ordem sugerida:** P03 → P01 → P02 (testar o dosador com a mão), P04, P05, depois P06, P07, P08, P09, P10, P11, P12 (4), P13 (4).
Arquivos: `cad/impressao_v3/` (STL + 3MF, já deitados na posição de impressão; pensados para sair sem suporte — confira no fatiador, o pedestal tem cantos de ~9 mm em balanço no teto da cavidade das pilhas).
