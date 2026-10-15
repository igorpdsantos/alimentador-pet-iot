# 03 — Mecânica e modelagem 3D (v3)

## 0. Arquivos

| Arquivo | O que é |
|---|---|
| `cad/scripts/gerar_v3.py` | **Fonte da verdade.** Parâmetros no topo (inclusive medidas de catálogo dos componentes), gera todas as peças e roda ~30 verificações de encaixe/folga |
| `cad/IoT3D_v3.FCStd` | Resultado (`Pxx_*` = imprimir; `REF_*` = comprado, semitransparente) |
| `cad/impressao_v3/` | STL + 3MF prontos para o fatiador |
| `cad/furos_tubo_v3.txt` | Posição de cada furo/janela no tubo (azimute e altura desde o fundo) |
| `cad/scripts/orcamento_impressao.py` | Filamento, tempo e custo por peça → `docs/orcamento.md` |
| `cad/historico/v1/IoT3D.FCStd`, `cad/historico/v2/` (`IoT3D_v2.FCStd`, `gerar_v2.py`) | Versões anteriores (luva com janela + servo 180°). Mantidas como histórico |

Fluxo: mudar parâmetro → `gerar_v3.py` (zero "ERRO") → `preparar_visual.sh` → conferir cortes →
`exportar_para_impressao.py` → `orcamento_impressao.py`. Comandos na skill `freecad-headless`.

## 1. Por que a v3 (o que mudou desde a base)

| Requisito | v1/v2 (luva com janela, servo 180°) | v3 |
|---|---|---|
| À prova de travamento | Janela **corta** o grão ao fechar; servo 180° não "desfaz" | **Rotor de bolsos** com **pás curvas rígidas de 2,4 mm**; servo **360°** inverte o giro quando não cai ração; **chapéu** (P10) tira ~⅔ do peso da coluna de cima do rotor |
| À prova de entupimento | Boca Ø40 → forma "arco" de ração | Entrada = **seção inteira do tubo** (Ø90) + dedos agitadores no cubo |
| Vários tamanhos de grão | Limitado pela janela | Bolso 34 × 24 × 28 mm → grãos de ~4 a 22 mm (gato filhote a cão grande comum) |
| Vários pets | — | Vasilha Ø 14–16 cm × até 6 cm; porções de 5 a 300 g (dose por peso) |
| Tudo coberto | Eletrônica numa caixa grande | Eletrônica **dentro do tubo**, pilhas **dentro do pedestal**, balança **sob a saia** da plataforma |
| Menos impressão | ~13 peças, caixa de 140 × 140 × 94 | **11 peças**, 603 g |
| Custo | — | Cabe no teto de R$ 490 (`docs/orcamento.md`) |

## 2. Sistema de coordenadas e alturas

mm, **Z = 0 na mesa**, tubo centrado em X = Y = 0, **−Y = frente** (vasilha), +Y = trás.

| Nível | Z (mm) |
|---|---|
| Fundo do tubo (apoiado no pedestal) | 21 |
| Protoboard (em pé) | 28 → 193 |
| Servo (corpo) | 194 → 216 |
| Topo do piso do dosador | 222 |
| Topo do escudo / anel | 258 |
| Saída da bica (ponto mais baixo) | 106,5 (10,8 mm acima da borda da vasilha mais alta) |
| Topo do tubo (640 mm) | 662 |

Reservatório: **3,0 L úteis ≥ 1,2 kg** de ração mesmo com ração leve (0,45 kg/L; ~1,6 kg com ração densa) —
requisito "1 kg + 200 g de margem", conferido pelo `gerar_v3.py` (`CAP_MIN_KG`, `RHO_RACAO_MIN`). Altura total ~67 cm,
pegada 14 × 28 cm.

**Tombamento:** com o tubo cheio o centro de massa fica a ~31 cm da mesa. Só com o pedestal (borda a 70 mm do eixo)
um empurrão de ~3 N (~300 g) no topo derrubava; com as **4 patas P12** (§5.1) o apoio vai a ~122 mm e, com ~0,5 kg de
lastro de aço, são **~6,3 N ou 27° de inclinação** (conta automática no `gerar_v3.py`; massas estimadas — conferir).

## 3. Cartucho dosador (dentro do tubo)

```
   corte frontal                         vista de cima do rotor
        ┌── escudo (80°, sobre a saída)       ╭──────────╮
   ║ ▓▓▓▓▓▓▓▓▓▓    ↑ dedos agitadores ║        ╱  ╲ bolso ╱  ╲
   ║ ┌─┬─┬─┬─┬─┐  (giram com o rotor)  ║       │ ◜  ●cubo  ◝ │  pás curvas 2,4 mm
   ║ │ │ │ │ │ │  ← rotor 6 bolsos     ║       │  ◟      ◞   │  (dobram se um
   ║═══════╗ ╔══ piso (saída 60°)     ║        ╲  ╱      ╲  ╱   grão prender)
   ║  servo║ ║→ bica                   ║         ╰──────────╯
```

| Peça | Função | Detalhes |
|---|---|---|
| `P01_piso_dosador` | Fundo do cartucho, segura o servo | Saída de 60° (1 bolso) na frente; abertura para o topo do servo; 2 apoios para as abas (parafusos M2); 3 ressaltos para parafusos pelo tubo (az 30°, 90°, 150°) |
| `P02_anel_escudo` | Parede onde o rotor gira + escudo | Anel Ø90 interno; escudo de 80° e **6 mm** sobre a saída (topo plano, rente à borda do anel, com 2 furos para os pinos do chapéu; o chanfro de entrada é só no anel) com **bordas chanfradas a 45°** (empurram o grão para cima em vez de prensar); chanfro de entrada no topo; 2 parafusos pelo tubo + 2 pela moldura da bica |
| `P03_rotor` | Dosa por bolsos | Cubo Ø40 + 6 **pás curvas rígidas de 2,4 mm**, ponta em R 43,6 (com o servo travado: 3,7 MPa na raiz, 12× abaixo da ruptura do PETG e 3× abaixo do limite de fadiga — não trincam nem soltam lasca na ração; as de 1 mm ficavam a 21 MPa); 2 dedos agitadores Ø6 × 11 mm; rebaixo para o braço duplo do servo; furo Ø5,2 para a chave no parafuso do eixo |
| Servo MG90S 360° | Gira o rotor | Fica embaixo do piso, eixo no centro do tubo; topo da caixa de engrenagens passa pela abertura do piso, coberta pelo cubo |

Folgas verificadas girando 360°: rotor ↔ cartucho ≥ 0,7 mm; servo ↔ bica 7,4 mm; servo ↔ eletrônica 5,9 mm.

### 3.1 Chapéu (`P10_chapeu`) — alívio de carga sobre o rotor

Peça fixa, **apoiada no escudo** (2 pinos Ø3 em furos do escudo, que passou a ter 6 mm) e travada pelo peso da ração;
sai junto com o cartucho pelo fundo do tubo. Parâmetros no topo de `gerar_v3.py` (`ALFA_CH`, `Y_ARESTA`, `H_ARESTA`…).

| Elemento | Medida | Por quê |
|---|---|---|
| Telhado | 3 mm, **55°**, cobre a frente (lado do escudo); aresta de baixo atravessa o tubo em Y = +5, **40 mm acima do escudo** (48 mm acima do rotor) | Segura parte da coluna (efeito Janssen + sombra); 55° > ângulo de atrito da ração → nada fica parado em cima; aresta alta deixa passar grão de 22 mm e não arqueia |
| Cumeeira sobre o escudo | laterais a **45°** partindo da borda do escudo + nervura de 4 mm até o telhado | Fecha o espaço entre escudo e telhado (ração ali ficaria parada envelhecendo). Com parede **vertical** o grão que o chanfro do escudo levanta ficava prensado (DEM: 2,0 kgf·cm); com rampa de 45° ele sobe e escorrega (1,3) |
| Arestas | arredondadas R 1,4; nenhuma parte < 3 mm | Segurança do pet: nada fino que quebre e caia na vasilha |
| Custo | 43 g, 2,5 h, ~R$ 4,30 | Ocupa ~0,07 L do reservatório (já descontado no tubo de 640 mm) |

**Estudo** (`tools/dem_dosador/`, resultados em `docs/estudos/chapeu/`): simulação DEM 3D (grãos = esferas com atrito e
resistência ao rolamento, enchimento despejado pelo topo, rotor a 60 rpm, tubo cheio) + contas de mão (`analitico.py`).

| Grão | Sem chapéu | Cone central Ø60 | Telhado simples | **P10 final** |
|---|---|---|---|---|
| 10 mm: torque mediano / g por volta | 2,9 kgf·cm / 48 g | 0,4 / 43 g | 1,3 / 46 g | **1,3 / 47 g** |
| 20 mm: torque mediano / g por volta | 2,6 / 13 g | **entope** (arco na fresta de 19 mm) | 1,5 / 14 g | **1,7 / 18 g** |

- Servo MG90S 360° trava em ~1,8 kgf·cm; a 60 rpm entrega ~0,7. Com o chapéu ele gira mais devagar, mas gira; sem o
  chapéu, com o tubo cheio, ficaria travando (DEM: pico acima de 1,8 em 94 % do tempo com grão de 10 mm).
- **Esvaziamento** (grão de 10 mm, gira até não sair mais nada): sem chapéu sobram 8,9 g parados, quase todos em
  cima do escudo; **com o P10 sobram 1,2 g (2 grãos) e nada embaixo do chapéu** — a cumeeira resolve a ração
  velha. Com grão de 20 mm os dois casos param com um arco sobre o rotor (~200 g), efeito de esfera rígida, não do
  chapéu; na prática o recuo do firmware desfaz o arco.
- Cone central descartado: bom com grão pequeno, mas entope com grão grande e precisa de hastes finas atravessando a ração.
- **Limites do estudo:** esferas não quebram nem deformam e o rotor da simulação não para — os picos com grão de 20 mm
  vêm do grão prensado na borda do escudo (problema do escudo, não do chapéu; o firmware recua). Densidade e atrito
  da ração são estimativas (0,55 kg/L, μ 0,5 grão-grão, 0,35 grão-plástico). Confirmar em T-JAM/T-FLX com o tubo cheio.

## 4. Bica (`P04_bica`)

- Entra **por fora**, pela janela na frente do tubo, e encosta embaixo do piso do dosador.
- Canal de 50 mm de largura, piso a 45°, queda de 20 mm na entrada; sai em Y = −108, 32 mm para dentro da
  borda da vasilha mais estreita.
- **Moldura** curva (faixas acima e abaixo da janela) esconde o corte do PVC; 2 parafusos M3 atravessam
  moldura + tubo + anel do cartucho (travam tudo junto).
- Imprime deitada de lado (faces laterais planas).

## 5. Eletrônica e pedestal

| Peça | Detalhes |
|---|---|
| `P05_bandeja_espinha` | Disco Ø97 apoiado no degrau do pedestal + "espinha" de 61 × 170 mm onde a **MB-102 (165 × 55 × 10)** é colada em pé (fita dupla-face dela), com batente embaixo e rasgos para abraçadeiras. Componentes viram para o centro do tubo (−Y). ESP32 na parte de baixo da protoboard (Z ~38–90), HX711 e step-down acima (Z ~103–137). Topo da protoboard (193) fica abaixo do servo e longe da bica |
| `P06_pedestal` | Anel Ø140 × 36 com fundo; **cavidade para o suporte chato de 6 AA (89 × 58 × 16)**, aberta no lado esquerdo (−X) e no fundo para a **gaveta P11**; degrau onde apoiam o tubo e a bandeja; soquete do tubo (15 mm, 2 parafusos); lateral direita (+X): **botão Ø12, LED Ø5 e chave KCD11**; traseira: **jack P4**; canaleta na frente para os fios da célula; fios do jack e da célula sobem por "chaminés" atrás/na frente da gaveta (não cruzam o caminho dela); 4 pés |
| `P12_pata_TD/TE/FE/FD` + `P13_tampa_*` | 4 patas anti-tombamento (§5.1) e as tampas dos bolsos de lastro |
| `P11_gaveta_pilhas` | Bandeja do suporte de pilhas que sai pela esquerda (único lado livre: painel à direita, jack atrás, célula na frente); frente com **aba de 4 mm** que assenta num rebaixo da parede (fica rente por fora e é o batente), rasgo para o dedo; folga 0,4 mm nas laterais; batente baixo no fundo puxa o suporte. **Trava: 2 pares de ímãs 6 × 2 mm** (aba ↔ rebaixo, 1,2 mm entre eles, escondidos sob 1 mm de plástico) — nada de plástico flexionando. Fios do suporte com ~15 cm de folga |

Troca de pilhas (raro — elas são reserva): puxar a gaveta P11 pelo lado esquerdo, sem levantar o tubo.
Gravar firmware: pela USB da ESP32 antes de montar; depois **OTA pelo Wi-Fi** (04-firmware).

### 5.1 Patas anti-tombamento (`P12` ×4) e tampas do lastro (`P13` ×4)

| | |
|---|---|
| Por quê | Tubo de 640 mm cheio (D17) → ~67 cm de altura; sem parede para prender (decisão do grupo), a base tinha que crescer |
| Forma | 4 "pétalas" em volta do pedestal, até **138 mm** do eixo; contorno com cantos R 15, topo plano inclinado de **16 mm** (junto ao pedestal) a **7 mm** (ponta), borda de cima arredondada R 3 (núcleo encolhido + offset 3D) |
| Onde | Janelas que deixam livres o **painel** (+X, \|y\| < 30), o **jack** (+Y, \|x\| < 15), o **corredor da gaveta** (−X, \|y\| < 45) e a **saia da plataforma** (3 mm de folga); TD/TE atrás, FE/FD na frente |
| Fixação | Aba vertical de 3 × 20 mm abraçando o pedestal, **2 × M3 × 12** radiais por pata (rosca em plástico maciço, conferido) |
| Lastro | Bolso por baixo da tampa: 123 mL no total → ~490 g de aço (porcas/arruelas) ou ~185 g de areia; tampa P13 de 2 mm, plana, rente ao topo, colada |
| Pés | Rebaixo Ø 12 × 1,5 na ponta de cada pata (mesmo pé do pedestal) |
| Resultado | Apoio a ~122 mm do eixo (antes 70); tomba com ~6,3 N no topo ou 27° (antes ~3 N / 13°) |
| Impressão | 121 g as 4 patas + 48 g as 4 tampas; fundo na mesa, sem suporte |

## 6. Balança

| Peça | Detalhes |
|---|---|
| `P07_base_balanca` | Disco Ø124 com bloco da ponta fixa (rasgo M4/M5), 3 batentes de sobrecarga com parafuso de ajuste, **braço** que aparafusa na frente do pedestal (alinha a vasilha com a bica) |
| `P08_plataforma` | Ø136 com **saia** até 4 mm da mesa (esconde célula e base, barra migalhas); entalhe na saia para o braço; sulcos Ø100/110/120 para centralizar a vasilha |
| `P09_espacador` | Entre a ponta livre da célula e a plataforma |

Célula aceita 75 ou 80 mm, furos M4/M5 (rasgos); meio da célula livre nos dois casos (verificado).
Plataforma + maior vasilha a ≥ 3 mm de tudo (pedestal 6 mm, braço 3 mm, tubo 13 mm, bica 32 mm).

## 7. Tubo — furação

Gerada em `cad/furos_tubo_v3.txt` (azimute: 0° = direita, 90° = trás, 270° = frente; altura desde
o fundo do tubo). Inclui a **janela da bica** (56 × ~59 mm, na frente) e 9 furos Ø3 para parafusos.
Cortar a janela com micro-retífica ou furadeira + serra tico-tico; a moldura esconde rebarbas em cima/embaixo.

## 8. Componentes — medidas usadas no modelo (catálogo)

| Componente | Medidas | Onde fica |
|---|---|---|
| ESP32 DOIT DevKit V1 | 51,5 × 28,3 × 13 | Protoboard, embaixo |
| Protoboard MB-102 | 165 × 55 × 10 | Espinha, em pé |
| HX711 | ~34 × 20 × 4 | Protoboard, em cima |
| Step-down MP1584 | 22 × 17 × 5 | Protoboard, em cima |
| Servo MG90S 360° | 22,8 × 12,2 × 22,7 corpo; abas 32,5 (passo 27,8); eixo a 31 do fundo, 5,4 fora do centro | Sob o piso do dosador |
| Suporte 6 AA chato | 89 × 58 × 16 | Cavidade do pedestal |
| Célula 5 kg | 75–80 × 12,7 × 12,7 | Base da balança |
| Jack P4 / chave KCD11 / botão / LED | Ø8 / 15 × 10 / Ø12 / Ø5 | Pedestal |

Todas são **parâmetros no topo de `gerar_v3.py`**: se a peça comprada vier diferente, mudar o número e regerar.

## 9. Impressão

Ver `docs/orcamento.md`. PETG, 0,2 mm, 3–4 perímetros, 20 % (rotor e espaçador 40 %). Rotor: imprimir em
pé (pás verticais), sem "ironing". Chapéu (P10): sai deitado sobre o telhado; precisa de suporte só sob a base da
cumeeira (face com os 2 pinos).
