# Passo a passo de montagem — Alimentador v3

Siga **na ordem**. Cada fase tem: o que separar, os passos numerados e um **✅ Confira antes de seguir**.
Não pule os "Confira": eles evitam queimar placa ou ter que desmontar tudo depois.

Referências (abra junto):
- Modelo 3D com fios e furos: `cad/montagem/IoT3D_v3_montagem.FCStd` — abrir pela macro
  `cad/montagem/abrir_montagem.FCMacro` (aplica os nomes dos pinos).
- Imagens: `docs/imagens/` · Peças e parafusos: `docs/componentes.md` · Mapa furo a furo e fios: `docs/montagem.md` §12.

**Tempo total estimado:** 6–9 h de montagem (fora a impressão), em 2–3 encontros.
**Pessoas:** dá para dividir — Fases 2–3 (mecânica) em paralelo com a Fase 4 (eletrônica).

---

## Fase 0 — Antes de começar (30 min)

**Separe tudo** (`docs/componentes.md`): eletrônica, peças impressas P01–P13 (19 arquivos: 4 patas e 4 tampas), tubo, cap, parafusos.

**Ferramentas:** ferro de solda + estanho, alicate de corte, desencapador (ou estilete), chave Phillips média e
fina (#0), multímetro, furadeira + brocas 3,5 e 8 mm, micro-retífica ou serra tico-tico, lima/lixa, fita crepe,
régua/trena, caneta permanente, cola quente, fita dupla-face de espuma, abraçadeiras.

**Regras de segurança:**
- Nunca ligue a fonte com a chave geral ligada enquanto estiver mexendo nos fios.
- Nunca ligue USB e fonte/pilhas ao mesmo tempo.
- Ajuste o regulador para 5,0 V **antes** de conectar a ESP32 (Fase 4.1).

✅ **Confira:** todas as 19 peças impressas sem rebarba nos furos; servo é o **de rotação contínua (360°)**;
suporte de pilhas é o **chato** (1 camada).

---

## Fase 1 — Preparar as peças impressas (30 min)

1. Remova suportes/rebarbas. Passe a broca de **2,5 mm na mão** nos furos-guia (eles recebem os parafusos M3).
2. Passe a broca de **3,5 mm na mão** nos furos de passagem: aba do braço da base (P07), moldura da bica (P04).
3. **Rotor (P03):** confira as 6 pás curvas — inteiras, sem rachadura na raiz. Elas são **rígidas** (2,4 mm), não
   devem dobrar. **Chapéu (P10):** sem rebarba, arestas lisas; os 2 pinos entram nos furos do escudo.
4. **Teste a seco do dosador:** encaixe P02 (anel) sobre P01 (piso) pelos **3 pinos** (só entra numa posição).
   Ponha o rotor dentro: ele deve girar **livre nos dois sentidos**, sem raspar.

✅ **Confira:** o rotor gira solto; o escudo (setor fechado do anel) fica exatamente em cima da abertura do piso.

---

## Fase 2 — Tubo de PVC (1 h)

Medidas a partir do **fundo** do tubo. Perímetro = 319 mm.

1. Corte o tubo em **640 mm**, no esquadro. Lixe as rebarbas.
2. Enrole fita crepe na região de baixo e risque uma linha vertical: **FRENTE**.
3. Pela fita, medindo o perímetro a partir da FRENTE, marque as linhas:
   - **80 mm** para cada lado → **DIREITA** e **ESQUERDA**;
   - **160 mm** → **TRÁS**;
   - **106 mm** para cada lado (pelo lado de trás) → posições de **30°** e **150°**.
4. Marque e fure **Ø3,5 mm**:

   | Furo | Linha | Altura |
   |---|---|---|
   | Pedestal (2) | DIREITA e ESQUERDA | 7,5 mm |
   | Cartucho (3) | TRÁS, 30° e 150° | 190,5 mm |
   | Moldura da bica (2) | 14,6 mm para cada lado da FRENTE | 202,5 mm |

5. **Janela da bica**, centrada na FRENTE: **55,6 mm de largura × de 140,7 a 199,5 mm** de altura.
   - Desenhe o retângulo; fure os 4 cantos com broca de 8 mm;
   - corte entre os furos com micro-retífica ou tico-tico, **por dentro da linha**;
   - acerte com lima até a bica (P04) passar justa.

✅ **Confira:** P04 entra pela janela sem forçar; os 9 furos estão nas alturas da tabela (meça de novo).

---

## Fase 3 — Pedestal (1 h)

Peças: P06, P11 (gaveta), 4 ímãs 6 × 2 mm, jack P4, chave KCD11, botão 12 mm, LED 5 mm, suporte de pilhas, 4 pés, fios.

**Solde antes de montar** (fio flexível, ~25 cm cada, ponta livre com **pino macho** de jumper — corte um jumper
macho-macho ao meio e emende, isolando com termorretrátil ou fita):

| Componente | Terminal | Cor do fio |
|---|---|---|
| Jack P4 | central (+) | vermelho |
| Jack P4 | externo (−) | preto |
| Chave KCD11 | terminal 1 | amarelo |
| Chave KCD11 | terminal 2 | amarelo (marque "SW2" com fita) |
| Botão | terminal 1 | amarelo (marque "BT") |
| Botão | terminal 2 | preto |
| LED | perna longa (anodo) | verde |
| LED | perna curta (catodo) | preto |

1. Cole os **4 pés** nos rebaixos de baixo.
   **Ímãs da gaveta:** encaixe 2 ímãs nos furinhos do rebaixo do pedestal (lado esquerdo) com uma gota de cola
   instantânea. Antes de colar os 2 da aba da gaveta, **encoste cada um no par do pedestal**: o lado que é
   atraído é o que fica virado para fora da aba. Com a polaridade invertida a gaveta seria empurrada para fora.
2. **Jack:** passe por fora pelo furo de trás e aperte a porca **por dentro** (o rebaixo deixa a parede com 2,8 mm).
3. **Chave:** empurre por fora no recorte da lateral direita até travar (clique).
4. **Botão:** passe por fora pelo furo maior da lateral direita; porca **por dentro**.
5. **LED:** por **dentro**, empurre no furo pequeno da lateral direita até a borda encostar; fixe com cola quente.
6. Passe os fios dos componentes da lateral para a **cavidade central**. Os do **jack** sobem pela "chaminé" de
   trás (atrás da gaveta) direto para o tubo; os da célula, mais tarde, pela canaleta e chaminé da frente.
7. **Pilhas:** coloque as 6 AA no suporte (polaridade marcada nele) e o suporte dentro da **gaveta (P11)**, fios
   para cima. O berço é justo: não precisa de fita (se usar, só fita **fina ≤ 0,5 mm** — a de espuma raspa na ponte do
   pedestal). Empurre a gaveta pelo lado esquerdo até os ímãs puxarem.
   Deixe **~15 cm de folga** nos fios do suporte: é o que deixa a gaveta sair sem desligar nada.

✅ **Confira (multímetro):** com a fonte na tomada, entre o fio vermelho e o preto do jack → **~12 V**; nas pilhas
→ **~9 V**. Chave: continuidade só quando ligada. Botão: continuidade só quando apertado.

---

## Fase 4 — Eletrônica na bancada (2–3 h)

Faça tudo **fora do tubo**, com a protoboard já colada na espinha da bandeja (P05). Use o modelo 3D
(grupos "4 Protoboard" e "5 ESP32 e HX711") e a tabela `docs/montagem.md` §12.

**Orientação da protoboard:** em pé, furos para a **frente**, **coluna 1 embaixo**, fileiras **a–e à esquerda**.
Trilhos: esquerda **+5V (vermelho)** e **GND (azul)**; direita **GND (azul)** e **+3V3 (vermelho)**.

### 4.1 Ajustar o regulador (antes de tudo!)
1. Solde 4 pinos (de barra de pinos) nos furos **IN+, IN−, OUT+, OUT−** do MP1584, virados para trás.
2. Ligue só o MP1584 na fonte 12 V (IN+/IN−). Gire o trimpot até o multímetro marcar **5,00 V** em OUT+/OUT−.
3. Desligue.

### 4.2 Colar a protoboard
1. Tire o papel do verso da MB-102 e cole na espinha, apoiada no batente de baixo, furos para fora.
2. Reforce com 2 abraçadeiras pelos rasgos da espinha.

### 4.3 Componentes (encaixe nos furos exatos)
1. **D1** 1N5819: **c3 → c7**, faixa cinza em **c7**.
2. **D2** 1N5819: **d11 → d7**, faixa em **d7**.
3. **R1** 100 kΩ: **g3 → g7**.
4. **R2** 22 kΩ: **h7 → trilho GND da direita**, coluna 7.
5. **C1** 100 nF: **i7 → trilho GND da direita**, coluna 9.
6. **R3** 100 kΩ: **g11 → g15**.
7. **R4** 27 kΩ: **h15 → trilho GND da direita**, coluna 15.
8. **C2** 100 nF: **i15 → trilho GND da direita**, coluna 16.
9. **R5** 220 Ω: **b13 → b17**.
10. **MP1584:** IN+ em **c19**, IN− em **h19**, OUT+ em **c27**, OUT− em **h27** (atravessa o canal do meio).
11. **HX711:** os 4 pinos na fileira **j**: GND **j29**, DT **j30**, SCK **j31**, VCC **j32**; a placa fica
    para fora, à direita.
12. **470 µF:** perna + no trilho **+5V**, perna − (faixa) no trilho **GND da esquerda**, coluna 55.
13. **Conector do servo** (barra de 3 pinos macho): **c60, c61, c62**.

### 4.4 Jumpers na protoboard
| # | De | Para | Cor |
|---|---|---|---|
| 7 | e3 | f3 | laranja |
| 8 | e11 | f11 | laranja |
| 9 | j19 | trilho GND dir. col. 21 | preto |
| 10 | j27 | trilho GND dir. col. 25 | preto |
| 11 | a27 | trilho +5V col. 27 | vermelho |
| 12 | trilho GND esq. col. 3 | trilho GND dir. col. 3 | preto |
| 16 | f32 | trilho +3V3 col. 37 | laranja |
| 17 | f29 | trilho GND dir. col. 25 | preto |
| 22 | a60 | trilho GND esq. col. 57 | preto |
| 23 | b61 | trilho +5V col. 58 | vermelho |

✅ **Confira (multímetro, tudo desligado):**
- entre trilho +5V e GND → **não** pode dar curto (bip). Deve marcar alta resistência;
- entre trilho +3V3 e GND → sem curto;
- GND esquerdo e GND direito → **com** continuidade.

### 4.5 ESP32 (colada de cabeça para baixo)
1. **Antes de colar**, com caneta, marque no lado de **baixo** da placa os pinos usados (os nomes só estão
   impressos em cima): **VIN, GND (ao lado do VIN), 3V3, D18, RX2/16, D4, D34, D35, D23, D22**.
2. Cole **2 camadas** de fita dupla-face de espuma sobre a blindagem metálica do módulo.
3. Cole a ESP32 de **cabeça para baixo** sobre a protoboard, entre as colunas ~37 e 57, **antena para cima** e
   **USB para baixo**. Os pinos ficam apontando para você.
4. Ligue os jumpers **fêmea** direto nos pinos:

| # | Pino ESP32 | Vai para | Cor |
|---|---|---|---|
| 13 | VIN | trilho +5V col. 39 | vermelho |
| 14 | GND (ao lado do VIN) | trilho GND esq. col. 40 | preto |
| 15 | 3V3 | trilho +3V3 col. 38 | laranja |
| 18 | RX2/16 | g30 (HX711 DT) | verde |
| 19 | D4 | g31 (HX711 SCK) | azul |
| 20 | D34 | j15 (divisor das pilhas) | roxo |
| 21 | D35 | j7 (divisor da fonte) | cinza |
| 24 | D18 | e62 (sinal do servo) | branco |
| 26 | D23 | b1 (botão) | amarelo |
| 28 | D22 | a13 (resistor do LED) | ciano |

### 4.6 Primeiro teste na bancada (sem servo, sem célula)
1. Ligue os fios do pedestal provisoriamente (Fase 8, passo 2), ou use a fonte direto em a3 / GND.
2. **Chave desligada** → ligue a fonte → **ligue a chave**.
3. Meça: trilho +5V = **5,0 V**; trilho +3V3 = **3,3 V**; em j7 (divisor fonte) ≈ **2,1–2,3 V**; em j15 ≈ **1,9–2,1 V** (pilhas novas).
4. Desligue. Grave o firmware pela USB (chave **desligada**, só USB).

✅ **Confira:** as 4 tensões acima; LED da ESP32 aceso; no monitor serial aparece o boot sem reinícios.

---

## Fase 5 — Cartucho dosador (40 min)

Peças: P01, P02, P03, servo 360°, braço duplo do servo, 2 parafusos do kit, 2 × M2 × 6, parafuso central do kit.

1. **Servo no piso (P01):** por baixo, encaixe o servo com o topo (caixa de engrenagens) pela abertura retangular
   e o **eixo no centro**. Aparafuse as **2 abas** nos apoios com os parafusos do kit.
   - Se as abas não alinharem com os furos, não force: fure no lugar certo com broca de 1,5 mm.
2. **Braço no rotor:** encaixe o braço duplo no rebaixo de baixo do rotor (P03) e prenda com **2 × M2 × 6**
   pelas pontas do braço.
3. **Rotor no servo:** encaixe o rotor (com o braço) no estriado do eixo; aperte o **parafuso central** pelo furo
   do meio do rotor (chave Phillips fina).
4. **Ajuste do "parado":** ligue o servo na protoboard (cabo no conector c60–c62 → marrom em c60) e use o comando
   `servo_trim` até o rotor ficar **totalmente parado** em "parado".
5. **Anel + escudo (P02):** encaixe pelos 3 pinos sobre o piso. Gire o rotor com o dedo: ele **não pode raspar**.

✅ **Confira:** com o firmware, "avançar" e "recuar" giram o rotor suave; parado = parado.

---

## Fase 6 — Cartucho e bica no tubo (30 min)

1. Vire o tubo **de cabeça para baixo**. Empurre o cartucho **pelo fundo**, anel primeiro, saída virada para a
   janela, até os 3 furos de trás coincidirem com os do piso.
2. Aparafuse **3 × M3 × 10** por fora (TRÁS, 30°, 150°).
3. Desvire o tubo. Encaixe a **bica (P04)** por fora, pela janela, até encostar embaixo do piso.
4. Aparafuse **2 × M3 × 8** pela moldura (prendem bica + anel).
5. Deixe o cabo do servo pendurado para o fundo do tubo.

✅ **Confira:** jogue um punhado de ração por cima e gire o rotor pelo firmware: a ração sai **só pela bica**.

---

## Fase 7 — Balança (40 min)

Peças: P07, P08, P09, célula 5 kg, 2 × M5/M4 × 16 (lado fixo), 2 × M4/M5 × 16 (lado livre), 3 × M3 × 12 (batentes),
2 × M3 × 12 (braço).

1. **Célula na base:** seta gravada **para baixo**, ponta dos fios para **trás** (lado do pedestal). Prenda a ponta
   de trás no bloco da base com **2 parafusos por baixo** (cabeças no rebaixo).
2. **Espaçador (P09)** na ponta da frente da célula; **plataforma (P08)** por cima, com 2 parafusos **por cima**
   (cabeças no rebaixo).
3. **Batentes:** rosqueie **3 × M3 × 12** nos postes. Regule cada cabeça até ficar **~1 mm** abaixo da plataforma
   (papel dobrado 3 vezes como gabarito).
4. **Fios da célula:** emende ~35 cm de fio 4 vias (mesmas cores) e isole. Passe por baixo da plataforma até o
   braço da base.
5. Aparafuse o **braço** na frente do pedestal (**2 × M3 × 12**) e passe os fios pela canaleta da frente do
   pedestal até a cavidade central.

✅ **Confira:** a plataforma está **solta** (mexa de leve: só a célula a segura); nada encosta na saia.

---

## Fase 8 — Juntar tudo (40 min)

1. **Bandeja no pedestal:** apoie a bandeja (com a protoboard pronta) no degrau interno do pedestal; os fios do
   pedestal sobem pela abertura da frente da bandeja.
2. **Ligue os fios do pedestal** na protoboard:

   | # | Fio | Furo |
   |---|---|---|
   | 1 | Jack vermelho (+) | a3 |
   | 2 | Jack preto (−) | trilho GND esq. col. 4 |
   | 3 | Pilhas vermelho (+) | a11 |
   | 4 | Pilhas preto (−) | trilho GND esq. col. 10 |
   | 5 | Chave terminal 1 | a7 |
   | 6 | Chave terminal 2 ("SW2") | a19 |
   | 25 | Botão amarelo ("BT") | a1 |
   | 27 | Botão preto | trilho GND esq. col. 5 |
   | 29 | LED verde (anodo) | a17 |
   | 30 | LED preto (catodo) | trilho GND esq. col. 15 |

3. **Célula → HX711** (solde nos furos da ponta direita do HX711): vermelho **E+**, preto **E−**, branco **A−**,
   verde **A+**.
4. Prenda os fios com abraçadeiras na espinha, deixando folga.
5. **Tubo:** segure o tubo ~18 cm acima do pedestal, ligue o **cabo do servo** no conector do topo da protoboard
   (**marrom em c60**), e desça o tubo no soquete. A protoboard e a bandeja entram por dentro do tubo.
6. Aparafuse **2 × M3 × 20** nas laterais do pedestal.
7. **Patas (P12 + P13):** em cada pata, encha o bolso com o lastro (porcas/arruelas de aço, ~120 g por pata, ou um
   saquinho de areia), cole a tampa de mesmo nome por cima (fica rente) e cole o pé de borracha na ponta. Encoste
   cada pata no seu lugar — **TD** trás-direita, **TE** trás-esquerda, **FE** frente-esquerda, **FD** frente-direita
   (o nome está no arquivo; marque com caneta ao tirar da impressora) — e aperte **2 × M3 × 12** em cada aba.

✅ **Confira:** nenhum fio preso entre o tubo e o pedestal; o tubo está assentado no soquete; a gaveta abre e fecha
entre as patas; a plataforma da balança não encosta em nenhuma pata; o alimentador não balança (os 8 pés tocam a mesa).

---

## Fase 9 — Ligar, calibrar e testar (40 min)

1. Chave desligada → fonte na tomada → liga a chave. LED do pedestal pisca devagar (sem Wi-Fi).
2. Conecte o celular na rede **"Alimentador-XXXXXX"** com a **senha da etiqueta** (`PORTAL_PASS`) e escolha o Wi-Fi da casa.
3. No app: parear → **calibrar a balança** (plataforma vazia → peso conhecido → vasilha vazia).
4. **Calibrar a bateria** com o multímetro (tensão das pilhas).
5. Coloque a vasilha, encha o reservatório (Fase 10) e faça **5 refeições de 20 g**, conferindo no app.
6. Tire a fonte da tomada: o app deve mostrar **"usando pilhas"**; recoloque.

✅ **Confira:** erro das 5 doses ≤ 3 g; nenhum reinício; app mostra bateria, nível de ração e vasilha.

---

## Fase 10 — Fechar e usar

1. Encha o tubo com ração até ~2 cm da borda e encaixe o **cap**.
2. No app, toque **"Reabasteci"**.
3. Programe os horários.

Uso diário, limpeza, troca de pilhas e problemas: `docs/montagem.md` §9–11.
