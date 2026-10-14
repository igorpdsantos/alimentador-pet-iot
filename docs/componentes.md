# Componentes — lista de compras e especificações (v3)

Tudo o que vai no alimentador: **o que comprar, quantos, com que medida, carga e resistência**, o que serve como
alternativa e o que **não** comprar. Preços: `docs/orcamento.md`. Montagem: `docs/montagem.md` e `docs/passo_a_passo.md`.

> **Legenda de confiança das medidas**
> ✅ norma ou consenso entre vários fabricantes · ⚠️ medida típica de anúncio — **conferir com paquímetro quando a
> peça chegar**. Se diferir, mude o parâmetro indicado (no topo de `cad/scripts/gerar_v3.py`) e gere de novo.
>
> **"Reserva"** = quantidade extra recomendada (peça pequena que some, queima ou espana). Já está somada em "Comprar".

---

## 0. Checklist de compra (resumo)

| # | Item | Especificação curta | Usa | Comprar |
|---|---|---|---|---|
| E1 | Placa ESP32 | DOIT ESP32 DevKit V1, **30 pinos**, ESP32-WROOM-32 | 1 | 1 |
| E2 | Cabo USB de dados | micro-USB (ou o conector da placa), **com dados** | 1 | 1 |
| E3 | Célula de carga | barra **5 kg**, 75–80 × 12,7 × 12,7 mm, 4 fios | 1 | 1 |
| E4 | Módulo HX711 | 24 bits, verde, de preferência **com blindagem metálica** | 1 | 1 |
| E5 | Servo | **MG90S 360°** (rotação contínua, engrenagem de metal) | 1 | 1 |
| E6 | Fonte | **12 V ≥ 1 A**, plugue **P4 5,5 × 2,1 mm centro positivo** | 1 | 1 |
| E7 | Jack P4 de painel | fêmea **5,5 × 2,1 mm**, rosca **M8** com porca | 1 | 1 |
| E8 | Diodo Schottky | **1N5819** (1 A / 40 V), DO-41 | 2 | 4 |
| E9 | Chave liga/desliga | gangorra mini **KCD11**, 2 pinos, recorte 13,5 × 9 mm | 1 | 1 |
| E10 | Step-down | módulo mini **MP1584EN** ajustável | 1 | 2 |
| E11 | Pilhas | **AA alcalinas** 1,5 V | 6 | 6 |
| E12 | Suporte de pilhas | **6 × AA lado a lado (1 camada)**, com fios | 1 | 1 |
| E13 | Botão | push-button de painel **12 mm**, momentâneo **NA**, porca | 1 | 1 |
| E14 | LED | **5 mm difuso verde** (ou vermelho/amarelo) | 1 | 2 |
| E15 | Resistores ¼ W 1 % | 100 kΩ (2), 27 kΩ (1), 22 kΩ (1), 220 Ω (1) | 5 | 3 de cada valor |
| E16 | Capacitor eletrolítico | **470 µF ≥ 16 V**, radial, 105 °C | 1 | 2 |
| E17 | Capacitor cerâmico | **100 nF (104)** 50 V | 2 | 5 |
| E18 | Protoboard | **MB-102, 830 pontos**, 165 × 55 × 10 mm | 1 | 1 |
| E19 | Jumpers Dupont 20 cm | 40 macho-macho + 40 macho-fêmea | ~30 | 80 |
| E20 | Fio para a célula | 4 vias, ~40 cm (cabo de rede/alarme) | 1 | 1 |
| E21 | Fio flexível | AWG 22–24, cores variadas, ~3 m no total | — | 1 kit |
| M1 | Tubo PVC | **esgoto série normal DN 100**, DE 101,6 × 1,8 mm, **640 mm** | 1 | pedaço ≥ 65 cm |
| M2 | Cap | **cap esgoto DN 100** (encaixe, sem cola) | 1 | 1 |
| M3 | Vasilha | inox, borda Ø 140–160 mm, altura ≤ 60 mm | 1 | 1 (a do pet serve) |
| M4 | Ímãs | **neodímio N35 ou mais, disco Ø 6 × 2 mm** | 4 | 6 (pacote de 10) |
| M5 | Pés de borracha | adesivos, **Ø 12 mm × 3–5 mm** de altura | 8 (+3 opc.) | 12 |
| M6 | Lastro das patas | **porcas M8 ou arruelas de aço** (~0,5 kg) — ou areia em saquinho | ~0,5 kg | 0,5 kg |
| P1 | Parafuso M3 × 8 | inox, cabeça panela Phillips (DIN 7985) | 2 | 3 |
| P2 | Parafuso M3 × 10 | idem | 3 | 4 |
| P3 | Parafuso M3 × 12 | idem | 13 | 15 |
| P4 | Parafuso M3 × 20 | idem | 2 | 3 |
| P5 | Parafuso M2 × 6 | autoatarraxante, cabeça panela | 2 | 4 |
| P6 | Parafuso da célula | **M4 × 16** e/ou **M5 × 16** (conforme a rosca da célula) | 4 | 4 de M4 + 4 de M5 |
| C1 | Filamento | **PETG 1,75 mm** | ~890 g | 1 rolo de 1 kg |
| C2 | Termorretrátil | Ø 2–3 mm | ~30 cm | 1 m |
| C3 | Estanho | 0,8–1 mm com fluxo | — | 1 tubinho |
| C4 | Cola instantânea | cianoacrilato **gel** (ex.: Super Bonder gel) | ímãs | 1 |
| C5 | Cola quente | bastão 7 mm | LED, fios | alguns bastões |
| C6 | Fita dupla-face | **espuma** (protoboard, HX711) + **fina ≤ 0,5 mm** (opcional, suporte de pilhas) | — | 1 de cada |
| C7 | Abraçadeiras | nylon **2,5 × 100 mm** | ~6 | 10 |

---

## 1. Eletrônica

### E1 · ESP32 DOIT DevKit V1 (30 pinos)
| | |
|---|---|
| Buscar por | "ESP32 DevKit V1 30 pinos" / "ESP32-WROOM-32 DOIT 30 pinos" |
| Medidas | 51,5 × 28,3 mm; altura com pinos ~13 mm ⚠️ (`ESP32`); fileiras a 25,4 mm (na MB-102 sobra 1 furo livre de cada lado) |
| Elétrica | Alimentada por **VIN = 5,0 V** (regulador interno 3,3 V); consumo ~80 mA médio, picos de ~250 mA no Wi-Fi |
| Conversor USB | CP2102 ou CH340 (ambos servem; CH340 pode pedir driver no Windows) |
| **Não comprar** | Versão de **38 pinos** (mais larga, pinagem diferente), ESP32-C3/S3/S2 (outros pinos e ADC), ESP8266 / NodeMCU |
| Onde fica | Protoboard, metade de cima (Z ≈ 83–135 mm), virada para o centro do tubo |

### E2 · Cabo USB
Cabo **de dados** (muitos cabos de carregador só têm os fios de energia e a placa não aparece no PC). Conector
conforme a placa (a DevKit V1 costuma ser **micro-USB**). Só para gravar o firmware; depois a gravação é por Wi-Fi (OTA).

### E3 · Célula de carga 5 kg
| | |
|---|---|
| Buscar por | "célula de carga 5kg barra" / "YZC-131 5kg" |
| Capacidade | **5 kg** nominal, sobrecarga segura 150 % (7,5 kg), ruptura ~200 % ⚠️ — o uso real é ≤ 1 kg (vasilha + ração); os **3 batentes** (parafusos M3 × 12) impedem que um pet em cima da plataforma passe do limite |
| Medidas | **75 ou 80 × 12,7 × 12,7 mm** ⚠️ (o modelo aceita as duas); alumínio; 4 furos roscados **M4 ou M5** (2 em cada ponta) ⚠️ |
| Sinal | ~1,0 mV/V; excitação 3,3 V (pelo HX711); cabo de 4 fios ~20 cm |
| Fios | **Vermelho E+, Preto E−, Verde A+, Branco A−** (se o peso der negativo, troque A+ e A−) |
| **Não comprar** | Célula de 1 kg (pouco margem para pet apoiando), de 10/20 kg (perde resolução), "meia-ponte" de balança de banheiro (3 fios, precisa de 4 e montagem diferente) |
| Atenção | A seta gravada aponta **para baixo**. O meio da barra (extensômetros, coberto de silicone branco) **não pode encostar** em nada |

### E4 · Módulo HX711
| | |
|---|---|
| Buscar por | "módulo HX711 blindado" (com capinha metálica) — a versão sem blindagem também funciona, mas é mais sensível a ruído |
| Medidas | ~34 × 20 × 4 mm ⚠️ (`HX711`) |
| Elétrica | 2,6–5,5 V (usamos **3,3 V** da ESP32), 24 bits, 10 Hz |
| Pinos | VCC, GND, DT (DOUT), SCK → GPIO 16 e 4; E+, E−, A+, A− → célula |
| Onde fica | **Pé da protoboard**, perto da canaleta da célula (fios curtos = menos ruído); 2 camadas de fita de espuma sobre a blindagem |

### E5 · Servo MG90S 360° (rotação contínua)
| | |
|---|---|
| Buscar por | "servo MG90S 360 graus" / "MG90S rotação contínua". **O anúncio tem que dizer 360° ou "contínua"** |
| Torque | **1,8 kgf·cm** a 4,8 V; 2,2 kgf·cm a 6 V (catálogo). Necessário com o tubo cheio e o chapéu: ~1,3–1,7 kgf·cm (simulação, `specs/03-mecanica.md` §3.1) |
| Velocidade | ~0,10 s/60° a 4,8 V sem carga (~100 rpm) |
| Elétrica | 4,8–6 V (usamos 5,0 V); ~0,2–0,5 A girando, **~0,7 A travado**; PWM 50 Hz: **1500 µs = parado** |
| Medidas | Corpo **22,8 × 12,2 × 22,7 mm**; abas 32,5 mm de ponta a ponta, furos a **27,8 mm** ⚠️; eixo a 5,4 mm do centro do corpo; do fundo ao topo do estriado **31,0 mm** ⚠️ (`SV_*` no gerador) |
| Braço | Use o **braço duplo reto** que vem no kit. Ele encaixa num rebaixo de **36,6 × 6,6 × 2,5 mm** no rotor: o braço precisa ter **≤ 36 mm de comprimento, ≤ 6 mm de largura e ≤ 2 mm de espessura** ⚠️ (`BRACO_SERVO`) |
| Vem junto | Braços, parafuso central do braço, 2 parafusos das abas — **guarde todos** |
| Fios | **Marrom = GND, Vermelho = 5 V, Laranja = sinal**; conector fêmea 3 vias (passo 2,54) |
| **Não comprar** | MG90S **comum (180°, posicional)** — não gira o rotor; **SG90 360°** — engrenagem de plástico e torque (~1,2–1,5 kgf·cm) abaixo do necessário com o tubo cheio; MG996R — não cabe no piso do dosador |

### E6 · Fonte
| | |
|---|---|
| Especificação | **12 V DC, ≥ 1 A** (1–2 A servem), chaveada/estabilizada, bivolt (100–240 V AC) |
| Plugue | **P4 5,5 × 2,1 mm, centro positivo** (símbolo ⊖–◉–⊕ na etiqueta) |
| Consumo real | ~0,3 A no pico do servo (do lado de 12 V) |
| Pode reaproveitar | Fonte de roteador, modem ou fita de LED com **12 V e centro positivo** |
| **Não usar** | Fonte de 9 V (o detector de "falta de energia" fica no limite), > 15 V, plugue 5,5 × **2,5** (não firma no jack 2,1), centro negativo |

### E7 · Jack P4 de painel
| | |
|---|---|
| Buscar por | "jack P4 fêmea painel 5,5 × 2,1 rosca" (ex.: modelo DC-022B ⚠️) |
| Medidas | Corpo roscado **M8** (furo Ø 8 mm, `JACK_D`), rosca ≥ 5 mm de comprimento útil; porca ≤ Ø 13 mm (rebaixo Ø 14 por dentro); parede do pedestal no furo: 3 mm |
| Elétrica | Pino central **2,1 mm** = (+); corpo = (−); 2–3 A |
| Montagem | Entra por fora, porca por dentro; soldar 2 fios (vermelho = centro, preto = corpo) |

### E8 · Diodos 1N5819
Schottky **1 A / 40 V**, queda ~0,45 V, encapsulamento DO-41 (faixa cinza = catodo). Fazem o "OU" entre fonte e pilhas.
Aceita: **1N5817, 1N5818, SB140, SR140/SR160**. **Não usar 1N4007** (queda de ~1 V: as pilhas acabam antes).
Comprar 4 (2 + reserva).

### E9 · Chave KCD11
| | |
|---|---|
| Especificação | Gangorra **mini**, **2 pinos, ON-OFF (SPST)**; 3 A / 250 V AC (sobra: passa ~0,3 A em 12 V) |
| Medidas | Moldura ~15 × 10 mm; **recorte 13,5 × 9 mm** ⚠️ (`CHAVE_RECORTE`); parede do pedestal no recorte: 2,2 mm (encaixa por pressão, travas para parede ≤ 2,5 mm) |
| **Não comprar** | KCD1 grande (21 × 15 mm), chave de 3 pinos ON-ON/ON-OFF-ON, chave com LED de 220 V |

### E10 · Step-down MP1584EN
| | |
|---|---|
| Especificação | Módulo mini **MP1584EN**, entrada **4,5–28 V**, saída ajustável 0,8–20 V, **3 A de pico** (~2 A contínuo), trimpot de ajuste |
| Medidas | ~22 × 17 × 4 mm ⚠️ (`BUCK`), pinos IN+, IN−, OUT+, OUT− (soldar barra de pinos) |
| Ajuste | **5,0 V no multímetro ANTES de ligar a ESP32 e o servo** |
| Por que 2 | O trimpot é minúsculo e quebra fácil; um módulo errado queima a ESP32 |
| **Não comprar** | LM2596 (grande demais para a protoboard dentro do tubo), "buck" fixo de 3,3 V, módulos USB de 5 V sem ajuste |

### E11 · Pilhas
**6 × AA alcalinas** 1,5 V (~2500 mAh). São só **reserva** (no-break): na tomada não gastam. Alcalina perde ~2–3 %/ano parada.
**Não usar recarregáveis NiMH** (6 × 1,2 V = 7,2 V: o step-down precisa de ≥ 6,5 V depois do diodo, então a autonomia
cai muito, e a curva de % do firmware é de alcalina).

### E12 · Suporte de pilhas
| | |
|---|---|
| Especificação | **6 × AA, 1 camada (lado a lado)**, com fios (vermelho/preto); sem tampa e sem chave |
| Medidas | **~89 × 58 × 16 mm** ⚠️ (`PILHAS`). O berço da gaveta tem 89,5 × 59 mm e 1,5 mm de folga em cima |
| Fios | Precisam de **~15 cm de folga** para a gaveta abrir — se vierem curtos, emendar (solda + termorretrátil) |
| **Não comprar** | Suporte de **2 andares** (3 × 2, 31 mm de altura: não cabe), suporte com tampa/chave (maior) |

### E13 · Botão
| | |
|---|---|
| Especificação | Push-button **de painel**, **momentâneo, NA** (normalmente aberto), corpo roscado **M12** com porca; terminais de solda; qualquer corrente (o sinal é 3,3 V) |
| Medidas | Furo **Ø 12 mm** (`BOTAO_D`); parede no furo **2,5 mm**; rosca útil ≥ 6 mm; porca ≤ Ø 16 mm (rebaixo Ø 17 por dentro); cabeça por fora ≤ Ø 18 mm |
| Aceita | Botão metálico 12 mm (antivandalismo) ou de plástico, com ou sem anel |
| **Não comprar** | Botão com trava (liga/desliga), NF, de 16/19 mm, "tactile switch" de placa (não prende na parede) |

### E14 · LED
**LED 5 mm difuso**, cor **verde** (ou vermelho/amarelo), 20 mA, com aba (flange Ø 5,8 mm que trava no furo Ø 5,1).
Com o resistor de 220 Ω e 3,3 V dá ~6 mA (bom brilho). **Azul ou branco** (Vf ~3 V) ficam fracos com 220 Ω —
se quiser essas cores, troque o resistor por **68 Ω**. Entra **por dentro** do pedestal e é fixado com cola quente.

### E15–E17 · Passivos
| Peça | Valor | Qtd | Especificação | Uso |
|---|---|---|---|---|
| Resistor | **100 kΩ** | 2 | ¼ W, filme metálico **1 %** (5 % funciona, mas a leitura da bateria fica menos precisa) | Parte de cima dos 2 divisores |
| Resistor | **27 kΩ** | 1 | idem | Divisor da bateria (GPIO 34) |
| Resistor | **22 kΩ** | 1 | idem | Divisor da fonte (GPIO 35) |
| Resistor | **220 Ω** | 1 | ¼ W 5 % | LED |
| Capacitor eletrolítico | **470 µF** | 1 | **≥ 16 V** (tensão no capacitor: 5 V), radial, 105 °C, Ø 8 × 12 mm ou Ø 10 × 13 mm | 5 V–GND, perto do conector do servo (segura o pico do servo) |
| Capacitor cerâmico | **100 nF** (código **104**) | 2 | 50 V, disco ou multicamada | GPIO 34–GND e GPIO 35–GND (filtra o ADC) |

Um **kit de resistores** sortidos ¼ W costuma ser mais barato do que comprar os 4 valores avulsos.

### E18–E21 · Montagem elétrica
| Peça | Especificação | Observação |
|---|---|---|
| Protoboard | **MB-102, 830 pontos**, 165 × 55 × 10 mm, com fita adesiva no verso | Fica em pé numa "espinha" dentro do tubo. **Não** a de 400 pontos |
| Jumpers | Dupont **20 cm**: 40 macho-macho + 40 macho-fêmea | Os macho-macho cortados ao meio viram as pontas dos fios soldados nos componentes do pedestal |
| Fio da célula | **4 vias, ~40 cm**, de preferência em pares trançados (sobra de cabo de rede: use 2 pares) | Passa pela canaleta da frente do pedestal |
| Fio flexível | **AWG 22–24**, multifilar; cores: vermelho, preto, amarelo, verde | ~8 pedaços de ~25 cm (jack, chave, botão, LED) + emendas das pilhas |

---

## 2. Mecânica comprada

### M1 · Tubo de PVC
| | |
|---|---|
| Especificação | **PVC esgoto série normal DN 100** (NBR 5688), branco — Tigre, Amanco, Krona, Fortlev |
| Medidas | DE **101,6 mm** ✅ × parede **1,8 mm** ✅ → DI **98,0 mm**; cortar **640 mm** no esquadro (comprar pedaço ≥ 65 cm; loja costuma vender barra de 3 m ou 6 m — pergunte por retalho) |
| Por que 640 mm | Requisito **≥ 1,2 kg** de ração mesmo com ração leve (0,45 kg/L): 3,0 L úteis → 1,22 kg (ração leve) a ~1,6 kg (ração densa). Verificado no gerador (`CAP_MIN_KG`) |
| Folga crítica | O cartucho tem **Ø 97,4 mm**: o tubo precisa de **DI ≥ 97,8 mm** — meça antes de cortar |
| **Não comprar** | Série **reforçada** (parede mais grossa: o cartucho não entra), PVC **soldável marrom** (água fria: DE 110 mm), tubo de 100 mm de outras normas sem conferir o DI |
| Peso | ~0,5 kg (640 mm) |
| Furação | 9 furos Ø 3,5 + janela da bica — `docs/passo_a_passo.md` Fase 2 e `cad/furos_tubo_v3.txt` |

### M2 · Cap
**Cap esgoto DN 100 série normal**, só **em cima**, só encaixado (sem cola: abre para reabastecer). ~Ø 108 × 45 mm ⚠️.
O fundo do tubo entra no soquete do pedestal (não leva cap).

### M3 · Vasilha
| | |
|---|---|
| Especificação | Inox, fundo plano |
| Medidas | Borda **Ø 140–160 mm**, altura **≤ 60 mm**, fundo de ~Ø 125 mm (assenta nos sulcos Ø 100/110/120 da plataforma) |
| Por quê | Mais alta que 60 mm encosta na bica (a saída fica 10,8 mm acima da borda de 60 mm); mais estreita que 140 mm a ração cai fora |
| Peso | Qualquer vasilha comum (≤ 0,5 kg); a balança desconta o peso da vasilha vazia |
| Exemplo | Chalesco inox 15 × 3,5 cm |

### M4 · Ímãs (trava da gaveta das pilhas)
| | |
|---|---|
| Especificação | **Neodímio, grau N35 a N52, disco Ø 6 × 2 mm**, niquelado (tolerância ±0,1 mm) |
| Força | ~0,5–0,9 kg de atração cada, encostado ⚠️ (depende do grau). Com 1,2 mm entre os pares a gaveta segura ~0,5 kg e abre fácil com o dedo |
| Onde | 2 no rebaixo do pedestal (lado esquerdo) e 2 nas pontas da aba da gaveta, em alojamentos **Ø 6,3 × 2,8 mm** (`IMA_D`, `IMA_H`) |
| Fixação | **Cola instantânea gel** (ou epóxi 5 min) no fundo do alojamento. **Polaridade:** colar os 2 do pedestal; encostar cada ímã da gaveta no seu par — o lado atraído fica **virado para fora** da aba |
| **Não comprar** | Disco 6 × **3** mm (não cabe: alojamento de 2,8 mm), ímã de **ferrite** (preto, fraco), ímã com furo |
| Segurança | Ímã de neodímio engolido é perigoso (pets e crianças): os da gaveta ficam atrás de 1 mm de plástico; os do pedestal só aparecem com a gaveta aberta — **colar bem e conferir de vez em quando** |

### M5 · Pés de borracha
Adesivos (tipo "bumpon"), **Ø 12 mm**, **3–5 mm de altura** — **todos da mesma altura** (o pedestal e as patas têm que
apoiar juntos). 4 no pedestal e 1 na ponta de cada pata (rebaixos Ø 12 × 1,5 mm) — **obrigatórios**: a gaveta das
pilhas fica só 0,3 mm acima do fundo do pedestal e os pés dão a folga para ela não arrastar na mesa.
3 na base da balança (opcional; sem eles, use 3 gotas de cola quente).

### M6 · Lastro das patas
| | |
|---|---|
| O que é | Peso no fundo das 4 patas: abaixa o centro de massa e aumenta o peso que segura o alimentador em pé |
| Quanto | Os 4 bolsos somam **123 mL**: cabem **~490 g de aço** (porcas M8 ou arruelas lisas M8/M10 de aço zincado) ou **~185 g de areia** seca num saquinho fechado |
| Efeito | Com ~0,5–0,6 kg de aço: tomba com **~6,3 N (~640 g) no topo** ou inclinando **27°**; só com areia, ~5,7 N |
| Fixação | Encher o bolso, cobrir com a tampa P13 (rente ao topo) e colar a tampa com cola instantânea gel ou quente nas bordas |
| **Não usar** | Chumbo (chumbada de pesca: tóxico), ímãs, pilhas velhas, nada que possa vazar |

---

## 3. Parafusos e fixação — lista completa

**Padrão:** parafusos de máquina **M3 (passo 0,5 mm), inox A2, cabeça panela Phillips (DIN 7985 / ISO 7045)** —
cabeça Ø ~5,5–6 mm × ~2,4 mm. Rosqueiam direto no plástico: as peças têm **furo-guia Ø 2,6 mm** e o parafuso abre a
rosca na primeira vez (aperte devagar, sem forçar; não aperte de novo com força, para não espanar). Nos furos de
**passagem** (PVC Ø 3,5; abas Ø 3,4) o parafuso só atravessa. **Comprimento = do lado de baixo da cabeça até a ponta.**

| Junta | Parafuso | Usa | Atravessa → rosqueia em | Carga |
|---|---|---|---|---|
| A. Cartucho (piso) ↔ tubo | **M3 × 10** | 3 | Tubo PVC 1,8 mm (furo Ø 3,5) → ressalto do piso P01 (~8 mm de rosca) | Segura cartucho + rotor + parte do peso da ração (≤ ~1 kg, dividido em 3) |
| B. Moldura da bica ↔ tubo ↔ anel | **M3 × 8** | 2 | Moldura P04 3 mm (Ø 3,4) → tubo (Ø 3,5) → parede do anel P02 | Trava bica **e** anel do escudo; carga mínima |
| C. Tubo ↔ pedestal | **M3 × 20** | 2 | Parede do pedestal P06 (rosca no plástico, ~19 mm) → ponta entra no furo Ø 3,5 do tubo como pino (laterais, az 0° e 180°) | Impede o tubo de girar/subir; o peso do tubo apoia no degrau, não no parafuso |
| D. Base da balança ↔ pedestal | **M3 × 12** | 2 | Aba do braço P07 4 mm (Ø 3,4) → frente do pedestal (~8 mm de rosca) | Alinha a vasilha com a bica |
| E. Batentes de sobrecarga | **M3 × 12** | 3 | Rosqueados no topo dos postes da base P07 (furo Ø 2,8); a **cabeça** é o batente (~1 mm abaixo da plataforma) | Recebem o peso de um pet que pise na plataforma (protegem a célula) |
| F. Servo ↔ piso | **2 do kit do servo** (autoatarraxantes ~M2) | 2 | Abas do servo → apoios do piso (furo-guia Ø 1,6) | Torque de reação do servo (≤ 1,8 kgf·cm) |
| G. Braço do servo ↔ rotor | **M2 × 6 autoatarraxante**, cabeça panela | 2 | Furos das pontas do braço duplo → rebaixo do rotor P03 (furo-guia Ø 1,6) | Transmitem o torque do servo ao rotor |
| H. Braço ↔ eixo do servo | **Parafuso central do kit do servo** | 1 | Pelo furo Ø 5,2 do centro do rotor (chave Phillips fina #0) | Segura o rotor no eixo |
| I. Célula ↔ base (ponta fixa) | **M4 × 16** ou **M5 × 16** (igual à rosca da célula) | 2 | Por baixo da base, pelo rasgo de 5,4 mm (~8 mm de aperto + ~8 mm na célula); cabeça num rebaixo de 10 mm de largura × 3 mm | Peso total sobre a balança (≤ 1 kg em uso) |
| J. Célula ↔ plataforma (ponta livre) | **M4 × 16** ou **M5 × 16** | 2 | Por cima da plataforma → espaçador P09 → célula (~7 mm na célula); cabeça num rebaixo de 10 × 3 mm | idem |
| K. Anel do escudo ↔ piso | **3 pinos impressos** | — | Encaixe (só entra numa posição) | — |
| L. Chapéu ↔ escudo | **2 pinos impressos** Ø 3 mm | — | Furos Ø 3,4 no topo do escudo; o peso da ração segura | — |
| N. Patas ↔ pedestal | **M3 × 12** | 8 (2 por pata) | Aba da pata 3 mm (Ø 3,4) → parede do pedestal (furo-guia Ø 2,6, ~9 mm de rosca em plástico maciço — conferido no gerador) | Seguram o alimentador quando ele é empurrado (tombamento); 2 por pata sobram |
| O. Tampas do lastro | **cola** (instantânea gel ou quente) | 4 | Tampa P13 no degrau do bolso da pata | Nenhuma (o lastro apoia no fundo do bolso) |
| M. Gaveta ↔ pedestal | **4 ímãs** (M4 acima) | — | — | ~0,5 kg para abrir |
| Sem parafuso | cap de cima (encaixe), bandeja (apoiada no degrau), protoboard (fita), suporte de pilhas (berço justo na gaveta), chave (pressão), botão e jack (porca), LED (cola quente) | | | |

**Parafusos da célula (I e J):** a rosca da célula (M4 ou M5) só se confirma com a peça na mão — compre **4 de M4 × 16 e 4 de
M5 × 16** e use os que servirem. Prefira **M4**: a cabeça panela (Ø 7,6 × 3,1 mm) cabe no rebaixo. A cabeça panela M5
(Ø 9,5 × 3,8 mm) fica ~0,8 mm para fora: embaixo da base não faz diferença (os pés dão folga), mas em cima da
plataforma use **M5 de cabeça chata escareada (DIN 7991)**. Não precisa de arruela.

**Totais (usa → comprar com reserva):** M3 × 8: 2 → 3 · M3 × 10: 3 → 4 · M3 × 12: 13 → 15 · M3 × 20: 2 → 3 ·
M2 × 6: 2 → 4 · M4 × 16: até 4 → 4 · M5 × 16: até 4 → 4. Dica: um **kit sortido M3 inox** (6–20 mm) resolve quase tudo.

---

## 4. Consumíveis

| Item | Especificação | Para quê |
|---|---|---|
| Filamento | **PETG 1,75 mm** (±0,03), 1 rolo de **1 kg** (o projeto usa ~695 g com perdas); de preferência **natural ou de cor clara, sem carga** (glitter, madeira, fibra de carbono) — as peças P01–P03 e P10 tocam a ração | Todas as peças impressas |
| Estanho | 0,8–1 mm com fluxo (60/40 ou sem chumbo) | Jack, chave, botão, LED, pinos do MP1584, emendas |
| Termorretrátil | Ø 2–3 mm, ~1 m | Isolar as emendas |
| Cola instantânea | Cianoacrilato **gel** (escorre menos) | Ímãs |
| Cola quente | Bastão fino (7 mm) | LED, prender fios |
| Fita dupla-face de espuma | ~1 mm (tipo 3M) | Protoboard na espinha (reforço), 2 camadas sobre o HX711 |
| Fita dupla-face fina | **≤ 0,5 mm** — opcional | Suporte de pilhas na gaveta. **Não use a de espuma aqui**: ela come a folga de 1,5 mm sob a ponte do pedestal |
| Abraçadeiras | Nylon **2,5 × 100 mm**, ~10 | Protoboard na espinha (rasgos), organizar fios |
| Fita crepe, lixa 120/220 | — | Marcar o tubo; tirar rebarbas |

---

## 5. Ferramentas

| Ferramenta | Medida / detalhe | Uso |
|---|---|---|
| **Paquímetro** | qualquer (digital ajuda) | Conferir as medidas ⚠️ (tubo, servo, célula, pilhas, jack) **antes de imprimir** |
| Furadeira + brocas | **1,5 / 2,5 / 3,5 / 8 mm** | 1,5: furo do servo se não alinhar; 2,5 (na mão): limpar furos-guia M3; 3,5: furos do PVC e de passagem; 8: cantos da janela da bica |
| Micro-retífica ou serra tico-tico | disco de corte / lâmina fina | Janela da bica no tubo |
| Lima e lixa | — | Acertar a janela da bica |
| Chaves Phillips | **#0** (fina) e **#1/#2** | #0: parafuso central do servo e M2; #1/#2: M3/M4/M5 |
| Ferro de solda | 30–60 W, ponta fina | Ligações do pedestal, MP1584, emendas |
| Multímetro | qualquer | Ajustar o MP1584 em 5,0 V; conferir fonte, pilhas e divisores |
| Alicate de corte e desencapador | — | Fios |
| Isqueiro ou soprador | — | Termorretrátil |
| Trena/régua, caneta permanente | — | Marcar o tubo |

---

## 6. Peças impressas

| Peça | Arquivo | Medidas na mesa | Filamento | Observação |
|---|---|---|---|---|
| P01 piso do dosador | `P01_piso_dosador` | 97 × 94 × 14 | 32 g | Imprime com o topo na mesa |
| P02 anel + escudo | `P02_anel_escudo` | 97 × 97 × 39 | 44 g | De cabeça para baixo (topo do escudo na mesa); os 3 pinos ficam para cima |
| P03 rotor | `P03_rotor` | 81 × 88 × 42 | 39 g | Em pé, 40 % de preenchimento; pás rígidas de 2,4 mm |
| P04 bica | `P04_bica` | 123 × 95 × 55 | 68 g | Deitada de lado |
| P05 bandeja + espinha | `P05_bandeja_espinha` | 97 × 173 × 97 | 55 g | Espinha deitada |
| P06 pedestal | `P06_pedestal` | 140 × 140 × 38 | 130 g | Fundo na mesa, sem suporte; a ponte de ~64 mm sobre o vão da gaveta pode ceder até ~1 mm (a gaveta tem 1,5 mm de folga em cima) |
| P07 base da balança | `P07_base_balanca` | 124 × 137 × 30 | 58 g | Fundo na mesa |
| P08 plataforma | `P08_plataforma` | 136 × 136 × 32 | 94 g | De cabeça para baixo (topo liso na mesa) |
| P09 espaçador | `P09_espacador` | 16 × 27 × 6 | 2 g | 40 % |
| P10 chapéu | `P10_chapeu` | 97 × 119 × 70 | 43 g | Deitado sobre o telhado; suporte só sob a base da cumeeira (2 pinos) |
| P11 gaveta das pilhas | `P11_gaveta_pilhas` | 117 × 83 × 29 | 37 g | Fundo na mesa, sem suporte |
| P12 patas (4) | `P12_pata_TD`, `_TE`, `_FE`, `_FD` | ~115 × 105 × 20 (TD, a maior) | 121 g (as 4) | Fundo na mesa, sem suporte. TD = trás-direita, TE = trás-esquerda, FE = frente-esquerda, FD = frente-direita — **cada uma só encaixa no seu lugar** |
| P13 tampas do lastro (4) | `P13_tampa_TD` … `_FD` | ~107 × 101 × 2 (TD) | 48 g (as 4) | Planas, deitadas; cada tampa é da pata de mesmo nome |

Arquivos em `cad/impressao_v3/` (STL e 3MF). Material: **PETG**, camada 0,2 mm, 3–4 perímetros, 20 % de
preenchimento (P03 e P09: 40 %). Total ~773 g (~890 g com 15 % de perdas).

---

## 7. Pinagem e ligações (resumo)

| De | Para | Fio sugerido |
|---|---|---|
| Jack P4 (+) | 1N5819 (anodo) → catodo → chave KCD11 | vermelho |
| Pilhas (+) | 1N5819 (anodo) → catodo → mesma chave | vermelho |
| Chave (saída) | MP1584 IN+ | vermelho |
| Jack (−), Pilhas (−) | GND comum (trilho azul da protoboard) | preto |
| MP1584 OUT+ (5,0 V) | Trilho vermelho (5 V) → ESP32 **VIN** e servo (vermelho) | vermelho |
| MP1584 OUT− | GND comum | preto |
| 470 µF | 5 V (+) / GND (−), perto do servo | — |
| Servo laranja | ESP32 **GPIO 18** | laranja |
| ESP32 **3V3** | HX711 VCC | — |
| HX711 DT / SCK | ESP32 **GPIO 16 / GPIO 4** | — |
| Célula vermelho/preto/verde/branco | HX711 E+ / E− / A+ / A− | 4 vias trançado |
| Pilhas (+) antes do diodo | 100 kΩ → nó → 27 kΩ → GND; nó → **GPIO 34** + 100 nF | — |
| Jack (+) antes do diodo | 100 kΩ → nó → 22 kΩ → GND; nó → **GPIO 35** + 100 nF | — |
| Botão | **GPIO 23** ↔ GND | — |
| LED | **GPIO 22** → 220 Ω → anodo (perna longa); catodo → GND | — |

Esquema completo em `specs/02-hardware.md` §3; mapa furo a furo em `docs/montagem.md` §5.

---

## 8. Riscos e pontos em aberto

- **Tombamento:** com o tubo de 640 mm cheio o alimentador tem ~67 cm de altura. Sem as patas, um empurrão de ~3 N
  (~300 g) no topo derrubava; **com as 4 patas P12 e ~0,5 kg de lastro de aço: ~6,3 N (~640 g) ou 27° de inclinação**
  (D18). Estimativa de mão (massas estimadas) — conferir na bancada empurrando o topo com um dinamômetro/balança de mão.
- **Densidade da ração:** a capacidade de 1,2 kg considera ração leve (0,45 kg/L). Pese 1 L da ração do pet e atualize
  `RHO_RACAO_MIN` no gerador, se quiser o número exato.
- **Medidas ⚠️:** conferir com paquímetro tubo (DI), servo (abas, altura), célula (comprimento, rosca), suporte de
  pilhas, jack, chave e ímãs **antes de imprimir** as peças que dependem deles (P01, P06, P07, P11).
