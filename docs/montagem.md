# Montagem, uso e manutenção — Alimentador v3

> **Para montar, siga o [passo a passo](passo_a_passo.md)** (fases numeradas com verificações). Este
> documento é a referência: como as peças se encaixam, uso diário, limpeza, troca de pilhas e mapa de ligações.

Modelos e medidas de cada peça: `docs/componentes.md`. Parafusos: `docs/componentes.md` §3.
Imagens de corte: `cad/renders/v3/corte_X0.png` (lateral) e `corte_Y0.png` (frente).

## 1. Visão geral — como as peças se encaixam

```
                    ┌──────┐  cap DN100 (só encaixado) ← abre para reabastecer
                    │      │
                    │ tubo │  reservatório (3,0 L ≥ 1,2 kg)
                    │ PVC  │
                    │ 640  │
             ┌──────┼──────┼── P02 anel + escudo ─┐  cartucho dosador
             │      │ ▒▒▒▒ │   P03 rotor           │  (preso no tubo por
    P04 bica │      ╞══════╡   P01 piso            │   3 + 2 parafusos)
      ◄══════╡      │ servo│                       ┘
   moldura   │      │      │
             │      │ ░░░░ │  P05 bandeja + protoboard em pé
             │      │ ░░░░ │  (ESP32, HX711, regulador)
   vasilha   │    ┌─┴──────┴─┐
  ╲________╱ │    │ P06      │  pedestal: pilhas, chave, botão, LED, jack
  ═plataforma═════╡ pedestal │
   P07 base + célula ─┘─────┘
```

**Princípio:** a eletrônica fica **no pedestal** (bandeja apoiada no degrau dele) e o tubo **encaixa por
cima**. Para mexer na eletrônica ou nas pilhas, solta-se 2 parafusos e levanta-se o tubo; o único fio
entre os dois é o do servo, com conector.

| Encaixe | Tipo |
|---|---|
| Tubo ↔ pedestal | Soquete de 15 mm + 2 parafusos M3 × 20 nas laterais |
| Bandeja ↔ pedestal | Apoiada no degrau interno (dentro do tubo); sem parafuso |
| Anel do escudo ↔ piso | 3 pinos (encaixe orientado: só entra numa posição) |
| Cartucho ↔ tubo | 3 × M3 × 10 (trás) + 2 × M3 × 8 pela moldura da bica (frente) |
| Bica ↔ tubo | Entra por fora pela janela; presa pelos mesmos 2 × M3 × 8 |
| Rotor ↔ servo | Braço duplo do servo no rebaixo do rotor (2 × M2 × 6) + parafuso central |
| Base da balança ↔ pedestal | Braço com aba, 2 × M3 × 12 (alinha a vasilha com a bica) |
| Plataforma ↔ célula | Espaçador + 2 parafusos; a plataforma **não encosta em mais nada** |

## 2. Ferramentas

Chave Phillips média e fina (#0), alicate, **ferro de solda** (jack, chave, botão, LED, pinos do MP1584 e fios da célula), furadeira
com brocas 3,5 e 8 mm, **micro-retífica ou serra tico-tico** (janela do tubo), lixa, fita crepe, régua/trena,
multímetro (ajustar o regulador e calibrar a bateria), cola quente, serra para o PVC.

## 3. Preparar o tubo

Medidas de `cad/furos_tubo_v3.txt`. "Altura" = a partir do **fundo** do tubo.
Perímetro do tubo = 319 mm; **frente** = onde fica a bica (−Y).

1. Cortar **640 mm** no esquadro e lixar as rebarbas.
2. Passar fita crepe em volta e traçar uma linha vertical: **frente**. Medindo pelo perímetro a partir dela:
   - 80 mm para cada lado = **laterais** (direita e esquerda); 160 mm = **trás**;
   - 106 mm para cada lado = posição dos furos a 30° e 150°.
3. Furos de **Ø3,5 mm**:

   | Para quê | Posição | Altura | Qtd |
   |---|---|---|---|
   | Pedestal | laterais (direita e esquerda) | 7,5 mm | 2 |
   | Cartucho (piso) | trás e a 106 mm de cada lado da frente (por trás) | 190,5 mm | 3 |
   | Moldura da bica | 14,6 mm para cada lado da linha da frente | 202,5 mm | 2 |

4. **Janela da bica** (frente, centrada na linha): **55,6 mm de largura × de 140,7 a 199,5 mm de altura**.
   Furar os 4 cantos com broca 8 e unir com micro-retífica ou tico-tico. A moldura da bica cobre as bordas de
   cima e de baixo; as laterais ficam justas (cortar na linha).

## 4. Impressão

Ordem e configurações: `docs/orcamento.md` §3. Depois de imprimir:
- Testar o **giro do rotor** dentro do anel com a mão (P01 + P02 + P03): tem que girar livre nos dois sentidos.
- Limpar rebarbas dos furos-guia com uma broca de 2,5 mm na mão.

## 5. Eletrônica (na bancada, antes de montar)

### 5.1 Ajustar o regulador (obrigatório)
1. Ligar **só** o MP1584 na fonte 12 V.
2. Girar o trimpot até o multímetro marcar **5,0 V** na saída.
3. Só então ligar ESP32 e servo.

### 5.2 Protoboard (de baixo para cima, componentes virados para frente)
```
  topo ┌─────────────────────────┐ Z≈192
       │ conector do servo (3 p) │ ← no TOPO: o cabo do servo (~25 cm) alcança com o tubo erguido 18 cm
       │ 470 µF                  │
       │  ESP32 (VIN, GND, 3V3,  │
       │  GPIO 4,16,18,22,23,    │
       │  34,35)                 │ Z≈83–135
       │ divisores + 100 nF      │
       │ HX711      MP1584       │ Z≈31–65
   pé  └─────────────────────────┘ Z≈26
        ↑ fios do pedestal entram por baixo
```
Ligações: tabela em `docs/componentes.md` §4. Regras:
- **GND comum** em tudo; 5 V só do MP1584 (nunca do pino 3V3).
- O 470 µF fica nos trilhos 5 V/GND, perto do conector do servo.
- O **conector do servo** é um header macho de 3 pinos no **topo** da protoboard: assim ele desconecta para tirar o tubo
  (com o tubo erguido ~18 cm, o topo da protoboard aparece logo abaixo da borda do tubo).
- Fios da célula: trançados (4 vias), ~40 cm, entram pela canaleta da frente do pedestal.

### 5.3 Gravar e testar
1. Chave geral **desligada**, ESP32 na USB, gravar o firmware (`firmware-esp32` skill / `pio run -t upload`).
2. Testar no serial: balança, botão, LED, bateria, servo girando nos dois sentidos.
3. Depois de montado, as atualizações vão **pelo Wi-Fi (OTA)**.

## 6. Montagem final (ordem)

1. **Pedestal:** colar 4 pés; prender **jack** (porca por dentro), **chave** (pressão, de fora), **botão**
   (porca por dentro), **LED** (por dentro, cola quente). Passar os fios para a cavidade central.
2. **Pilhas:** suporte chato dentro da **gaveta (P11)** (berço justo, sem fita ou com fita fina ≤ 0,5 mm), fios para cima com ~15 cm de folga;
   empurrar a gaveta pelo lado esquerdo. Fios do jack sobem pela chaminé de trás; os da célula pela da frente.
3. **Bandeja:** colar a protoboard na espinha (fita do verso) e reforçar com 2 abraçadeiras. Apoiar a bandeja
   no degrau do pedestal, passando os fios pela abertura da frente da bandeja.
4. **Cartucho** (na bancada):
   1. Servo: encaixar por baixo do piso (P01), topo da engrenagem pela abertura, abas nos apoios → 2 parafusos do kit.
   2. Rotor: prender o **braço duplo** no rebaixo de baixo do rotor (2 × M2 × 6); encaixar no eixo do servo e
      apertar o **parafuso central** pelo furo do meio do rotor.
   3. **Calibrar o "parado"** do servo antes de fechar (comando `servo_trim` — §8).
   4. Anel + escudo (P02): encaixar os **3 pinos** no piso. O escudo fica sobre a saída (só entra nessa posição).
   5. **Chapéu (P10):** encaixar os **2 pinos** nos furos do topo do escudo (telhado alto para a frente, aresta
      atravessando o tubo). Fica solto; o peso da ração o segura. Vai junto com o cartucho para dentro do tubo.
5. **Cartucho no tubo:** com o tubo de cabeça para baixo, empurrar o cartucho pelo **fundo** (sem o
   pedestal) até os 3 furos de trás alinharem (servo para o lado do fundo, saída virada para a janela).
   Apertar **3 × M3 × 10**. Deixar o cabo do servo pendurado para o fundo.
6. **Bica:** encaixar por fora, pela janela, até encostar sob o piso; **2 × M3 × 8** pela moldura (prendem
   bica + anel).
7. **Tubo no pedestal:** ligar o **conector do servo** na protoboard, descer o tubo no soquete (a bandeja
   e a protoboard entram por dentro dele) e apertar **2 × M3 × 20** nas laterais.
8. **Balança:**
   1. Célula na base (P07): seta para baixo, ponta fixa no bloco de trás, **2 × M5/M4 × 16 por baixo**.
   2. Espaçador (P09) na ponta da frente da célula, plataforma (P08) por cima: **2 × M4/M5 × 16 por cima**.
   3. Batentes: **3 × M3 × 12** nos postes; regular a cabeça para **~1 mm** abaixo da plataforma (uma folha
      de papel dobrada 3× serve de gabarito).
   4. Aparafusar o braço da base na frente do pedestal (**2 × M3 × 12**). Fios da célula pela canaleta.
   5. Conferir: a plataforma **não pode encostar** em nada (girar levemente com o dedo, tem que estar solta).
9. **Patas (P12) com lastro:** em cada pata, encher o bolso com o lastro (porcas/arruelas de aço ou saquinho de
   areia), colar a tampa P13 de mesmo nome (rente ao topo) e colar o pé de borracha na ponta. Encostar a aba no
   pedestal no seu lugar (TD trás-direita, TE trás-esquerda, FE frente-esquerda, FD frente-direita — cada uma só
   encaixa no lugar dela) e apertar **2 × M3 × 12** por pata. Conferir: a gaveta abre, a plataforma continua solta.
10. **Cap** em cima (só encaixado).

## 7. Primeiro uso (pelo app)

1. Ligar a chave → LED piscando lento → conectar o celular na rede **"Alimentador-XXXXXX"** e escolher o Wi-Fi.
2. Parear no app com o código do aparelho.
3. **Calibrar a balança:** plataforma vazia → peso conhecido (ex.: pacote de 500 g pesado na cozinha) → vasilha vazia.
4. **Calibrar a bateria:** medir as pilhas com multímetro e digitar a tensão.
5. **Ajustar o servo:** `servo_trim` até ele ficar parado de verdade em "parado".
6. Encher o reservatório (§9) e fazer 5 refeições de teste de 20 g conferindo no app.

## 8. Ajustes finos

| O quê | Como |
|---|---|
| Servo "andando" quando deveria parar | App → Ajustes → Servo → ajustar o neutro (1400–1600 µs) |
| Dose passando da meta | Calibração aprende sozinha a vazão; se insistir, diminuir a "velocidade fina" |
| Peso oscilando | Algo encostando na plataforma/saia; fios da célula soltos; batentes altos demais |
| Ração travando muito (T-JAM) | Conferir se o chapéu (P10) está no lugar e o rotor gira livre; com grão > 20 mm, encher só até a metade |

## 9. Uso diário

### Reabastecer
1. Tirar o cap de cima (puxar).
2. Despejar a ração até **~2 cm abaixo da borda**.
3. Fechar e, no app, tocar **"Reabasteci"** (ou segurar o botão do pedestal por 3 s = "enchi até cima").

### Quanto ainda tem de ração (automático)
O alimentador **estima o nível sem sensor extra**, usando a própria balança:

- Toda refeição é **pesada** na vasilha, então o firmware sabe exatamente quantos gramas saíram do reservatório.
- **Restante = carga do reservatório − soma do que foi servido** desde o último "Reabasteci".
- A **carga cheia é aprendida sozinha**: na primeira vez que o reservatório esvaziar (refeição termina em
  `NO_FLOW`), o total servido desde o "cheio" vira a capacidade real para aquela ração (cada ração tem
  densidade diferente). Até lá usa 0,8 kg.
- O app mostra **% restante, gramas e "dura mais ~N dias"** (pela média diária servida) e avisa com
  **20 %** e com **"acabou"** (`NO_FLOW` com estimativa perto de zero).
- Se reabastecer sem encher até o topo, digitar no app quantos gramas colocou.

Custo: zero (só firmware + app). Alternativa com sensor (não incluída no orçamento): sensor de distância a
laser VL53L0X no cap, medindo a altura da ração (~R$ 15–20 + fio externo até o pedestal).

### Limpeza (mensal, ou ao trocar de ração)
1. Esvaziar: no app, "Esvaziar reservatório" (gira até `NO_FLOW` com uma vasilha grande).
2. Soltar os 2 × M3 × 8 da moldura e tirar a bica (lavar com água e sabão; secar bem).
3. Para limpeza completa do cartucho: soltar 3 × M3 × 10, tirar o tubo do pedestal (§10, passos 1–4) e
   empurrar o cartucho para fora pelo fundo.
4. Vasilha inox: lavar todo dia.

## 10. Troca das pilhas

As pilhas são **reserva** (só gastam quando falta energia): o app mostra a % e avisa com 20 %.
Na prática: a cada 2–3 anos, ou depois de quedas de energia longas.

1. Desligar a chave (a fonte pode continuar na tomada).
2. Puxar a **gaveta** pelo lado esquerdo do pedestal (pega no topo da frente). Ela sai inteira com o suporte;
   não precisa virar nem levantar o alimentador.
3. Trocar as 6 pilhas no suporte, empurrar a gaveta de volta até a frente ficar rente.
4. Ligar a chave; calibrar a bateria no app se trocar de marca de pilha.

## 11. Problemas comuns

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| ESP32 reinicia quando o servo gira | Regulador fraco/fora de 5 V, falta o 470 µF | Conferir 5,0 V e o capacitor |
| "Reservatório vazio ou travado" com ração | Grão preso no escudo; pá quebrada | "Destravar" no app; conferir o rotor |
| Peso não muda | Fio da célula solto; A+/A− invertidos | Conferir cores |
| Plataforma mede errado | Algo encostando; batente alto demais | Folga de 1 mm nos batentes; nada tocando a saia |
| Não conecta no Wi-Fi | Rede mudou | Segurar BOOT 10 s → portal "Alimentador-XXXXXX" |

## 12. Montagem 3D detalhada (componentes, fios e furos)

Arquivo: `cad/montagem/IoT3D_v3_montagem.FCStd`. Para abrir **com as texturas** (nomes dos pinos e
furação da protoboard): FreeCAD → **Macro → Macros…** → `cad/montagem/abrir_montagem.FCMacro` → Executar.
Gerado por `cad/scripts/montagem_v3.py` (`m.tudo()`). Imagens em `docs/imagens/`.

Grupos na árvore: 1 Peças impressas (P01–P13) · 2 Comprados (mecânica: tubo, cap, vasilha, ímãs) · 3 Pedestal ·
4 Protoboard · 5 ESP32 e HX711 · 6 Servo · 7 Balança · 8 Fios · 9 Parafusos (todos, inclusive os 8 das patas). Esconda grupos com **Espaço** para ver o que está atrás.

### 12.1 Protoboard MB-102 em pé — o que vai em cada furo

Protoboard **em pé**, com o lado dos furos virado para a **frente** (para a bica). Colunas **1 (embaixo) a 63 (em
cima)**, fileiras **a–e (esquerda)** e **f–j (direita)**. Trilhos: esquerda **+5V** (vermelho, externo) e
**GND** (azul); direita **GND** (azul) e **+3V3** (vermelho, externo).

| Componente | Furos |
|---|---|
| Diodo D1 1N5819 (fonte) | c3 → c7 (faixa em c7) |
| Diodo D2 1N5819 (pilhas) | d11 → d7 (faixa em d7) |
| R1 100 kΩ (marrom-preto-amarelo) | g3 → g7 |
| R2 22 kΩ (vermelho-vermelho-laranja) | h7 → trilho GND direito (col. 7) |
| C1 100 nF | i7 → trilho GND direito (col. 9) |
| R3 100 kΩ | g11 → g15 |
| R4 27 kΩ (vermelho-violeta-laranja) | h15 → trilho GND direito (col. 15) |
| C2 100 nF | i15 → trilho GND direito (col. 16) |
| R5 220 Ω (vermelho-vermelho-marrom) | b13 → b17 |
| Regulador MP1584 (pinos soldados nos 4 cantos) | IN+ c19 · IN− h19 · OUT+ c27 · OUT− h27 |
| HX711 (4 pinos) | GND j29 · DT j30 · SCK j31 · VCC j32 (placa para fora, à direita) |
| ESP32 | **não encaixa**: colada de cabeça para baixo entre as colunas ~37–57, antena para cima |
| Capacitor 470 µF | trilho 5V (+) e trilho GND esquerdo (−), coluna 55 |
| Conector do servo (barra 3 pinos) | c60 (marrom/GND) · c61 (vermelho/5V) · c62 (laranja/sinal) |

### 12.2 Fios (34) — de → para

| # | Cor | De | Para |
|---|---|---|---|
| 1 | vermelho | Jack (pino central +) | a3 |
| 2 | preto | Jack (−) | trilho GND esq. col. 4 |
| 3 | vermelho | Pilhas + | a11 |
| 4 | preto | Pilhas − | trilho GND esq. col. 10 |
| 5 | amarelo | a7 (depois dos diodos) | chave, terminal 1 |
| 6 | amarelo | chave, terminal 2 | a19 (MP1584 IN+) |
| 7 | laranja | e3 | f3 (ponte da fonte) |
| 8 | laranja | e11 | f11 (ponte das pilhas) |
| 9 | preto | j19 (MP1584 IN−) | trilho GND dir. col. 21 |
| 10 | preto | j27 (MP1584 OUT−) | trilho GND dir. col. 25 |
| 11 | vermelho | a27 (MP1584 OUT+) | trilho 5V col. 27 |
| 12 | preto | trilho GND esq. col. 3 | trilho GND dir. col. 3 |
| 13 | vermelho | trilho 5V col. 39 | ESP32 **VIN** |
| 14 | preto | trilho GND esq. col. 40 | ESP32 **GND** (ao lado do VIN) |
| 15 | laranja | ESP32 **3V3** | trilho 3V3 col. 38 |
| 16 | laranja | f32 (HX711 VCC) | trilho 3V3 col. 37 |
| 17 | preto | f29 (HX711 GND) | trilho GND dir. col. 25 |
| 18 | verde | g30 (HX711 DT) | ESP32 **RX2/16** |
| 19 | azul | g31 (HX711 SCK) | ESP32 **D4** |
| 20 | roxo | j15 (divisor pilhas) | ESP32 **D34** |
| 21 | cinza | j7 (divisor fonte) | ESP32 **D35** |
| 22 | preto | a60 (servo GND) | trilho GND esq. col. 57 |
| 23 | vermelho | b61 (servo 5V) | trilho 5V col. 58 |
| 24 | branco | e62 (servo sinal) | ESP32 **D18** |
| 25 | amarelo | botão, terminal 1 | a1 |
| 26 | amarelo | b1 | ESP32 **D23** |
| 27 | preto | botão, terminal 2 | trilho GND esq. col. 5 |
| 28 | ciano | ESP32 **D22** | a13 (resistor 220 Ω) |
| 29 | verde | a17 (resistor 220 Ω) | LED anodo (perna longa) |
| 30 | preto | LED catodo | trilho GND esq. col. 15 |
| 31 | vermelho | célula | HX711 **E+** (solda) |
| 32 | preto | célula | HX711 **E−** (solda) |
| 33 | branco | célula | HX711 **A−** (solda) |
| 34 | verde | célula | HX711 **A+** (solda) |

Fios 1–2 (jack): sobem pela chaminé de trás do pedestal e pelo furo de trás da bandeja, contornando a espinha.
Fios 3–6, 25, 27, 29, 30: saem do pedestal por cima da gaveta e sobem pela abertura da frente da bandeja
(fios das pilhas com ~15 cm de folga para a gaveta abrir).
Fios 31–34: canaleta da frente do pedestal (por baixo da plataforma) → chaminé da frente → abertura da frente da bandeja.
Ligações na ESP32: **jumper fêmea** direto no pino (a placa está colada ao contrário — marque com caneta os
pinos usados antes de colar, porque os nomes ficam no lado de cima da placa).
