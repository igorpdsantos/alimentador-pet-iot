// Passos do manual de montagem 3D (fonte única: o site lê daqui e capturar_manual.mjs gera docs/manual/README.md).
// Coordenadas do CAD: mm, Z para cima a partir da mesa, tubo no centro (X = Y = 0), FRENTE (bica, vasilha) = −Y,
// DIREITA (painel: LED, chave, botão) = +X, ESQUERDA (gaveta das pilhas) = −X, TRÁS (jack) = +Y.
//
// Campos de um passo:
//   mostra   seleção que aparece (cinza = já montado; contexto:false mantém as cores reais)
//   novo     [{ sel, de:[dx,dy,dz] }] peças que entram agora (destacadas), animadas a partir do deslocamento "de"
//   fantasma seleção transparente (ex.: o tubo, para ver por dentro)      cor: seleção que fica com a cor real
//   cam      { dir:[x,y,z] (do alvo para a câmera), foco: seleção, alvo:[x,y,z], zoom }
//   rotulos  [{ t, p:[x,y,z] | furo:"c3" | pino:"VIN" | sel:"Nome", o:[dx,dy] px, tipo:"sinal"|"aviso"|"medida" }]
// Seleção: "Nome", "Prefixo*", "@Grupo da montagem", "fio:N" (fio N da tabela de ligações + pontas Dupont).

export const TIPOS = {
  mecanica: { nome: "Mecânica", emoji: "🔧" },
  parafusos: { nome: "Parafusos", emoji: "🔩" },
  eletronica: { nome: "Eletrônica", emoji: "🔌" },
  solda: { nome: "Solda", emoji: "🔥" },
  cola: { nome: "Cola", emoji: "🧴" },
  medir: { nome: "Medir/marcar", emoji: "📏" },
  teste: { nome: "Teste", emoji: "✅" },
};

/* ------------------------------------------------------------------ geometria auxiliar (igual a cad/scripts/montagem_v3.py) */
const PITCH = 2.54;
const LINHAS = { a: -13.97, b: -11.43, c: -8.89, d: -6.35, e: -3.81, f: 3.81, g: 6.35, h: 8.89, i: 11.43, j: 13.97 };
const TRILHO = { "5V": -24.13, GND_E: -21.59, GND_D: 21.59, "3V3": 24.13 };
const Y_FACE = 12;                                      // face da frente da protoboard
const zCol = (c) => 28 + (165 - 62 * PITCH) / 2 + (c - 1) * PITCH;
/** "c19" ou "GND_E@40" → ponto na face da protoboard */
export function furo(ref) {
  if (ref.includes("@")) { const [t, c] = ref.split("@"); return [TRILHO[t], Y_FACE - 1, zCol(+c)]; }
  return [LINHAS[ref[0]], Y_FACE - 1, zCol(+ref.slice(1))];
}
const ESQ = ["EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "GND", "VIN"];
const DIR = ["D23", "D22", "TX0", "RX0", "D21", "D19", "D18", "D5", "TX2", "RX2/16", "D4", "D2", "D15", "GND3", "3V3"];
/** pino da ESP32 (colada de cabeça para baixo: a fileira EN…VIN fica à DIREITA de quem olha) */
export function pinoEsp(nome) {
  const i = ESQ.indexOf(nome), x = i >= 0 ? 12.7 : -12.7, k = i >= 0 ? i : DIR.indexOf(nome);
  return [x, -3.8, zCol(47) + 17.78 - k * PITCH];
}
const HX_ZC = (zCol(29) + zCol(32)) / 2;
const padHx = (n) => [10.47 + 31, 8.3, HX_ZC + 6.35 - ["E+", "E-", "A-", "A+", "B-", "B+"].indexOf(n) * PITCH];

/* ------------------------------------------------------------------ conjuntos */
const PAINEL = ["Jack_P4_*", "Chave_KCD11_*", "Botao_*", "LED_*"];
const PILHAS = ["Suporte_6xAA", "Pilha_AA_*"];
const PEDESTAL = ["P06_pedestal", "P11_gaveta_pilhas", "Imas_neodimio_6x2_gaveta", ...PAINEL, ...PILHAS];
const PROTO = ["Protoboard_MB102", "Protoboard_furacao"];
const DIODOS = ["D1_*", "D2_*"];
const DIV_FONTE = ["R1_*", "R2_*", "C1_*"];
const DIV_PILHAS = ["R3_*", "R4_*", "C2_*"];
const R_LED = ["R5_*"];
const BUCK = ["MP1584_*"];
const HX = ["HX711_*"];
const C470 = ["C3_*"];
const HEADER = ["Header_servo_*"];
const COMPONENTES = [...DIODOS, ...DIV_FONTE, ...DIV_PILHAS, ...R_LED, ...BUCK, ...HX, ...C470, ...HEADER];
const ESP = ["ESP32_*"];
const J_PLACA = [7, 8, 9, 10, 11, 12, 16, 17, 22, 23].map((n) => "fio:" + n);
const J_ESP = [13, 14, 15, 18, 19, 20, 21, 24, 26, 28].map((n) => "fio:" + n);
const F_PED = [1, 2, 3, 4, 5, 6, 25, 27, 29, 30].map((n) => "fio:" + n);
const F_CEL = [31, 32, 33, 34].map((n) => "fio:" + n);
const ELETRONICA = ["P05_bandeja_espinha", ...PROTO, ...COMPONENTES, ...ESP, ...J_PLACA, ...J_ESP];
const SERVO = ["Servo_MG90S_360", "Servo_saida_cabo", "Servo_conector_femea", "Servo_fio_*"];
const CARTUCHO = ["P01_piso_dosador", "P02_anel_escudo", "P03_rotor", "P10_chapeu", "Servo_braco_duplo", ...SERVO];
const BALANCA = ["P07_base_balanca", "P08_plataforma", "P09_espacador", "Celula_*", "Parafuso_M5x16_*", "Parafuso_M4x16_*", "Parafuso_M3x12_batente_*"];
const PATAS = ["P12_*", "P13_*", "Parafuso_M3x12_pata_*"];
const TUBO = ["Tubo_PVC_DN100"];
const ZT = 22.5;                                        // fundo do tubo (altura sobre a mesa)

/* ------------------------------------------------------------------ tabela (vira HTML no site e Markdown no README) */
const CORES = { vermelho: "#d91414", preto: "#141414", amarelo: "#f2d41f", laranja: "#ff8000", verde: "#1fa638", azul: "#1f52e6",
  branco: "#f2f2f2", roxo: "#8c33cc", cinza: "#8c8c8c", ciano: "#00bfd9", marrom: "#73401a" };
function tabela(cab, linhas) {
  const cel = (c) => String(c).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\[(\w+)\]/g, (_, k) => CORES[k] ? `<i class="fio" style="background:${CORES[k]}"></i>${k}` : k);
  return {
    html: `<table class="tab"><thead><tr>${cab.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>${linhas.map((l) =>
      `<tr>${l.map((c) => `<td>${cel(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
    md: `| ${cab.join(" | ")} |\n|${cab.map(() => "---").join("|")}|\n${linhas.map((l) => `| ${l.map((c) => String(c).replace(/\[(\w+)\]/g, "$1")).join(" | ")} |`).join("\n")}`,
  };
}

/* ================================================================== módulos */
export const MODULOS = [
  { id: "m0", cod: "0", nome: "Antes de começar", tipo: "conferência", tempo: "40 min",
    desc: "Conferir peças, medidas e ferramentas; dividir o grupo. Todo mundo junto." },
  { id: "ma", cod: "A", nome: "Tubo de PVC", tipo: "🔧 📏 mecânica pesada (furadeira)", tempo: "1 h", depende: "—",
    desc: "Cortar, marcar e furar o tubo e abrir a janela da bica. Faz sujeira: fazer longe da eletrônica." },
  { id: "mb", cod: "B", nome: "Cartucho dosador", tipo: "🔧 🔩 mecânica fina", tempo: "40 min", depende: "—",
    desc: "Servo + rotor + anel/escudo + chapéu: o mecanismo que solta a ração. Montado na mão, fora do tubo." },
  { id: "mc", cod: "C", nome: "Pedestal e gaveta", tipo: "🔥 🔧 🧴 solda + mecânica", tempo: "1 h 15", depende: "—",
    desc: "Pés, ímãs, jack, chave, botão, LED e a gaveta com as 6 pilhas." },
  { id: "md", cod: "D", nome: "Eletrônica na protoboard", tipo: "🔌 🔥 eletrônica", tempo: "2–3 h", depende: "—",
    desc: "Regulador em 5 V, componentes furo a furo, jumpers, ESP32 e gravação do firmware. Fazer numa mesa limpa." },
  { id: "me", cod: "E", nome: "Balança", tipo: "🔩 🔥 mecânica + solda leve", tempo: "40 min", depende: "—",
    desc: "Célula de carga entre a base e a plataforma, com os 3 batentes de proteção." },
  { id: "mf", cod: "F", nome: "Patas com lastro", tipo: "🧴 mecânica leve", tempo: "30 min", depende: "—",
    desc: "Encher as 4 patas com peso, colar as tampas e os pés de borracha." },
  { id: "mg", cod: "G", nome: "Montagem final", tipo: "🔌 🔩 ✅ todos", tempo: "1 h 30", depende: "A, B, C, D, E, F",
    desc: "Juntar os módulos: eletrônica no pedestal, ligações, balança, teste geral, tubo, patas, calibração." },
];

/* ================================================================== passos */
export const PASSOS = [
  /* ============================================================ 0 — antes de começar */
  {
    id: "0-1", modulo: "m0", num: "0.1", titulo: "Visão geral: o que vamos montar", tipo: ["teste"], tempo: "10 min",
    resumo: "O alimentador tem **6 módulos independentes** (A–F) que juntam na **montagem final (G)**. Cada módulo pode ser feito por uma dupla ao mesmo tempo.",
    ...(() => { const t = tabela(["Dupla", "Módulos", "Tipo de trabalho"], [
      ["1", "**A** Tubo → **B** Cartucho", "furadeira, micro-retífica, chave fina"],
      ["2", "**C** Pedestal → **F** Patas", "solda simples, cola, parafusos"],
      ["3", "**D** Eletrônica", "protoboard, multímetro, solda dos pinos do regulador, computador"],
      ["4", "**E** Balança → ajuda a dupla 3", "parafusos, solda de 4 fios"],
    ]); return { html: `<h4>Divisão sugerida (grupo de 8)</h4>${t.html}`, md: "**Divisão sugerida (grupo de 8):**\n\n" + t.md }; })(),
    mostra: ["*"], contexto: false, fantasma: TUBO,
    cam: { dir: [1.1, -1.5, .75], zoom: .92 },
    rotulos: [
      { t: "A · Tubo PVC", p: [-50, 0, 520], o: [-40, 0] },
      { t: "B · Cartucho dosador", sel: "P03_rotor", o: [60, -30] },
      { t: "D · Eletrônica", sel: "Protoboard_MB102", o: [80, 10] },
      { t: "C · Pedestal + gaveta", sel: "P06_pedestal", o: [70, 30] },
      { t: "E · Balança", sel: "P08_plataforma", o: [-60, 40] },
      { t: "F · Patas", sel: "P12_pata_TD", o: [40, -10] },
    ],
    confira: ["Cada dupla sabe o seu módulo e já separou as peças dele (próximos passos)."],
  },
  {
    id: "0-2", modulo: "m0", num: "0.2", titulo: "Mapa das peças impressas (P01–P13)", tipo: ["teste"], tempo: "15 min",
    resumo: "As 19 peças impressas, afastadas na ordem em que se encaixam. Use esta vista para reconhecer cada uma. **Marque com caneta** o código em cada peça assim que sair da impressora (principalmente as 4 patas e as 4 tampas, que são diferentes entre si).",
    mostra: [],
    novo: [
      { sel: ["P10_chapeu"], de: [0, 0, 190] }, { sel: ["P02_anel_escudo"], de: [0, 0, 120] }, { sel: ["P03_rotor"], de: [0, 0, 60] },
      { sel: ["P01_piso_dosador"], de: [0, 0, 10] }, { sel: ["P04_bica"], de: [0, -90, 30] },
      { sel: ["P05_bandeja_espinha"], de: [0, 0, -40] }, { sel: ["P06_pedestal"], de: [0, 0, -90] },
      { sel: ["P11_gaveta_pilhas"], de: [-140, 0, -90] },
      { sel: ["P07_base_balanca"], de: [0, -90, -110] }, { sel: ["P09_espacador"], de: [0, -90, -40] }, { sel: ["P08_plataforma"], de: [0, -90, 20] },
      { sel: ["P12_pata_TD"], de: [80, 80, -90] }, { sel: ["P12_pata_TE"], de: [-80, 80, -90] }, { sel: ["P12_pata_FE"], de: [-80, -80, -90] }, { sel: ["P12_pata_FD"], de: [80, -80, -90] },
      { sel: ["P13_tampa_TD"], de: [80, 80, -60] }, { sel: ["P13_tampa_TE"], de: [-80, 80, -60] }, { sel: ["P13_tampa_FE"], de: [-80, -80, -60] }, { sel: ["P13_tampa_FD"], de: [80, -80, -60] },
    ],
    cam: { dir: [1, -1.35, .7], zoom: .95 },
    rotulos: [
      { t: "P10 chapéu", sel: "P10_chapeu", o: [70, -10] }, { t: "P02 anel + escudo", sel: "P02_anel_escudo", o: [80, 0] },
      { t: "P03 rotor", sel: "P03_rotor", o: [80, 0] }, { t: "P01 piso", sel: "P01_piso_dosador", o: [80, 10] },
      { t: "P04 bica", sel: "P04_bica", o: [-70, 0] }, { t: "P05 bandeja + espinha", sel: "P05_bandeja_espinha", o: [90, -20] },
      { t: "P06 pedestal", sel: "P06_pedestal", o: [90, 0] }, { t: "P11 gaveta", sel: "P11_gaveta_pilhas", o: [-60, -20] },
      { t: "P08 plataforma", sel: "P08_plataforma", o: [-70, -20] }, { t: "P09 espaçador", sel: "P09_espacador", o: [-80, 0] },
      { t: "P07 base da balança", sel: "P07_base_balanca", o: [-70, 30] },
      { t: "P12 TD + P13 TD", sel: "P12_pata_TD", o: [40, -20] }, { t: "P12 FD + P13 FD", sel: "P12_pata_FD", o: [50, 20] },
    ],
    pecas: [["19", "peças impressas", "P01–P11 (1 de cada), P12 × 4 (TD, TE, FE, FD), P13 × 4 (TD, TE, FE, FD)"]],
    passos: [
      "Tire suportes e rebarbas de todas as peças.",
      "Escreva o código (P01…P13, e TD/TE/FE/FD nas patas e tampas) com caneta permanente num lugar que não fique à vista.",
      "Passe uma broca de **2,5 mm na mão** (sem furadeira) nos furos-guia dos parafusos M3: só para tirar a sujeira da impressão.",
      "Passe uma broca de **3,5 mm na mão** nos furos de passagem: aba do braço da base (P07) e moldura da bica (P04).",
    ],
    confira: ["As 6 pás do rotor (P03) estão inteiras, sem trinca na raiz.", "O chapéu (P10) não tem rebarba; os 2 pinos de baixo estão inteiros."],
  },
  {
    id: "0-3", modulo: "m0", num: "0.3", titulo: "Medir as peças compradas (paquímetro)", tipo: ["medir"], tempo: "15 min",
    resumo: "Algumas medidas do projeto são de anúncio (⚠️). Confira com paquímetro **antes** de furar ou forçar qualquer coisa. Se algo não bater, avise quem cuida do CAD (parâmetros no topo de `cad/scripts/gerar_v3.py`).",
    mostra: ["Servo_MG90S_360", "Celula_*", ...PILHAS, ...PAINEL, "Servo_braco_duplo"], contexto: false,
    cam: { dir: [1, -1.3, .9], zoom: 1.1 },
    rotulos: [
      { t: "servo: 22,8 × 12,2 × 22,7", sel: "Servo_MG90S_360", o: [60, -30] }, { t: "célula 75–80 mm, rosca M4/M5", sel: "Celula_carga_5kg", o: [-60, 40] },
      { t: "suporte 6×AA ≤ 89 × 58 × 16", sel: "Suporte_6xAA", o: [-70, -30] }, { t: "jack: rosca M8", sel: "Jack_P4_rosca", o: [60, -20] },
    ],
    ...(() => { const t = tabela(["O quê", "Medida esperada", "Se não bater"], [
      ["Tubo PVC — diâmetro **interno**", "**≥ 97,8 mm** (DE 101,6 × 1,8)", "Cartucho não entra: não compre série reforçada"],
      ["Servo MG90S — corpo", "22,8 × 12,2 × 22,7 mm; furos das abas a 27,8 mm", "Furar no lugar certo com broca 1,5 mm"],
      ["Servo — do fundo ao topo do eixo", "31,0 mm", "Rotor pode raspar no piso"],
      ["Célula de carga", "75 ou 80 × 12,7 × 12,7 mm; rosca M4 ou M5", "Escolher os parafusos (M4 ou M5 × 16)"],
      ["Suporte 6×AA", "≤ 89 × 58 × 16 mm (1 camada)", "Não cabe na gaveta"],
      ["Jack P4", "rosca M8, porca ≤ Ø 13 mm", "—"],
      ["Braço duplo do servo", "≤ 36 × 6 × 2 mm", "Lixar as pontas"],
    ]); return { html: t.html, md: t.md }; })(),
    ferramentas: ["paquímetro", "multímetro"],
    confira: ["Servo é o **de rotação contínua (360°)**: girando o eixo com a mão ele não para em um ângulo fixo.", "Suporte de pilhas é o **chato** (6 lado a lado)."],
  },

  /* ============================================================ A — tubo */
  {
    id: "a-1", modulo: "ma", num: "A.1", titulo: "Cortar o tubo e marcar as 4 linhas", tipo: ["medir", "mecanica"], tempo: "20 min", quem: "Dupla 1",
    resumo: "Todas as alturas deste módulo são medidas **a partir do fundo** do tubo (a ponta que vai no pedestal). Perímetro do tubo = **319 mm**.",
    mostra: TUBO, contexto: false, chao: false,
    cam: { dir: [.55, -1, .25], alvo: [0, 0, ZT + 160], zoom: .55 },
    rotulos: [
      { t: "FRENTE (linha 0)", p: [0, -50.8, ZT + 110], tipo: "sinal", o: [-50, 0] },
      { t: "DIREITA: 80 mm da frente", p: [50.8, 0, ZT + 110], o: [40, 0] },
      { t: "fundo = altura 0", p: [0, -50.8, ZT + 2], tipo: "medida", o: [-60, 10] },
      { t: "640 mm", p: [50.8, 0, ZT + 330], tipo: "medida", o: [40, 0] },
    ],
    pecas: [["1", "tubo PVC esgoto DN 100 série normal", "pedaço ≥ 65 cm"], ["—", "fita crepe, caneta permanente"]],
    ferramentas: ["serra para PVC (ou arco de serra)", "esquadro ou folha de papel enrolada como guia", "trena", "lixa 120"],
    passos: [
      "Enrole uma folha de papel bem esticada em volta do tubo e risque o corte seguindo a borda do papel: fica no esquadro.",
      "Corte em **640 mm** e lixe as rebarbas de dentro e de fora.",
      "Escolha uma ponta para ser o **fundo** e escreva \"FUNDO\" nela.",
      "Enrole fita crepe nos primeiros 25 cm a partir do fundo. Risque uma linha reta de cima a baixo na fita: **FRENTE**.",
      "Medindo pela fita (em volta do tubo) a partir da FRENTE: **80 mm** para cada lado = **DIREITA** e **ESQUERDA**; **160 mm** = **TRÁS**.",
      "Ainda a partir da FRENTE, marque **106 mm** para cada lado (passando por trás): são as linhas de **30°** e **150°** dos furos do cartucho.",
    ],
    confira: ["De TRÁS até a linha de 30° e até a de 150° dá ~53 mm (as duas iguais).", "As linhas estão paralelas ao tubo (confira com uma régua encostada)."],
  },
  {
    id: "a-2", modulo: "ma", num: "A.2", titulo: "Furar os 7 furos de Ø 3,5 mm", tipo: ["medir", "mecanica"], tempo: "20 min", quem: "Dupla 1",
    resumo: "Marque o centro de cada furo com um prego e uma batidinha (a broca não escorrega). Fure **perpendicular** ao tubo, devagar, sem atravessar a parede do outro lado.",
    mostra: TUBO, contexto: false, chao: false,
    cam: { dir: [.75, -1, .35], alvo: [0, 0, ZT + 110], zoom: .5 },
    rotulos: [
      { t: "pedestal: DIREITA, 7,5 mm", p: [50.8, 0, ZT + 7.5], tipo: "sinal", o: [50, 10] },
      { t: "cartucho: 30°, 190,5 mm", p: [44, 25.4, ZT + 190.5], tipo: "sinal", o: [50, 0] },
      { t: "moldura: ±14,6 mm da FRENTE, 202,5 mm", p: [15, -48.5, ZT + 202.5], tipo: "sinal", o: [60, -40] },
      { t: "janela da bica (passo A.3)", p: [0, -50.8, ZT + 170], o: [-70, 20] },
    ],
    ...(() => { const t = tabela(["Furo", "Linha", "Altura (do fundo)", "Qtd"], [
      ["Pedestal", "DIREITA e ESQUERDA", "**7,5 mm**", "2"],
      ["Cartucho", "TRÁS, 30° e 150°", "**190,5 mm**", "3"],
      ["Moldura da bica", "**14,6 mm** à direita e à esquerda da FRENTE", "**202,5 mm**", "2"],
    ]); return { html: t.html, md: t.md }; })(),
    ferramentas: ["furadeira", "broca 3,5 mm", "prego e martelo", "trena"],
    passos: [
      "Marque as 7 alturas nas linhas certas (tabela) e confira cada uma duas vezes.",
      "Fure com broca de **3,5 mm**. Tire as rebarbas de dentro do tubo com a lixa enrolada num dedo.",
    ],
    atencao: ["O furo do pedestal é **muito perto da borda** (7,5 mm): fure devagar para o PVC não rachar."],
    confira: ["7 furos, nas alturas da tabela (meça de novo depois de furar)."],
  },
  {
    id: "a-3", modulo: "ma", num: "A.3", titulo: "Abrir a janela da bica", tipo: ["medir", "mecanica"], tempo: "25 min", quem: "Dupla 1",
    resumo: "Retângulo centrado na linha da FRENTE: **55,6 mm de largura** (27,8 mm para cada lado da linha) × **de 140,7 a 199,5 mm** de altura.",
    mostra: TUBO, contexto: false, chao: false,
    cam: { dir: [.25, -1, .12], alvo: [0, -50, ZT + 170], zoom: .3 },
    rotulos: [
      { t: "199,5 mm", p: [27.8, -40, ZT + 199.5], tipo: "medida", o: [50, -6] },
      { t: "140,7 mm", p: [27.8, -40, ZT + 140.7], tipo: "medida", o: [50, 6] },
      { t: "55,6 mm (27,8 + 27,8)", p: [0, -50.8, ZT + 140.7], tipo: "medida", o: [-30, 50] },
      { t: "furos da moldura (A.2)", p: [-15, -48.5, ZT + 202.5], o: [-70, -40] },
    ],
    ferramentas: ["furadeira + broca 8 mm", "micro-retífica com disco de corte ou serra tico-tico", "lima", "óculos de proteção"],
    passos: [
      "Desenhe o retângulo na fita crepe com régua.",
      "Fure os **4 cantos por dentro do retângulo** com broca de 8 mm.",
      "Corte de furo a furo **por dentro da linha** (sobra 1 mm para acertar com a lima).",
      "Lime até a bica (P04) entrar pela janela **sem forçar**. As bordas de cima e de baixo ficam escondidas pela moldura; as laterais ficam à vista, então deixe-as retas.",
    ],
    confira: ["P04 entra pela janela e a moldura cobre as bordas de cima e de baixo.", "Os 2 furos da moldura (A.2) coincidem com os 2 furos da moldura da bica."],
  },

  /* ============================================================ B — cartucho */
  {
    id: "b-1", modulo: "mb", num: "B.1", titulo: "Teste a seco: piso + rotor + anel", tipo: ["mecanica", "teste"], tempo: "5 min", quem: "Dupla 1",
    resumo: "Antes de pôr o servo, confira se as três peças do dosador se encaixam e o rotor gira solto.",
    mostra: [],
    novo: [{ sel: ["P01_piso_dosador"], de: [0, 0, 0] }, { sel: ["P03_rotor"], de: [0, 0, 55] }, { sel: ["P02_anel_escudo"], de: [0, 0, 110] }],
    cam: { dir: [.9, -1.2, .9] },
    rotulos: [
      { t: "escudo (setor fechado) fica sobre a saída", sel: "P02_anel_escudo", o: [-60, -50] },
      { t: "3 pinos → 3 furos (só entra numa posição)", p: [0, 46.8, 220], o: [60, -30] },
      { t: "saída da ração", p: [0, -30, 222], tipo: "sinal", o: [-80, 40] },
    ],
    passos: [
      "Ponha o rotor (P03) sobre o piso (P01).",
      "Encaixe o anel (P02) por cima, com os **3 pinos** nos 3 furos do piso. Ele só entra numa posição.",
      "Gire o rotor com o dedo pelo meio, nos dois sentidos.",
      "Desmonte (o servo entra antes do anel).",
    ],
    confira: ["O rotor gira **livre** nos dois sentidos, sem raspar.", "O escudo (parte fechada do anel) fica exatamente em cima da abertura de saída do piso."],
  },
  {
    id: "b-2", modulo: "mb", num: "B.2", titulo: "Servo no piso", tipo: ["mecanica", "parafusos"], tempo: "10 min", quem: "Dupla 1",
    resumo: "O servo entra **por baixo** do piso: o topo (caixa de engrenagens) passa pela abertura retangular e o **eixo fica no centro** do piso. As abas apoiam por baixo nos 2 apoios.",
    mostra: ["P01_piso_dosador"],
    novo: [{ sel: SERVO, de: [0, 0, -45] }],
    cam: { dir: [1, -1.1, -.55] },
    rotulos: [
      { t: "eixo no centro do piso", p: [0, 0, 224], tipo: "sinal", o: [60, -40] },
      { t: "parafuso do kit (por baixo)", p: [8.6, 0, 210], o: [70, 30] },
      { t: "parafuso do kit (por baixo)", p: [-19.4, 0, 210], o: [-70, 30] },
      { t: "cabo do servo", sel: "Servo_saida_cabo", o: [-70, 40] },
    ],
    pecas: [["1", "P01 piso do dosador"], ["1", "servo **MG90S 360°**"], ["2", "parafusos das abas", "vêm no saquinho do servo"]],
    ferramentas: ["chave Phillips fina #0"],
    passos: [
      "Vire o piso de cabeça para baixo.",
      "Encaixe o servo com o eixo para cima, passando a caixa de engrenagens pela abertura retangular. O **eixo** tem que ficar no **centro** do piso.",
      "Aparafuse as **2 abas** nos 2 apoios com os parafusos do kit, até encostar. Não force: o furo-guia é no plástico.",
    ],
    atencao: ["Se o furo da aba não coincidir com o furo do apoio, **não force**: fure o lugar certo com broca de 1,5 mm na mão."],
    confira: ["O servo está firme, sem folga; o eixo está centrado."],
  },
  {
    id: "b-3", modulo: "mb", num: "B.3", titulo: "Braço duplo no rotor", tipo: ["mecanica", "parafusos"], tempo: "5 min", quem: "Dupla 1",
    resumo: "O braço duplo reto do kit encaixa no **rebaixo de baixo** do rotor e é preso por 2 parafusos M2 × 6 nas pontas.",
    mostra: [],
    novo: [{ sel: ["P03_rotor"], de: [0, 0, 0] }, { sel: ["Servo_braco_duplo"], de: [0, 0, -30] }],
    cam: { dir: [.8, -1, -.9] },
    rotulos: [
      { t: "rebaixo 36,6 × 6,6 × 2,5 mm (lado de baixo)", p: [0, 0, 223], o: [70, 40] },
      { t: "M2 × 6 na ponta", p: [15, 0, 224], tipo: "sinal", o: [60, -40] },
      { t: "M2 × 6 na ponta", p: [-15, 0, 224], tipo: "sinal", o: [-60, -40] },
    ],
    pecas: [["1", "P03 rotor"], ["1", "braço **duplo reto** do servo"], ["2", "M2 × 6 autoatarraxante"]],
    ferramentas: ["chave Phillips #0"],
    passos: [
      "Vire o rotor de cabeça para baixo e encaixe o braço no rebaixo, com o furo estriado do braço no centro.",
      "Prenda com **2 × M2 × 6** pelos furos das pontas do braço.",
    ],
    confira: ["O braço fica embutido (não sobra para fora do fundo do rotor)."],
  },
  {
    id: "b-4", modulo: "mb", num: "B.4", titulo: "Rotor no eixo do servo", tipo: ["mecanica", "parafusos"], tempo: "5 min", quem: "Dupla 1",
    resumo: "O rotor (com o braço) encaixa no estriado do eixo e é preso pelo **parafuso central** do kit, apertado pelo furo do meio do rotor.",
    mostra: ["P01_piso_dosador", ...SERVO], cor: SERVO,
    novo: [{ sel: ["P03_rotor", "Servo_braco_duplo"], de: [0, 0, 60] }],
    cam: { dir: [1, -1.2, .8] },
    rotulos: [{ t: "parafuso central (chave #0) pelo furo Ø 5,2", p: [0, 0, 251], tipo: "sinal", o: [60, -50] }],
    pecas: [["1", "parafuso central do braço", "vem no kit do servo"]],
    ferramentas: ["chave Phillips fina #0"],
    passos: [
      "Encaixe o rotor no eixo do servo, apertando para baixo até o estriado entrar todo.",
      "Aperte o **parafuso central** pelo furo do meio do rotor.",
      "Gire o rotor com a mão (devagar: o servo gira junto, com resistência).",
    ],
    confira: ["O rotor não raspa no piso em nenhuma posição (há 0,8 mm de folga)."],
  },
  {
    id: "b-5", modulo: "mb", num: "B.5", titulo: "Anel com escudo", tipo: ["mecanica"], tempo: "2 min", quem: "Dupla 1",
    resumo: "O anel encaixa no piso pelos **3 pinos** (só entra numa posição). O **escudo** (setor fechado) fica por cima da saída da ração, protegendo-a do peso da coluna.",
    mostra: ["P01_piso_dosador", "P03_rotor", ...SERVO], cor: SERVO,
    novo: [{ sel: ["P02_anel_escudo"], de: [0, 0, 70] }],
    cam: { dir: [.8, -1.3, 1] },
    rotulos: [
      { t: "escudo para a FRENTE (saída)", p: [0, -33, 258], tipo: "sinal", o: [-70, -20] },
      { t: "pino → furo do piso", p: [44.3 * .866, 46.8 * .5, 220], o: [60, 10] },
      { t: "2 furos da moldura (M3 × 8 depois)", p: [0, -47, 225], o: [60, 40] },
    ],
    passos: ["Encaixe o anel pelos 3 pinos, com o escudo sobre a saída.", "Gire o rotor com o dedo, pelos bolsos."],
    confira: ["O rotor gira sem raspar no anel nem no escudo."],
  },
  {
    id: "b-6", modulo: "mb", num: "B.6", titulo: "Chapéu sobre o escudo", tipo: ["mecanica"], tempo: "2 min", quem: "Dupla 1",
    resumo: "O chapéu tem **2 pinos** que entram nos 2 furos do topo do escudo. Ele fica **solto**: o peso da ração o segura. O telhado alto vai para a FRENTE e a aresta de baixo atravessa o tubo.",
    mostra: ["P01_piso_dosador", "P03_rotor", "P02_anel_escudo", ...SERVO], cor: SERVO,
    novo: [{ sel: ["P10_chapeu"], de: [0, 0, 80] }],
    cam: { dir: [1.2, -1, .7] },
    rotulos: [
      { t: "2 pinos Ø 3 → furos do escudo", p: [0, -33, 258], tipo: "sinal", o: [-80, 30] },
      { t: "telhado 55° (alto na FRENTE)", sel: "P10_chapeu", o: [70, -40] },
    ],
    passos: ["Encaixe os 2 pinos do chapéu nos 2 furos do topo do escudo.", "Pronto: o cartucho vai inteiro para o tubo no passo G (ou já, se o tubo estiver pronto: passo B.7)."],
    confira: ["O chapéu assenta reto, sem balançar, e o rotor continua girando livre."],
  },
  {
    id: "b-7", modulo: "mb", num: "B.7", titulo: "Cartucho dentro do tubo", tipo: ["mecanica", "parafusos"], tempo: "15 min", quem: "Dupla 1",
    resumo: "O cartucho entra **pelo fundo** do tubo e sobe até os 3 furos de trás. Faça com o tubo **em pé** (não de cabeça para baixo): assim o chapéu fica apoiado no escudo pela gravidade e não cai.",
    mostra: [], fantasma: TUBO, cor: [...SERVO],
    novo: [{ sel: [...CARTUCHO], de: [0, 0, -150] }, { sel: ["Parafuso_M3x10_cartucho_0"], de: [24, 14, 0] }, { sel: ["Parafuso_M3x10_cartucho_1"], de: [0, 28, 0] }, { sel: ["Parafuso_M3x10_cartucho_2"], de: [-24, 14, 0] }],
    cam: { dir: [1.2, 1.4, .45], foco: [...CARTUCHO, "Parafuso_M3x10_*"], zoom: 1.05 },
    rotulos: [
      { t: "M3 × 10 (TRÁS)", sel: "Parafuso_M3x10_cartucho_1", tipo: "sinal", o: [40, -30] },
      { t: "M3 × 10 (30°)", sel: "Parafuso_M3x10_cartucho_0", tipo: "sinal", o: [50, 10] },
      { t: "M3 × 10 (150°)", sel: "Parafuso_M3x10_cartucho_2", tipo: "sinal", o: [-50, 10] },
      { t: "entra pelo FUNDO, servo para baixo", sel: "Servo_MG90S_360", o: [-60, 40] },
    ],
    pecas: [["1", "cartucho montado (B.1–B.6)"], ["1", "tubo pronto (A.1–A.3)"], ["3", "M3 × 10 inox cabeça panela"]],
    ferramentas: ["chave Phillips #1", "ajudante para segurar o tubo"],
    passos: [
      "Um colega segura o tubo **em pé**, com o fundo uns 30 cm acima da mesa (ou na beira da mesa).",
      "Por baixo, empurre o cartucho para dentro com o **chapéu em cima** e o **servo para baixo**, com a **saída virada para a janela** (FRENTE).",
      "Suba até os 3 furos do piso aparecerem nos 3 furos de trás do tubo (190,5 mm). Gire o cartucho de leve até alinhar.",
      "Aparafuse **3 × M3 × 10** por fora (TRÁS, 30°, 150°). Aperte até encostar; não force (rosca no plástico).",
      "Deixe o **cabo do servo pendurado** para fora do fundo do tubo.",
    ],
    atencao: ["Não monte com o tubo de cabeça para baixo: o chapéu só está encaixado por 2 pinos e cairia tubo abaixo."],
    confira: ["Olhando pela janela da bica, a saída do piso está centrada nela.", "O cartucho não gira nem desce ao empurrar."],
  },
  {
    id: "b-8", modulo: "mb", num: "B.8", titulo: "Bica pela janela", tipo: ["mecanica", "parafusos"], tempo: "5 min", quem: "Dupla 1",
    resumo: "A bica entra **por fora**, pela janela, até encostar embaixo do piso. Os 2 parafusos da moldura atravessam a moldura, o tubo e prendem no anel: travam bica **e** anel.",
    mostra: ["P01_piso_dosador", "P02_anel_escudo", "P03_rotor", "P10_chapeu", ...SERVO, "Parafuso_M3x10_*"], fantasma: TUBO, cor: SERVO,
    novo: [{ sel: ["P04_bica"], de: [0, -90, 0] }, { sel: ["Parafuso_M3x8_moldura_*"], de: [0, -120, 0] }],
    cam: { dir: [1.2, -1.2, .4], foco: ["P04_bica", "P02_anel_escudo", "Parafuso_M3x8_*"], zoom: 1.2 },
    rotulos: [
      { t: "2 × M3 × 8 pela moldura", sel: "Parafuso_M3x8_moldura_1", tipo: "sinal", o: [60, -30], segue: "Parafuso_M3x8_moldura_1" },
      { t: "P04 bica", sel: "P04_bica", o: [-60, 40], segue: "P04_bica" },
    ],
    pecas: [["1", "P04 bica"], ["2", "M3 × 8 inox cabeça panela"]],
    passos: [
      "Passe a bica pela janela, inclinada para baixo, até a ponta de dentro encostar embaixo do piso.",
      "Alinhe os 2 furos da moldura com os 2 furos do tubo (202,5 mm).",
      "Aparafuse **2 × M3 × 8**.",
    ],
    confira: ["A bica não balança e a moldura cobre as bordas de cima e de baixo da janela.", "No teste G.5, com um punhado de ração no tubo, ela sai **só pela bica**."],
  },

  /* ============================================================ C — pedestal */
  {
    id: "c-1", modulo: "mc", num: "C.1", titulo: "Pés de borracha do pedestal", tipo: ["cola"], tempo: "5 min", quem: "Dupla 2",
    resumo: "4 pés adesivos nos 4 rebaixos redondos (Ø 12 mm) embaixo do pedestal. São **obrigatórios**: a gaveta das pilhas fica só 0,3 mm acima do fundo e os pés dão a folga para ela não arrastar na mesa.",
    mostra: [], chao: false,
    novo: [{ sel: ["P06_pedestal"], de: [0, 0, 0] }],
    cam: { dir: [.6, -.8, -1.2], zoom: .9 },
    rotulos: [[41, 41], [-41, 41], [-41, -41], [41, -41]].map(([x, y], i) => ({ t: "pé " + (i + 1), p: [x, y, 0], tipo: "sinal", o: [x > 0 ? 40 : -40, y > 0 ? -20 : 20] })),
    pecas: [["4", "pés de borracha adesivos Ø 12 × 3–5 mm", "**todos da mesma altura** (as patas usam mais 4 iguais)"]],
    passos: ["Limpe os rebaixos com álcool.", "Cole um pé em cada rebaixo, apertando 10 s."],
    confira: ["O pedestal apoia nos 4 pés sem mancar."],
  },
  {
    id: "c-2", modulo: "mc", num: "C.2", titulo: "Soldar fios no jack, chave, botão e LED", tipo: ["solda"], tempo: "25 min", quem: "Dupla 2",
    resumo: "Cada componente do painel ganha fios de **~25 cm** com um **pino macho** na ponta (meio jumper macho-macho emendado), para espetar na protoboard depois. Solde **antes** de pôr no pedestal.",
    mostra: [],
    novo: [{ sel: ["Jack_P4_*"], de: [0, 30, 0] }, { sel: ["Chave_KCD11_*"], de: [30, 0, 0] }, { sel: ["Botao_*"], de: [30, 0, 0] }, { sel: ["LED_*"], de: [30, 0, 0] }],
    cam: { dir: [1, .25, .8], zoom: .8 },
    rotulos: [
      { t: "jack: centro (+) vermelho · corpo (−) preto", sel: "Jack_P4_terminal_1", o: [-40, -50], segue: "Jack_P4_corpo" },
      { t: "chave: 2 fios amarelos (\"SW1\", \"SW2\")", sel: "Chave_KCD11_terminal_0", o: [40, 70], segue: "Chave_KCD11_corpo" },
      { t: "botão: amarelo \"BT\" + preto", sel: "Botao_terminal_1", o: [-60, -40], segue: "Botao_rosca" },
      { t: "LED: perna longa verde · curta preto", sel: "LED_perna_anodo", o: [60, 40], segue: "LED_5mm" },
    ],
    ...(() => { const t = tabela(["Componente", "Terminal", "Fio", "Etiqueta"], [
      ["Jack P4", "pino central (+)", "[vermelho]", "\"J+\""], ["Jack P4", "corpo (−)", "[preto]", "\"J−\""],
      ["Chave KCD11", "terminal 1", "[amarelo]", "\"SW1\""], ["Chave KCD11", "terminal 2", "[amarelo]", "\"SW2\""],
      ["Botão", "terminal 1", "[amarelo]", "\"BT\""], ["Botão", "terminal 2", "[preto]", "\"BT−\""],
      ["LED", "perna **longa** (anodo)", "[verde]", "\"LED+\""], ["LED", "perna curta (catodo, lado chato)", "[preto]", "\"LED−\""],
    ]); return { html: t.html, md: t.md }; })(),
    pecas: [["1", "jack P4 de painel 5,5 × 2,1 (com porca)"], ["1", "chave KCD11"], ["1", "botão 12 mm NA (com porca)"], ["1", "LED 5 mm"], ["8", "fios de ~25 cm", "AWG 22–24"], ["4", "jumpers macho-macho", "cortados ao meio = 8 pontas"], ["—", "termorretrátil Ø 2–3 mm"]],
    ferramentas: ["ferro de solda + estanho", "desencapador", "isqueiro ou soprador", "fita crepe para as etiquetas"],
    passos: [
      "Tire as **porcas** do jack e do botão e guarde: elas entram **por dentro** do pedestal (C.3 e C.4).",
      "Ponha um pedaço de termorretrátil no fio antes de cada solda.",
      "Solde os 8 fios conforme a tabela. Cubra cada solda com o termorretrátil e encolha.",
      "Na outra ponta de cada fio, emende meio jumper (pino macho) e isole.",
      "Etiquete cada fio com fita crepe (coluna \"Etiqueta\").",
    ],
    confira: ["Multímetro em continuidade: chave só apita **ligada**; botão só apita **apertado**.", "LED acende com 3 V (2 pilhas AA) com a perna longa no +."],
  },
  {
    id: "c-3", modulo: "mc", num: "C.3", titulo: "Jack P4 na traseira", tipo: ["mecanica"], tempo: "5 min", quem: "Dupla 2",
    resumo: "O jack entra **por fora**, pelo furo de Ø 8 da TRÁS do pedestal; a porca aperta **por dentro**, no rebaixo.",
    mostra: ["P06_pedestal"],
    novo: [{ sel: ["Jack_P4_rosca", "Jack_P4_flange", "Jack_P4_corpo", "Jack_P4_terminal_*"], de: [0, 45, 0] }, { sel: ["Jack_P4_porca"], de: [0, -35, 25] }],
    cam: { dir: [.9, 1.3, .7], foco: ["P06_pedestal"], alvo: [0, 55, 10], zoom: .55 },
    rotulos: [{ t: "porca por DENTRO", sel: "Jack_P4_porca", o: [-70, -30], segue: "Jack_P4_porca" }, { t: "TRÁS: jack entra por fora", p: [0, 70, 9], tipo: "sinal", o: [60, 30] }],
    passos: ["Passe os fios do jack pelo furo, de fora para dentro.", "Empurre o jack até a aba encostar na parede.", "Rosqueie a porca por dentro e aperte com o alicate (sem exagero)."],
    confira: ["O jack não gira quando você encaixa o plugue da fonte."],
  },
  {
    id: "c-4", modulo: "mc", num: "C.4", titulo: "Chave, botão e LED na lateral direita", tipo: ["mecanica", "cola"], tempo: "10 min", quem: "Dupla 2",
    resumo: "Na lateral **DIREITA** do pedestal, de frente para trás: **LED** (furo pequeno), **chave** (recorte retangular) e **botão** (furo de 12 mm).",
    mostra: ["P06_pedestal", "Jack_P4_*"],
    novo: [
      { sel: ["Chave_KCD11_*"], de: [40, 0, 0] },
      { sel: ["Botao_rosca", "Botao_cabeca", "Botao_atuador", "Botao_terminal_*"], de: [45, 0, 0] }, { sel: ["Botao_porca"], de: [-30, 0, 25] },
      { sel: ["LED_*"], de: [-35, 0, 25] },
    ],
    cam: { dir: [1.5, -.5, .6], alvo: [60, 0, 10], zoom: .5, foco: ["P06_pedestal"] },
    rotulos: [
      { t: "LED: por DENTRO + cola quente", sel: "LED_5mm", o: [-30, -70], segue: "LED_5mm" },
      { t: "chave: por FORA, até o clique", sel: "Chave_KCD11_gangorra", o: [70, -30], segue: "Chave_KCD11_gangorra" },
      { t: "botão: por FORA, porca por DENTRO", sel: "Botao_cabeca", o: [-30, -90], segue: "Botao_cabeca" },
    ],
    passos: [
      "**Chave:** passe os fios pelo recorte de fora para dentro e empurre a chave até travar (clique). O \"I\" (ligado) fica para cima.",
      "**Botão:** passe os fios pelo furo de 12 mm, de fora para dentro; rosqueie a porca **por dentro**, no rebaixo.",
      "**LED:** por **dentro** do pedestal, empurre o LED no furo pequeno até a aba encostar; prenda com uma gota de **cola quente** por dentro.",
      "Leve todos os fios para a **cavidade central** do pedestal.",
    ],
    confira: ["Chave firme; botão não gira; LED não sai empurrando por fora."],
  },
  {
    id: "c-5", modulo: "mc", num: "C.5", titulo: "Ímãs da gaveta", tipo: ["cola"], tempo: "10 min (+ secagem)", quem: "Dupla 2",
    resumo: "4 ímãs de 6 × 2 mm: **2 no rebaixo do pedestal** (lado esquerdo) e **2 nas pontas da aba da gaveta**. A polaridade importa: com ela invertida, a gaveta é empurrada para fora.",
    mostra: ["P06_pedestal"],
    novo: [{ sel: ["P11_gaveta_pilhas"], de: [-80, 0, 0] }, { sel: ["Imas_neodimio_6x2_gaveta"], de: [-40, 0, 0] }],
    cam: { dir: [-1.4, -.8, .8], alvo: [-60, 0, 10], zoom: .85, foco: ["P06_pedestal"] },
    rotulos: [
      { t: "ímã no pedestal (frente)", p: [-54.7, -36.9, 9], tipo: "sinal", o: [-60, 30] },
      { t: "ímã no pedestal (trás)", p: [-54.7, 36.9, 9], tipo: "sinal", o: [-50, -40] },
      { t: "P11 gaveta: sai pela ESQUERDA", sel: "P11_gaveta_pilhas", o: [-60, -60], segue: "P11_gaveta_pilhas" },
    ],
    pecas: [["4", "ímãs de neodímio disco 6 × 2 mm"], ["—", "cola instantânea **gel**"]],
    passos: [
      "Cole os **2 ímãs do pedestal** nos furinhos do rebaixo (gota de cola no fundo, ímã rente).",
      "Pegue um ímã solto e **encoste no ímã do pedestal**: a face que ficou **grudada** é a que fica virada **para fora** da aba da gaveta.",
      "Cole os 2 ímãs da aba assim (cada um no seu par). Espere a cola secar (5 min).",
    ],
    atencao: ["Ímã engolido é perigoso para pet e criança: cole bem e confira de vez em quando."],
    confira: ["Com a gaveta encostada, ela **puxa** para dentro (não empurra)."],
  },
  {
    id: "c-6", modulo: "mc", num: "C.6", titulo: "Pilhas na gaveta e gaveta no pedestal", tipo: ["mecanica", "teste"], tempo: "10 min", quem: "Dupla 2",
    resumo: "O suporte chato com as 6 AA fica no berço da gaveta, **fios para cima**, com **~15 cm de folga** (é o que deixa a gaveta abrir sem desligar nada). A gaveta entra pela ESQUERDA.",
    mostra: ["P06_pedestal", ...PAINEL, "Imas_neodimio_6x2_gaveta"],
    novo: [{ sel: ["P11_gaveta_pilhas", ...PILHAS], de: [-120, 0, 0] }, { sel: ["Pilha_AA_*"], de: [-120, 0, 40] }],
    cam: { dir: [-1.2, -1, 1.2], zoom: .9 },
    rotulos: [{ t: "suporte 6×AA, fios para cima", sel: "Suporte_6xAA", o: [-60, -60], segue: "Suporte_6xAA" }, { t: "empurre até os ímãs puxarem", sel: "P11_gaveta_pilhas", o: [-70, 40], segue: "P11_gaveta_pilhas" }],
    pecas: [["6", "pilhas AA alcalinas"], ["1", "suporte 6 × AA chato com fios"]],
    passos: [
      "Ponha as 6 pilhas no suporte (polaridade marcada nele).",
      "Encaixe o suporte no berço da gaveta. É justo: não precisa de fita (se usar, só fita **fina ≤ 0,5 mm**).",
      "Se os fios do suporte forem curtos, emende até ~25 cm (solda + termorretrátil) com pino macho na ponta.",
      "Empurre a gaveta pela esquerda até os ímãs puxarem; os fios saem por cima da gaveta para a cavidade central.",
    ],
    confira: [
      "Multímetro: fonte na tomada, entre os fios do jack → **~12 V**; nos fios das pilhas → **~9 V**.",
      "A gaveta abre e fecha 3 vezes sem prender os fios.",
    ],
  },

  /* ============================================================ D — eletrônica */
  {
    id: "d-1", modulo: "md", num: "D.1", titulo: "Regulador MP1584: pinos e 5,0 V", tipo: ["solda", "eletronica", "medir"], tempo: "20 min", quem: "Dupla 3",
    resumo: "**Faça isto antes de qualquer outra coisa.** O regulador sai de fábrica numa tensão qualquer: ligado assim, queima a ESP32 e o servo.",
    mostra: [],
    novo: [{ sel: BUCK, de: [0, 0, 0] }],
    cam: { dir: [.2, -1, .3], foco: BUCK, zoom: 1.2 },
    rotulos: [
      { t: "IN+ (c19)", furo: "c19", o: [-60, 20] }, { t: "IN− (h19)", furo: "h19", o: [60, 20] },
      { t: "OUT+ (c27)", furo: "c27", o: [-60, -20] }, { t: "OUT− (h27)", furo: "h27", o: [60, -20] },
      { t: "trimpot: girar até 5,00 V", sel: "MP1584_trimpot", tipo: "sinal", o: [-60, -60] },
    ],
    pecas: [["1", "módulo MP1584EN", "tem 2: o outro é reserva"], ["4", "pinos de barra macho"], ["1", "fonte 12 V"]],
    ferramentas: ["ferro de solda", "multímetro", "chave de fenda de relojoeiro"],
    passos: [
      "Solde 4 pinos nos furos **IN+, IN−, OUT+, OUT−**, com os pinos saindo pelo lado de **trás** da placa (o lado sem o indutor).",
      "Ligue **só** o MP1584 na fonte 12 V: + no IN+, − no IN−.",
      "Multímetro em V DC no OUT+ / OUT−. Gire o trimpot devagar até marcar **5,00 V** (sentido anti-horário costuma baixar).",
      "Desligue a fonte.",
    ],
    atencao: ["O trimpot é minúsculo e quebra: gire com delicadeza. Pode precisar de **várias voltas**."],
    confira: ["Desligou e ligou de novo a fonte: continua **5,0 V** (± 0,05)."],
  },
  {
    id: "d-2", modulo: "md", num: "D.2", titulo: "Protoboard na espinha da bandeja", tipo: ["mecanica", "cola"], tempo: "10 min", quem: "Dupla 3",
    resumo: "A MB-102 fica **em pé** na espinha da bandeja (P05), furos para a **FRENTE**, **coluna 1 embaixo**, apoiada no batente de baixo. A partir daqui, tudo é feito com ela em pé (ou deitada de costas na mesa).",
    mostra: [],
    novo: [{ sel: ["P05_bandeja_espinha"], de: [0, 0, 0] }, { sel: PROTO, de: [0, -60, 0] }],
    cam: { dir: [.9, -1.3, .45] },
    rotulos: [
      { t: "coluna 1 EMBAIXO", furo: "c1", tipo: "sinal", o: [-70, 20], segue: "Protoboard_MB102" },
      { t: "coluna 63 em cima", furo: "c63", o: [-70, -10], segue: "Protoboard_MB102" },
      { t: "fileiras a–e à ESQUERDA", furo: "a32", o: [-80, 0], segue: "Protoboard_MB102" },
      { t: "f–j à direita", furo: "j32", o: [70, 0], segue: "Protoboard_MB102" },
      { t: "rasgos para abraçadeiras", p: [30.5, 22, 76], o: [70, 40] },
    ],
    ...(() => { const t = tabela(["Trilho (olhando de frente)", "Cor", "Uso"], [
      ["esquerdo externo", "vermelho", "**+5 V**"], ["esquerdo interno", "azul", "**GND**"],
      ["direito interno", "azul", "**GND**"], ["direito externo", "vermelho", "**+3,3 V**"],
    ]); return { html: t.html, md: t.md }; })(),
    pecas: [["1", "P05 bandeja + espinha"], ["1", "protoboard MB-102 (830 furos)"], ["2", "abraçadeiras 2,5 × 100"]],
    passos: [
      "Confira a numeração impressa na protoboard: a **coluna 1** vai para **baixo** (lado da bandeja).",
      "Tire o papel do verso e cole na espinha, com a borda de baixo apoiada no batente.",
      "Reforce com **2 abraçadeiras** pelos rasgos da espinha (uma em cima, uma no meio).",
      "Com caneta, escreva \"+5V\" no trilho esquerdo externo e \"+3V3\" no direito externo (eles **não** são ligados entre si).",
    ],
    confira: ["Protoboard reta, sem folga; os trilhos da esquerda estão à esquerda olhando de frente."],
  },
  {
    id: "d-3", modulo: "md", num: "D.3", titulo: "Diodos D1 e D2 (o \"OU\" fonte/pilhas)", tipo: ["eletronica"], tempo: "5 min", quem: "Dupla 3",
    resumo: "Dois diodos 1N5819 juntam a fonte e as pilhas no mesmo ponto (coluna 7). A **faixa cinza** (catodo) de **ambos** fica na **coluna 7**.",
    mostra: ["P05_bandeja_espinha", ...PROTO], cor: PROTO,
    novo: [{ sel: DIODOS, de: [0, -25, 0] }],
    cam: { dir: [.15, -1, .15], foco: ["D1_*", "D2_*", "R1_*", "R3_*"], zoom: 1.5 },
    rotulos: [
      { t: "D1: c3 → c7", furo: "c3", tipo: "sinal", o: [-70, 20] }, { t: "faixa em c7", furo: "c7", o: [-70, 0] },
      { t: "D2: d11 → d7", furo: "d11", tipo: "sinal", o: [-70, -10] },
    ],
    ...(() => { const t = tabela(["Peça", "Perna sem faixa (anodo)", "Perna com faixa (catodo)"], [["D1 1N5819 (fonte)", "**c3**", "**c7**"], ["D2 1N5819 (pilhas)", "**d11**", "**d7**"]]); return { html: t.html, md: t.md }; })(),
    pecas: [["2", "diodo Schottky 1N5819"]],
    passos: ["Dobre as pernas no passo certo (4 furos de distância) com o alicate.", "Encaixe D1 e D2 nos furos da tabela, até o corpo encostar na protoboard."],
    confira: ["As **duas** faixas estão na coluna 7."],
  },
  {
    id: "d-4", modulo: "md", num: "D.4", titulo: "Divisores de tensão e resistor do LED", tipo: ["eletronica"], tempo: "15 min", quem: "Dupla 3",
    resumo: "Dois divisores deixam a ESP32 medir a fonte (GPIO 35) e as pilhas (GPIO 34). Cada um: resistor de cima (100 kΩ), resistor de baixo até o GND e um capacitor de 100 nF para filtrar. Mais o 220 Ω do LED.",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...DIODOS], cor: [...PROTO, ...DIODOS],
    novo: [{ sel: DIV_FONTE, de: [0, -25, 0] }, { sel: DIV_PILHAS, de: [0, -25, 0] }, { sel: R_LED, de: [0, -25, 0] }],
    cam: { dir: [.25, -1, .2], foco: [...DIODOS, ...DIV_FONTE, ...DIV_PILHAS, ...R_LED], zoom: 1.4 },
    rotulos: [
      { t: "R1 100k g3→g7", furo: "g4", tipo: "sinal", o: [110, 40] }, { t: "R2 22k h7→GND dir.", furo: "h7", o: [110, 12] },
      { t: "C1 100nF i7→GND dir.", furo: "i9", o: [110, -14] }, { t: "R3 100k g11→g15", furo: "g12", tipo: "sinal", o: [110, 10] },
      { t: "R4 27k h15→GND dir.", furo: "h15", o: [110, -16] }, { t: "C2 100nF i15→GND dir.", furo: "i16", o: [110, -42] },
      { t: "R5 220Ω b13→b17", furo: "b15", tipo: "sinal", o: [-90, 0] },
    ],
    ...(() => { const t = tabela(["Peça", "Cores (anéis)", "De", "Para"], [
      ["R1 100 kΩ", "marrom-preto-amarelo", "**g3**", "**g7**"], ["R2 22 kΩ", "vermelho-vermelho-laranja", "**h7**", "trilho GND direito, col. **7**"],
      ["C1 100 nF (104)", "—", "**i7**", "trilho GND direito, col. **9**"],
      ["R3 100 kΩ", "marrom-preto-amarelo", "**g11**", "**g15**"], ["R4 27 kΩ", "vermelho-violeta-laranja", "**h15**", "trilho GND direito, col. **15**"],
      ["C2 100 nF (104)", "—", "**i15**", "trilho GND direito, col. **16**"], ["R5 220 Ω", "vermelho-vermelho-marrom", "**b13**", "**b17**"],
    ]); return { html: t.html, md: t.md }; })(),
    pecas: [["2", "resistor 100 kΩ"], ["1", "resistor 22 kΩ"], ["1", "resistor 27 kΩ"], ["1", "resistor 220 Ω"], ["2", "capacitor cerâmico 100 nF (104)"]],
    passos: ["Confira cada resistor com o multímetro antes de encaixar (as cores enganam).", "Encaixe na ordem da tabela, pernas curtas e rentes."],
    atencao: ["R2 (22k) é da **fonte** e R4 (27k) das **pilhas**: trocados, a leitura de bateria fica errada."],
    confira: ["Nenhuma perna encosta em outra.", "R2, R4, C1 e C2 terminam no trilho **GND da direita** (azul), não no +3V3 (vermelho, mais de fora)."],
  },
  {
    id: "d-5", modulo: "md", num: "D.5", titulo: "MP1584, HX711, capacitor 470 µF e conector do servo", tipo: ["eletronica"], tempo: "10 min", quem: "Dupla 3",
    resumo: "O regulador (já em 5,0 V) atravessa o canal do meio. O HX711 espeta na fileira **j** com a placa para fora, à direita. O 470 µF segura o pico do servo. O conector do servo fica no **topo**, para soltar o tubo.",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...DIODOS, ...DIV_FONTE, ...DIV_PILHAS, ...R_LED], cor: [...PROTO],
    novo: [{ sel: BUCK, de: [0, -30, 0] }, { sel: HX, de: [0, -30, 0] }, { sel: C470, de: [0, -30, 0] }, { sel: HEADER, de: [0, -30, 0] }],
    cam: { dir: [.4, -1, .35], foco: ["Protoboard_MB102", ...BUCK, ...HX, ...C470], zoom: 1.0 },
    rotulos: [
      { t: "MP1584: IN+ c19 · IN− h19 · OUT+ c27 · OUT− h27", sel: "MP1584_placa", tipo: "sinal", o: [-60, 50], segue: "MP1584_placa" },
      { t: "HX711: GND j29 · DT j30 · SCK j31 · VCC j32", sel: "HX711_placa", tipo: "sinal", o: [60, 10], segue: "HX711_placa" },
      { t: "470 µF: + no +5V · faixa (−) no GND esq., col. 55", sel: "C3_470uF", o: [40, -40], segue: "C3_470uF" },
      { t: "conector servo: c60 · c61 · c62", sel: "Header_servo_pino_61", o: [60, -40], segue: "Header_servo_pino_61" },
    ],
    pecas: [["1", "MP1584 ajustado (D.1)"], ["1", "módulo HX711"], ["1", "capacitor eletrolítico 470 µF ≥ 16 V"], ["1", "barra de 3 pinos macho"], ["—", "fita dupla-face de espuma"]],
    passos: [
      "**MP1584:** pinos em **c19 (IN+), h19 (IN−), c27 (OUT+), h27 (OUT−)**. Confira as marcas na plaquinha: IN embaixo, OUT em cima.",
      "**HX711:** os 4 pinos na fileira **j**: **GND j29, DT j30, SCK j31, VCC j32**. A placa fica para fora, à direita; ponha 2 camadas de fita de espuma atrás dela.",
      "**470 µF:** perna **+** (longa) no trilho **+5V**, perna **−** (lado da faixa) no trilho **GND da esquerda**, coluna 55.",
      "**Conector do servo:** barra de 3 pinos em **c60, c61, c62**.",
    ],
    atencao: ["Capacitor eletrolítico ao contrário **estoura**. A faixa (−) vai no GND."],
    confira: ["Os nomes impressos no HX711 batem com a tabela (GND, DT, SCK, VCC de baixo para cima). Se a ordem do seu módulo for outra, siga o nome, não a posição."],
  },
  {
    id: "d-6", modulo: "md", num: "D.6", titulo: "Jumpers da protoboard (10 fios)", tipo: ["eletronica"], tempo: "15 min", quem: "Dupla 3",
    resumo: "Pontes de alimentação e de GND. Use jumpers macho-macho curtos, nas cores da tabela (a cor não muda a ligação, mas ajuda a conferir).",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...COMPONENTES], cor: [...PROTO, ...COMPONENTES],
    novo: [{ sel: J_PLACA, de: [0, -15, 0] }],
    cam: { dir: [.3, -1, .25], foco: ["Protoboard_MB102"], zoom: 1.0 },
    rotulos: [
      { t: "7: e3→f3", furo: "e3", o: [-70, 30] }, { t: "12: GND esq.↔GND dir. (col. 3)", furo: "GND_D@3", o: [60, 30] },
      { t: "11: a27→+5V", furo: "a27", o: [-70, 0] }, { t: "22/23: servo GND e 5V", furo: "a60", o: [-70, -10] },
      { t: "16/17: HX711 → 3V3 e GND", furo: "f32", o: [70, -10] },
    ],
    ...(() => { const t = tabela(["#", "De", "Para", "Cor"], [
      ["7", "e3", "f3", "[laranja]"], ["8", "e11", "f11", "[laranja]"], ["9", "j19", "GND dir., col. 21", "[preto]"], ["10", "j27", "GND dir., col. 25", "[preto]"],
      ["11", "a27", "+5V, col. 27", "[vermelho]"], ["12", "GND esq., col. 3", "GND dir., col. 3", "[preto]"], ["16", "f32", "+3V3, col. 37", "[laranja]"],
      ["17", "f29", "GND dir., col. 25", "[preto]"], ["22", "a60", "GND esq., col. 57", "[preto]"], ["23", "b61", "+5V, col. 58", "[vermelho]"],
    ]); return { html: t.html, md: t.md }; })(),
    pecas: [["10", "jumpers macho-macho"]],
    confira: [
      "Multímetro em continuidade, **tudo desligado**: +5V ↔ GND **não** apita (um bip curtinho do capacitor carregando é normal); +3V3 ↔ GND **não** apita; GND esquerdo ↔ GND direito **apita** sem parar.",
    ],
  },
  {
    id: "d-7", modulo: "md", num: "D.7", titulo: "ESP32 colada de cabeça para baixo", tipo: ["eletronica", "cola"], tempo: "15 min", quem: "Dupla 3",
    resumo: "A ESP32 **não espeta** na protoboard: é colada **de cabeça para baixo** entre as colunas ~37 e 57, com **antena para cima** e **USB para baixo**. Os pinos ficam apontando para você e recebem jumpers **fêmea**.",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...COMPONENTES, ...J_PLACA], cor: [...PROTO, ...COMPONENTES, ...J_PLACA],
    novo: [{ sel: ESP, de: [0, -50, 0] }],
    cam: { dir: [.6, -1, .3], foco: ESP, zoom: 1.6 },
    rotulos: [
      { t: "antena para CIMA", sel: "ESP32_blindagem_WROOM", tipo: "sinal", o: [-80, -40], segue: "ESP32_blindagem_WROOM" },
      { t: "USB para BAIXO", sel: "ESP32_USB", o: [-70, 30], segue: "ESP32_USB" },
      { t: "2 camadas de fita de espuma", sel: "ESP32_fita_dupla_face", o: [80, -40], segue: "ESP32_fita_dupla_face" },
      { t: "fileira EN…VIN à DIREITA", pino: "D34", o: [70, 10], segue: "ESP32_placa" },
    ],
    pecas: [["1", "ESP32 DevKit V1 30 pinos"], ["—", "fita dupla-face de espuma"]],
    ferramentas: ["caneta permanente fina"],
    passos: [
      "**Antes de colar**, vire a placa e marque com caneta, no lado de **baixo**, os pinos usados (os nomes só estão em cima): **VIN, GND (ao lado do VIN), 3V3, D18, RX2/16, D4, D34, D35, D23, D22**.",
      "Cole **2 camadas** de fita de espuma sobre a blindagem metálica do módulo (a caixinha prateada).",
      "Cole a placa de cabeça para baixo, centrada na protoboard, entre as colunas ~37 e 57: antena para cima, USB para baixo.",
    ],
    confira: ["O cabo USB encaixa na placa sem bater na protoboard.", "Olhando de frente, a fileira com VIN/GND/D34/D35 está à **direita**."],
  },
  {
    id: "d-8", modulo: "md", num: "D.8", titulo: "Jumpers da ESP32 (10 fios)", tipo: ["eletronica"], tempo: "15 min", quem: "Dupla 3",
    resumo: "Jumpers **macho-fêmea**: a fêmea no pino da ESP32, o macho no furo da protoboard.",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...COMPONENTES, ...J_PLACA, ...ESP], cor: [...PROTO, ...COMPONENTES, ...ESP],
    novo: [{ sel: J_ESP, de: [0, -15, 0] }],
    cam: { dir: [.45, -1, .25], foco: ["Protoboard_MB102"], zoom: 1.0 },
    rotulos: [
      { t: "VIN", pino: "VIN", o: [60, 10] }, { t: "D34", pino: "D34", o: [60, -10] }, { t: "D35", pino: "D35", o: [60, 0] },
      { t: "3V3", pino: "3V3", o: [-60, 10] }, { t: "D18 (servo)", pino: "D18", o: [-70, 0] }, { t: "D23 (botão)", pino: "D23", o: [-70, -20] },
      { t: "RX2/16 (DT)", pino: "RX2/16", o: [-70, 10] }, { t: "D4 (SCK)", pino: "D4", o: [-70, 20] },
    ],
    ...(() => { const t = tabela(["#", "Pino ESP32", "Vai para", "Cor"], [
      ["13", "**VIN**", "+5V, col. 39", "[vermelho]"], ["14", "**GND** (ao lado do VIN)", "GND esq., col. 40", "[preto]"], ["15", "**3V3**", "+3V3, col. 38", "[laranja]"],
      ["18", "**RX2/16**", "g30 (HX711 DT)", "[verde]"], ["19", "**D4**", "g31 (HX711 SCK)", "[azul]"], ["20", "**D34**", "j15 (divisor das pilhas)", "[roxo]"],
      ["21", "**D35**", "j7 (divisor da fonte)", "[cinza]"], ["24", "**D18**", "e62 (sinal do servo)", "[branco]"], ["26", "**D23**", "b1 (botão)", "[amarelo]"],
      ["28", "**D22**", "a13 (resistor do LED)", "[ciano]"],
    ]); return { html: t.html, md: t.md }; })(),
    pecas: [["10", "jumpers macho-fêmea"]],
    atencao: ["**VIN** recebe 5 V. Nunca ligue 5 V no pino **3V3** (queima a placa)."],
    confira: ["Continuidade: pino VIN ↔ trilho +5V; pino GND ↔ trilho GND; pino 3V3 ↔ trilho +3V3."],
  },
  {
    id: "d-9", modulo: "md", num: "D.9", titulo: "Teste na bancada e gravar o firmware", tipo: ["teste", "eletronica"], tempo: "30 min", quem: "Dupla 3",
    resumo: "Primeiro só com a fonte (sem USB), medindo tensões. Depois só com a USB, gravando o firmware. **Nunca as duas juntas.**",
    mostra: ["P05_bandeja_espinha", ...PROTO, ...COMPONENTES, ...ESP, ...J_PLACA, ...J_ESP], cor: ["*"],
    cam: { dir: [.35, -1, .2], foco: ["Protoboard_MB102"], zoom: 1.0 },
    rotulos: [
      { t: "+5V: 5,0 V", furo: "5V@30", tipo: "medida", o: [-70, 0] }, { t: "+3V3: 3,3 V", furo: "3V3@45", tipo: "medida", o: [70, 0] },
      { t: "j7: 2,1–2,3 V", furo: "j7", tipo: "medida", o: [70, 10] }, { t: "j15: 1,9–2,1 V", furo: "j15", tipo: "medida", o: [70, -10] },
      { t: "fonte: + em a3, − no GND", furo: "a3", tipo: "sinal", o: [-80, 20] },
    ],
    passos: [
      "Ligue a fonte 12 V provisoriamente: **+ no furo a3**, **− no trilho GND esquerdo** (ou já use o jack do pedestal, passo G.2).",
      "Ponha um jumper provisório de **a7 a a19** (faz o papel da chave).",
      "Meça com o multímetro: trilho +5V = **5,0 V**; trilho +3V3 = **3,3 V**; j7 ≈ **2,1–2,3 V**; j15 = 0 V (sem pilhas, normal).",
      "Desligue a fonte. Tire o jumper a7–a19.",
      "Só com a USB no computador, grave o firmware (`cd firmware && pio run -t upload`). Depois as atualizações vão pelo Wi-Fi.",
      "Abra o monitor serial (`pio device monitor`): o boot aparece sem reiniciar em loop.",
    ],
    atencao: ["Nunca ligue a USB com a fonte ou as pilhas ligadas."],
    confira: ["As 3 tensões batem.", "O LED azul da ESP32 acende e o serial mostra o boot."],
  },

  /* ============================================================ E — balança */
  {
    id: "e-1", modulo: "me", num: "E.1", titulo: "Estender os fios da célula", tipo: ["solda"], tempo: "15 min", quem: "Dupla 4",
    resumo: "Os 4 fios da célula (~20 cm) não chegam ao HX711. Emende **~35 cm** de cabo 4 vias, **mesmas cores**, e isole cada emenda.",
    mostra: [],
    novo: [{ sel: ["Celula_*"], de: [0, 0, 0] }],
    cam: { dir: [1, -.8, .7], zoom: 1.2 },
    rotulos: [
      { t: "fios saem desta ponta (fixa)", p: [0, -104, 17], tipo: "sinal", o: [60, -30] },
      { t: "seta gravada aponta para BAIXO", sel: "Celula_carga_5kg", o: [-80, 40] },
      { t: "silicone branco: não pode encostar em nada", sel: "Celula_extensometro_silicone", tipo: "aviso", o: [-60, -50] },
    ],
    ...(() => { const t = tabela(["Fio da célula", "Vai no HX711"], [["[vermelho]", "**E+**"], ["[preto]", "**E−**"], ["[branco]", "**A−**"], ["[verde]", "**A+**"]]); return { html: t.html, md: t.md }; })(),
    pecas: [["1", "célula de carga 5 kg"], ["~35 cm", "cabo 4 vias (de preferência trançado)"], ["—", "termorretrátil"]],
    passos: ["Emende cor com cor, cada emenda com termorretrátil.", "Trance levemente os 4 fios (menos ruído).", "Deixe as pontas soltas: elas são soldadas no HX711 na montagem final (G.4)."],
    confira: ["Multímetro: vermelho ↔ preto ≈ 1 kΩ; verde ↔ branco ≈ 1 kΩ (varia por fabricante; o importante é não estar aberto)."],
  },
  {
    id: "e-2", modulo: "me", num: "E.2", titulo: "Célula na base (lado fixo)", tipo: ["mecanica", "parafusos"], tempo: "10 min", quem: "Dupla 4",
    resumo: "A célula fica **em balanço**: a ponta de trás (a dos fios) presa no bloco da base; a ponta da frente livre, segurando a plataforma. **Seta para baixo.**",
    mostra: ["P07_base_balanca"],
    novo: [{ sel: ["Celula_*"], de: [0, 0, 45] }, { sel: ["Parafuso_M5x16_celula_fixo_*"], de: [0, 0, -40] }],
    cam: { dir: [1, -1, -.25], zoom: 1 },
    rotulos: [
      { t: "2 parafusos POR BAIXO (rasgo)", sel: "Parafuso_M5x16_celula_fixo_0", tipo: "sinal", o: [70, 30], segue: "Parafuso_M5x16_celula_fixo_0" },
      { t: "ponta dos fios → TRÁS (pedestal)", p: [0, -104, 20], o: [60, -40], segue: "Celula_carga_5kg" },
      { t: "braço: aparafusa no pedestal (G.3)", p: [0, -70, 20], o: [50, -60] },
    ],
    pecas: [["1", "P07 base da balança"], ["1", "célula com fios estendidos"], ["2", "M4 × 16 ou M5 × 16", "igual à rosca da célula; prefira M4"]],
    ferramentas: ["chave Phillips #2"],
    passos: [
      "Ponha a célula sobre o bloco da base com a **ponta dos fios para trás** (para o braço) e a **seta para baixo**.",
      "Vire o conjunto e aparafuse **2 parafusos por baixo**, pelo rasgo; a cabeça fica no rebaixo.",
    ],
    confira: ["A ponta da frente da célula fica no ar, sem tocar a base."],
  },
  {
    id: "e-3", modulo: "me", num: "E.3", titulo: "Espaçador e plataforma (lado livre)", tipo: ["mecanica", "parafusos"], tempo: "10 min", quem: "Dupla 4",
    resumo: "O espaçador (P09) vai entre a ponta livre da célula e a plataforma (P08); 2 parafusos **por cima** atravessam a plataforma e o espaçador e rosqueiam na célula.",
    mostra: ["P07_base_balanca", "Celula_*", "Parafuso_M5x16_*"],
    novo: [{ sel: ["P09_espacador"], de: [0, 0, 40] }, { sel: ["P08_plataforma"], de: [0, 0, 90] }, { sel: ["Parafuso_M4x16_*"], de: [0, 0, 130] }],
    cam: { dir: [1, -1.1, .6], zoom: 1 },
    rotulos: [
      { t: "P09 espaçador", sel: "P09_espacador", o: [80, 0], segue: "P09_espacador" },
      { t: "2 parafusos POR CIMA", sel: "Parafuso_M4x16_celula_livre_0", tipo: "sinal", o: [70, -20], segue: "Parafuso_M4x16_celula_livre_0" },
    ],
    pecas: [["1", "P09 espaçador"], ["1", "P08 plataforma"], ["2", "M4 × 16 (ou M5 × 16 de cabeça **chata**)"]],
    passos: ["Apoie o espaçador na ponta livre da célula, furos alinhados.", "Ponha a plataforma por cima (sulcos da vasilha para cima).", "Aparafuse os **2 parafusos por cima**, cabeças no rebaixo."],
    confira: ["A saia da plataforma **não encosta** na base em nenhum ponto."],
  },
  {
    id: "e-4", modulo: "me", num: "E.4", titulo: "Batentes de sobrecarga", tipo: ["parafusos", "medir"], tempo: "10 min", quem: "Dupla 4",
    resumo: "3 parafusos M3 × 12 rosqueados nos postes da base. A **cabeça** fica **~1 mm abaixo** da plataforma: se o pet subir, a plataforma apoia nos batentes e a célula não entorta.",
    mostra: ["P07_base_balanca", "Celula_*", "Parafuso_M5x16_*", "P09_espacador"], fantasma: ["P08_plataforma"],
    novo: [{ sel: ["Parafuso_M3x12_batente_*"], de: [0, 0, 40] }],
    cam: { dir: [.9, -1, .9], zoom: 1 },
    rotulos: [0, 1, 2].map((i) => ({ t: "batente " + (i + 1), sel: "Parafuso_M3x12_batente_" + i, tipo: "sinal", o: [i === 1 ? -60 : 60, -20], segue: "Parafuso_M3x12_batente_" + i })),
    pecas: [["3", "M3 × 12 inox cabeça panela"]],
    passos: [
      "Rosqueie um parafuso em cada poste (dá para fazer antes de pôr a plataforma e ajustar depois por baixo dela).",
      "Ajuste a altura: uma folha de papel dobrada 3 vezes (~1 mm) entre a cabeça e a plataforma tem que passar justa.",
    ],
    confira: ["Apertando a plataforma com o dedo ela desce ~1 mm e para nos batentes; soltando, volta e fica **livre**."],
  },

  /* ============================================================ F — patas */
  {
    id: "f-1", modulo: "mf", num: "F.1", titulo: "Lastro, tampas e pés das 4 patas", tipo: ["cola"], tempo: "30 min", quem: "Dupla 2",
    resumo: "Cada pata tem um bolso para peso. Enche, cola a tampa de **mesmo nome** (rente ao topo) e cola o pé de borracha embaixo da ponta. **TD** = trás-direita, **TE** = trás-esquerda, **FE** = frente-esquerda, **FD** = frente-direita.",
    mostra: [],
    novo: ["TD", "TE", "FE", "FD"].flatMap((k) => [{ sel: ["P12_pata_" + k], de: [0, 0, 0] }, { sel: ["P13_tampa_" + k], de: [0, 0, 45] }]),
    cam: { dir: [.8, -1, 1.2], zoom: .9 },
    rotulos: ["TD", "TE", "FE", "FD"].map((k) => ({ t: "P12 " + k + " + P13 " + k, sel: "P12_pata_" + k, tipo: "sinal", o: [k.endsWith("D") ? 60 : -60, k.startsWith("T") ? -30 : 30] })),
    pecas: [["4", "P12 patas (TD, TE, FE, FD)"], ["4", "P13 tampas (TD, TE, FE, FD)"], ["~0,5 kg", "porcas M8 ou arruelas de aço", "ou ~185 g de areia seca em saquinho"], ["4", "pés de borracha Ø 12 (iguais aos do pedestal)"]],
    passos: [
      "Encha o bolso de cada pata com porcas/arruelas (~120 g por pata), sem passar do degrau da tampa.",
      "Passe cola (instantânea gel ou quente) no degrau e encaixe a **tampa de mesmo nome**: ela fica rente ao topo.",
      "Cole um pé de borracha no rebaixo embaixo da ponta de cada pata.",
    ],
    atencao: ["Não use chumbo (chumbada de pesca), ímãs nem pilhas velhas como lastro."],
    confira: ["Nenhuma peça chacoalha dentro da pata.", "As tampas não ficam acima do topo."],
  },

  /* ============================================================ G — montagem final */
  {
    id: "g-1", modulo: "mg", num: "G.1", titulo: "Bandeja com a eletrônica no pedestal", tipo: ["mecanica"], tempo: "5 min", quem: "todos",
    resumo: "A bandeja (com a protoboard pronta do módulo D) **apoia** no degrau interno do pedestal, sem parafuso. Os fios do pedestal sobem pela **abertura da frente** da bandeja; os do jack pela **abertura de trás**.",
    mostra: PEDESTAL, cor: PEDESTAL,
    novo: [{ sel: ELETRONICA, de: [0, 0, 120] }],
    cam: { dir: [1, -1.4, .8], zoom: .95 },
    rotulos: [
      { t: "abertura da FRENTE: fios do painel, pilhas e célula", p: [0, -30, 24], tipo: "sinal", o: [-70, 40] },
      { t: "abertura de TRÁS: fios do jack", p: [0, 38.5, 24], o: [70, 30] },
      { t: "apoia no degrau (sem parafuso)", sel: "P05_bandeja_espinha", o: [70, 60], segue: "P05_bandeja_espinha" },
    ],
    passos: [
      "Passe os fios do painel e das pilhas pela abertura da frente da bandeja e os do jack pela de trás.",
      "Desça a bandeja até apoiar no degrau, com a protoboard virada para a **FRENTE** (lado da canaleta da balança).",
    ],
    confira: ["A bandeja assenta reta e nenhum fio ficou preso embaixo dela."],
  },
  {
    id: "g-2", modulo: "mg", num: "G.2", titulo: "Ligar os fios do pedestal", tipo: ["eletronica"], tempo: "15 min", quem: "Dupla 3",
    resumo: "Os 10 fios do jack, pilhas, chave, botão e LED espetam na protoboard (pontas macho). Confira a etiqueta de cada um.",
    mostra: [...PEDESTAL, ...ELETRONICA], cor: [...ELETRONICA],
    novo: [{ sel: F_PED, de: [0, 0, 0] }],
    cam: { dir: [.9, -1.2, .5], foco: ["P06_pedestal", "Protoboard_MB102"], zoom: .8 },
    rotulos: [
      { t: "1/2: jack → a3 / GND col. 4", furo: "a3", o: [-80, 30] }, { t: "3/4: pilhas → a11 / GND col. 10", furo: "a11", o: [-90, 0] },
      { t: "5/6: chave → a7 / a19", furo: "a19", o: [-80, -20] }, { t: "25/27: botão → a1 / GND col. 5", furo: "a1", o: [-80, 50] },
      { t: "29/30: LED → a17 / GND col. 15", furo: "a17", o: [-80, -40] },
    ],
    ...(() => { const t = tabela(["#", "Fio", "Furo"], [
      ["1", "Jack J+ [vermelho]", "**a3**"], ["2", "Jack J− [preto]", "GND esq., col. **4**"], ["3", "Pilhas + [vermelho]", "**a11**"], ["4", "Pilhas − [preto]", "GND esq., col. **10**"],
      ["5", "Chave SW1 [amarelo]", "**a7**"], ["6", "Chave SW2 [amarelo]", "**a19**"], ["25", "Botão BT [amarelo]", "**a1**"], ["27", "Botão BT− [preto]", "GND esq., col. **5**"],
      ["29", "LED+ [verde]", "**a17**"], ["30", "LED− [preto]", "GND esq., col. **15**"],
    ]); return { html: t.html, md: t.md }; })(),
    atencao: ["Chave geral **desligada** e fonte **fora da tomada** durante as ligações."],
    confira: ["Os 10 fios estão nos furos certos (confira pela etiqueta, não pela cor).", "Folga de ~15 cm nos fios das pilhas: a gaveta ainda abre."],
  },
  {
    id: "g-3", modulo: "mg", num: "G.3", titulo: "Balança no pedestal", tipo: ["parafusos"], tempo: "10 min", quem: "Dupla 4",
    resumo: "O braço da base da balança encosta na **frente** do pedestal e é preso por **2 × M3 × 12**. Os fios da célula vão pela **canaleta** embaixo do pedestal e sobem pela chaminé da frente.",
    mostra: [...PEDESTAL, ...ELETRONICA, ...F_PED],
    novo: [{ sel: BALANCA, de: [0, -80, 0] }, { sel: ["Parafuso_M3x12_braco_*"], de: [0, -110, 0] }],
    cam: { dir: [1.3, -1, .6], foco: ["P06_pedestal", "P07_base_balanca", "P08_plataforma"], zoom: .85 },
    rotulos: [
      { t: "2 × M3 × 12 pelo braço", sel: "Parafuso_M3x12_braco_1", tipo: "sinal", o: [70, -50], segue: "Parafuso_M3x12_braco_1" },
      { t: "canaleta dos fios da célula (por baixo)", p: [0, -66, 5], o: [-60, 70] },
    ],
    pecas: [["1", "balança montada (módulo E)"], ["2", "M3 × 12"]],
    passos: [
      "Passe os 4 fios da célula pela canaleta da frente (por baixo do pedestal) e suba pela chaminé até a abertura da frente da bandeja.",
      "Encoste a aba do braço na frente do pedestal e aparafuse **2 × M3 × 12**.",
    ],
    confira: ["A plataforma continua **livre** (só a célula a segura) e não encosta no pedestal."],
  },
  {
    id: "g-4", modulo: "mg", num: "G.4", titulo: "Soldar a célula no HX711", tipo: ["solda"], tempo: "10 min", quem: "Dupla 3",
    resumo: "Os 4 fios da célula soldam nos furos da ponta direita do HX711: **E+, E−, A−, A+**.",
    mostra: [...PEDESTAL, ...ELETRONICA, ...F_PED, ...BALANCA, "Parafuso_M3x12_braco_*"], cor: [...ELETRONICA],
    novo: [{ sel: F_CEL, de: [0, 0, 0] }],
    cam: { dir: [.5, -1, .4], foco: [...HX, "Protoboard_MB102"], zoom: .55 },
    rotulos: [
      { t: "E+ vermelho", p: padHx("E+"), o: [60, -30] }, { t: "E− preto", p: padHx("E-"), o: [60, -10] },
      { t: "A− branco", p: padHx("A-"), o: [60, 10] }, { t: "A+ verde", p: padHx("A+"), o: [60, 30] },
    ],
    passos: ["Solde cada fio no furo do nome certo, por trás da placa ou por cima, sem encostar estanho entre furos vizinhos.", "Prenda o cabo na espinha com uma abraçadeira, com folga."],
    atencao: ["Se no teste o peso der **negativo**, troque A+ com A−."],
    confira: ["Sem pontes de solda entre os furos E+/E−/A−/A+."],
  },
  {
    id: "g-5", modulo: "mg", num: "G.5", titulo: "Teste geral antes de fechar", tipo: ["teste", "eletronica"], tempo: "20 min", quem: "todos",
    resumo: "Com o tubo ainda **fora**, segurado ~18 cm acima do pedestal, ligue o servo e teste tudo. Corrigir agora é fácil; depois tem que tirar o tubo.",
    mostra: [...PEDESTAL, ...ELETRONICA, ...F_PED, ...F_CEL, ...BALANCA, "Parafuso_M3x12_braco_*"], cor: ["*"],
    novo: [{ sel: [...TUBO, "P01_piso_dosador", "P02_anel_escudo", "P03_rotor", "P10_chapeu", "Servo_braco_duplo", "Servo_MG90S_360", "Servo_saida_cabo", "P04_bica", "Parafuso_M3x10_*", "Parafuso_M3x8_*"], de: [0, 0, 180] },
      { sel: ["Servo_conector_femea", "Servo_fio_*"], de: [0, -20, 0] }],
    cam: { dir: [1, -1.3, .45], foco: ["P06_pedestal", "Protoboard_MB102", "Servo_MG90S_360", "P01_piso_dosador"], zoom: 1.05 },
    rotulos: [
      { t: "cabo do servo: MARROM em c60", sel: "Servo_conector_femea", tipo: "sinal", o: [-80, -20] },
      { t: "tubo erguido ~18 cm", p: [50, 0, 300], o: [60, 0] },
    ],
    passos: [
      "Um colega segura o tubo (com cartucho e bica) uns **18 cm** acima do pedestal.",
      "Encaixe o conector do servo nos pinos **c60–c62**: **marrom em c60** (GND), vermelho c61, laranja c62.",
      "Fonte na tomada → **ligue a chave**. O LED do pedestal pisca devagar (ainda sem Wi-Fi).",
      "Pelo serial ou pelo app: balança muda ao apertar a plataforma; botão é reconhecido; bateria aparece.",
      "**Ajuste o \"parado\" do servo** (`servo_trim` / App → Ajustes → Servo) até o rotor ficar **totalmente parado**.",
      "Mande \"avançar\" e \"recuar\": o rotor gira suave nos dois sentidos.",
      "Desligue a chave e tire a fonte da tomada.",
    ],
    confira: ["Rotor parado de verdade em \"parado\".", "ESP32 não reinicia quando o servo gira (se reiniciar: confira 5,0 V e o 470 µF)."],
  },
  {
    id: "g-6", modulo: "mg", num: "G.6", titulo: "Tubo no pedestal", tipo: ["mecanica", "parafusos"], tempo: "10 min", quem: "todos",
    resumo: "Desça o tubo no **soquete** do pedestal: a protoboard e a bandeja entram por dentro dele. A **janela/bica** fica para a **FRENTE** (lado da balança). Trave com **2 × M3 × 20** nas laterais.",
    mostra: [...PEDESTAL, ...ELETRONICA, ...F_PED, ...F_CEL, ...BALANCA, "Parafuso_M3x12_braco_*"],
    novo: [{ sel: [...TUBO, ...CARTUCHO, "P04_bica", "Parafuso_M3x10_*", "Parafuso_M3x8_*"], de: [0, 0, 150] },
      { sel: ["Parafuso_M3x20_pedestal_0"], de: [35, 0, 0] }, { sel: ["Parafuso_M3x20_pedestal_1"], de: [-35, 0, 0] }],
    cam: { dir: [1, -1.2, .45], foco: ["P06_pedestal", "Parafuso_M3x20_*"], zoom: 1.3 },
    rotulos: [
      { t: "M3 × 20 (DIREITA)", sel: "Parafuso_M3x20_pedestal_0", tipo: "sinal", o: [60, 10], segue: "Parafuso_M3x20_pedestal_0" },
      { t: "bica para a FRENTE (sobre a balança)", sel: "P04_bica", o: [-70, -20], segue: "P04_bica" },
      { t: "M3 × 20 (ESQUERDA)", sel: "Parafuso_M3x20_pedestal_1", tipo: "sinal", o: [-60, 20], segue: "Parafuso_M3x20_pedestal_1" },
    ],
    pecas: [["2", "M3 × 20"]],
    passos: [
      "Desça o tubo devagar, guiando os fios para não prender nenhum na borda.",
      "Gire até o furo de 7,5 mm de cada lateral alinhar com o furo do pedestal.",
      "Aparafuse **2 × M3 × 20** pelas laterais do pedestal: o parafuso rosqueia no pedestal e a ponta entra no furo do tubo como pino.",
    ],
    confira: ["Tubo assentado até o fundo do soquete.", "A bica fica centrada sobre a plataforma."],
  },
  {
    id: "g-7", modulo: "mg", num: "G.7", titulo: "Patas no pedestal", tipo: ["parafusos"], tempo: "15 min", quem: "Dupla 2",
    resumo: "Cada pata só encaixa no seu lugar. A aba abraça o pedestal e leva **2 × M3 × 12**.",
    mostra: [...PEDESTAL, ...BALANCA, "Parafuso_M3x12_braco_*", "Parafuso_M3x20_*"],
    novo: [
      { sel: ["P12_pata_TD", "P13_tampa_TD"], de: [60, 60, 0] }, { sel: ["P12_pata_TE", "P13_tampa_TE"], de: [-60, 60, 0] },
      { sel: ["P12_pata_FE", "P13_tampa_FE"], de: [-60, -60, 0] }, { sel: ["P12_pata_FD", "P13_tampa_FD"], de: [60, -60, 0] },
      { sel: ["Parafuso_M3x12_pata_*"], de: [0, 0, 0] },
    ],
    cam: { dir: [.7, -1, 1.5], foco: ["P12_*", "P08_plataforma"], zoom: .95 },
    rotulos: [
      { t: "TD", sel: "P12_pata_TD", tipo: "sinal", o: [50, -20], segue: "P12_pata_TD" }, { t: "TE", sel: "P12_pata_TE", tipo: "sinal", o: [-50, -20], segue: "P12_pata_TE" },
      { t: "FE", sel: "P12_pata_FE", tipo: "sinal", o: [-50, 20], segue: "P12_pata_FE" }, { t: "FD", sel: "P12_pata_FD", tipo: "sinal", o: [50, 20], segue: "P12_pata_FD" },
      { t: "2 × M3 × 12 por pata", sel: "Parafuso_M3x12_pata_6", o: [80, 40] },
    ],
    pecas: [["4", "patas prontas (módulo F)"], ["8", "M3 × 12"]],
    passos: ["Encoste cada pata no seu lugar (TD trás-direita…).", "Aperte **2 × M3 × 12** por pata, pela aba, até encostar."],
    confira: ["A gaveta abre entre as patas.", "A plataforma da balança não encosta em nenhuma pata.", "O alimentador não balança (os 8 pés tocam a mesa)."],
  },
  {
    id: "g-8", modulo: "mg", num: "G.8", titulo: "Vasilha, cap e calibração", tipo: ["teste"], tempo: "40 min", quem: "todos",
    resumo: "Montado! Falta ligar, configurar o Wi-Fi, calibrar e encher.",
    mostra: ["*"], contexto: false,
    novo: [{ sel: ["Vasilha_inox"], de: [0, 0, 80] }, { sel: ["Cap_superior"], de: [0, 0, 80] }],
    cam: { dir: [1.1, -1.5, .7], zoom: .95 },
    rotulos: [{ t: "cap só encaixado (abre para encher)", sel: "Cap_superior", o: [60, 0], segue: "Cap_superior" }, { t: "vasilha inox Ø 140–160, ≤ 60 mm", sel: "Vasilha_inox", o: [-70, 20], segue: "Vasilha_inox" }],
    passos: [
      "Chave desligada → fonte na tomada → liga a chave. LED pisca devagar.",
      "No celular, conecte na rede **\"Alimentador-XXXXXX\"** com a **senha da etiqueta** e escolha o Wi-Fi da casa.",
      "No app: parear → **calibrar a balança** (plataforma vazia → peso conhecido, ex. pacote de 500 g → vasilha vazia).",
      "**Calibrar a bateria**: meça as pilhas com o multímetro e digite a tensão.",
      "Encha o tubo até ~2 cm da borda, encaixe o **cap** e toque **\"Reabasteci\"**.",
      "Faça **5 refeições de 20 g** conferindo no app.",
      "Tire a fonte da tomada: o app mostra **\"usando pilhas\"**. Recoloque.",
    ],
    confira: ["Erro das 5 doses ≤ 3 g.", "Nenhum reinício.", "App mostra bateria, nível de ração e vasilha."],
  },
];
