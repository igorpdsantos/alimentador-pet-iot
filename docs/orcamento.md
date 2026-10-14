# Orçamento — Alimentador v3

**Teto: R$ 371** (≈ R$ 46,40 × 8 pessoas; era R$ 320). Preços de referência em lojas brasileiras (Mercado Livre, lojas de
eletrônica e home centers) em outubro/2026; **variam bastante**. A coluna "econômico" assume reaproveitar o
que der (fonte velha de roteador, vasilha do pet, retalho de PVC).

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

**Conclusão:** com teto de R$ 371 dá para comprar **tudo novo, inclusive o servo MG90S 360° (metal)**, na faixa
média (~R$ 345), sobrando ~R$ 26 para imprevistos (peça que queima, reimpressão, frete). No **pior caso** de
todos os preços (~R$ 444) passa ~R$ 73 do teto — aí entram os cortes: fonte reaproveitada (−R$ 20), vasilha do pet
(−R$ 20), lastro de areia (−R$ 15), kit de parafusos que alguém já tenha (−R$ 15) — ainda ~R$ 3 acima: pesquisar preço.
**Não** trocar o servo pelo SG90 360° para economizar (ver D15).
Não cortar: célula/HX711, ESP32, pilhas de reserva (o medidor de bateria é requisito).

**Por pessoa:** ~R$ 34 (econômico), ~R$ 43 (faixa média), ~R$ 56 (pior caso).

## 2. Impressão 3D (PETG)

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
