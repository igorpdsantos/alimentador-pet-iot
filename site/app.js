// Alimentador de Pet IoT — página do projeto
// 3D: modelo real do CAD (site/modelo/alimentador.min.glb). Simulação com a lógica do firmware (specs/04):
// rotor de 6 bolsos que enchem no reservatório e despejam na saída, dosagem em malha fechada pela balança,
// nível do tubo = carga − servido, LED de status (aceso / lento sem Wi-Fi / rápido com erro), botão do
// pedestal (clique = 20 g; segurar 3 s = reabasteci), chave liga/desliga e no-break (fonte ↔ pilhas). Tour guiado.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const D = JSON.parse(document.getElementById("dados").textContent);
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem storage */ } };
const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } };
const fmt = (n, c = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c });
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/* ------------------------------------------------------------------ tema */
(() => {
  const salvo = ler("alimentador-tema", null);
  if (salvo) document.documentElement.dataset.theme = salvo;
  $("#tema").addEventListener("click", () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = escuro ? "light" : "dark";
    guardar("alimentador-tema", document.documentElement.dataset.theme);
  });
})();

/* ================================================================== 3D: cena e materiais */
const palco = $("#palco"), tela = $("#tela");
const COR = { grafite: 0x2e3331, cinza: 0xc3c8c1, sinal: 0xf2be0f, branco: 0xf3f4f0, inox: 0xd2d6db, aluminio: 0xc9ced6,
  servo: 0x1b1f22, placa: 0xe6e3da, racao: 0xb8782f };
const hospede = (nome) => nome.split("#")[0];                  // "P06_pedestal#paraf" acompanha o pedestal
function material(nome, malha) {
  const std = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: .6, metalness: 0, ...o });
  if (nome.endsWith("#paraf")) return std(0xb9bec4, { metalness: .9, roughness: .32 });                // parafusos de aço
  if (nome.endsWith("#tex")) {
    const map = malha.material.map;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return std(0xffffff, { map, roughness: .55 });
  }           // serigrafia das placas
  if (malha && malha.geometry.attributes.color) {                                                      // componentes da montagem: cor real por vértice
    if (nome === "REF_pilhas_6AA") return std(0xffffff, { vertexColors: true, roughness: .3, metalness: .35 });
    if (nome === "REF_celula_5kg" || nome === "REF_imas_6x2_gaveta") return std(0xffffff, { vertexColors: true, roughness: .3, metalness: .85 });
    return std(0xffffff, { vertexColors: true, roughness: nome === "REF_fios" ? .35 : .5 });
  }
  if (nome === "REF_tubo_PVC_DN100") return std(COR.branco, { roughness: .2, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide });
  if (nome === "REF_cap_superior") return std(COR.branco, { roughness: .35, transparent: true, opacity: .6 });
  if (nome === "REF_vasilha_maior") return std(COR.inox, { metalness: .55, roughness: .28, side: THREE.DoubleSide, envMapIntensity: 1.3 });
  if (nome === "REF_celula_5kg") return std(COR.aluminio, { metalness: .85, roughness: .33 });
  if (nome === "REF_servo_MG90S_360") return std(COR.servo, { roughness: .5 });
  if (nome === "REF_braco_servo") return std(COR.branco);
  if (nome === "REF_pilhas_6AA") return std(0x23262a, { roughness: .4, metalness: .25 });
  if (nome === "REF_protoboard_ESP32_modulos") return std(COR.placa, { roughness: .75 });
  if (nome === "REF_imas_6x2_gaveta") return std(0x9aa0a8, { metalness: 1, roughness: .25 });
  const cod = nome.slice(0, 3);
  if (cod === "P03" || cod === "P11" || cod === "P13") return std(COR.sinal, { roughness: .5 });   // o que gira/abre/tampa
  if (cod === "P07" || cod === "P08" || cod === "P09") return std(COR.cinza, { roughness: .55 });  // balança
  return std(COR.grafite, { roughness: .58 });                                                     // estrutura
}
function deslocamento(nome, centro) {
  const tab = {
    REF_cap_superior: V3(0, 420, 0), REF_tubo_PVC_DN100: V3(0, 250, 0), P10_chapeu: V3(0, 190, 0),
    P02_anel_escudo: V3(0, 120, 0), P03_rotor: V3(0, 70, 0), REF_braco_servo: V3(0, 40, 0), P01_piso_dosador: V3(0, 15, 0),
    REF_servo_MG90S_360: V3(0, -20, 0), P04_bica: V3(0, 10, 120), P05_bandeja_espinha: V3(0, -10, -150),
    REF_protoboard_ESP32_modulos: V3(0, -10, -150), P06_pedestal: V3(0, -40, 0), PAINEL: V3(0, -40, 0), P11_gaveta_pilhas: V3(-170, -40, 0),
    REF_pilhas_6AA: V3(-170, -10, 0), REF_imas_6x2_gaveta: V3(-170, -40, 0), P07_base_balanca: V3(0, -50, 90),
    REF_celula_5kg: V3(0, -10, 90), P09_espacador: V3(0, 15, 90), P08_plataforma: V3(0, 45, 90), REF_vasilha_maior: V3(0, 110, 90),
  };
  nome = hospede(nome);
  if (tab[nome]) return tab[nome].clone();
  if (nome.startsWith("P12") || nome.startsWith("P13")) return V3(centro.x, 0, centro.z).normalize().multiplyScalar(110).add(V3(0, nome.startsWith("P13") ? 10 : -40, 0));
  return V3(0, 0, 0);
}
const FICHAS_EXTRA = {
  PAINEL_botao: { nome: "Botão do pedestal", func: "Um clique serve a porção padrão (20 g). Segurado por 3 s registra \"reabasteci\" e o nível volta para cheio. Clique nele para testar.", mat: "Push-button 12 mm, NA · GPIO 23" },
  PAINEL_chave: { nome: "Chave liga/desliga", func: "Corta a alimentação depois dos diodos: desliga fonte e pilhas juntas. Clique para desligar e ligar.", mat: "KCD11 · 3 A" },
  PAINEL_led: { nome: "LED de status", func: "Aceso: tudo certo. Piscando devagar: sem Wi-Fi (a agenda continua). Piscando rápido: erro, como reservatório vazio.", mat: "LED 5 mm + 220 Ω · GPIO 22" },
  PAINEL_jack: { nome: "Entrada 12 V", func: "Fonte de 12 V na tomada. Se ela cair, as 6 pilhas AA assumem sem desligar. Clique para tirar e pôr na tomada.", mat: "Jack P4 5,5 × 2,1 mm" },
};
const PECA = (nome) => { nome = hospede(nome); return FICHAS_EXTRA[nome] || D.fichas[nome] || D.fichas[nome.slice(0, 3)] || null; };
const ROTULOS = [
  ["P10_chapeu", "Chapéu 55°"], ["P03_rotor", "Rotor · 6 bolsos"], ["P04_bica", "Bica"],
  ["REF_protoboard_ESP32_modulos", "ESP32 + HX711"], ["REF_celula_5kg", "Célula 5 kg"], ["PAINEL_botao", "Botão · 20 g"],
  ["P11_gaveta_pilhas", "Gaveta 6×AA"], ["REF_tubo_PVC_DN100", "Ração · 1,2 kg", .45],
];

let renderer, cena, camera, controles, raiz, pivoRotor, malhas = [], porNome = {};
let explodirAlvo = 0, explodirAtual = 0, corte = false, corteC = 1000, rodando = false, ativo = true, selecionada = null, isolada = null;
let gavetaAlvo = 0, gavetaAtual = 0, demoRotor = false, aneis = null;
const planoCorte = new THREE.Plane(V3(-1, 0, 0), 1000);
const ALVO0 = V3(0, 300, 40), POS0 = V3(820, 560, 1040), DIR0 = V3(.6, .32, .73).normalize();
let camTween = null, zoomEx = null;

function iniciar3D() {
  try { renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { return falha3D(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cena = new THREE.Scene();
  cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  camera = new THREE.PerspectiveCamera(30, 1, 5, 9000);
  camera.position.copy(POS0);
  controles = new OrbitControls(camera, tela);
  Object.assign(controles, { enableDamping: true, dampingFactor: .08, minDistance: 160, maxDistance: 3200, maxPolarAngle: Math.PI * .52, autoRotate: !calmo, autoRotateSpeed: .5 });
  controles.target.copy(ALVO0);
  controles.addEventListener("start", () => { controles.autoRotate = false; camTween = null; zoomEx = null; $("#dica").classList.add("some"); });

  cena.add(new THREE.HemisphereLight(0xf3f6ee, 0x30302a, .6));
  const sol = new THREE.DirectionalLight(0xffffff, 1.55);
  sol.position.set(500, 1200, 700);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -600, right: 600, top: 700, bottom: -600, near: 100, far: 3000 });
  sol.shadow.bias = -.0004;
  cena.add(sol);
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: .22 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(D.glb || "modelo/alimentador.min.glb", (gltf) => {
    raiz = gltf.scene;
    pivoRotor = new THREE.Group();
    raiz.traverse((o) => {
      if (!o.isMesh) return;
      o.name = o.name.replace(/_\d+$/, "");
      o.material = material(o.name, o);
      o.castShadow = o.name !== "REF_tubo_PVC_DN100" && o.name !== "REF_cap_superior";
      o.receiveShadow = true;
      registrar(o);
    });
    if (porNome.REF_fios) criarFios(porNome.REF_fios);
    cena.add(raiz);
    raiz.updateMatrixWorld(true);
    criarPainel();
    for (const m of malhas) prepararMalha(m);
    for (const n of ["P03_rotor", "REF_braco_servo"]) if (porNome[n]) pivoRotor.attach(porNome[n]);
    raiz.add(pivoRotor);
    enquadrar();
    criarRotulos();
    criarRacao();
    criarAneis();
    atualizarEnergia();
    $("#carregando").hidden = true;
  }, (ev) => { if (ev.total) $("#progresso").style.width = Math.round(100 * ev.loaded / ev.total) + "%"; }, falha3D);

  new ResizeObserver(redimensionar).observe(palco);
  redimensionar();
  new IntersectionObserver(([e]) => { ativo = e.isIntersecting; }, { threshold: 0 }).observe(palco);
  ligarControles();
  renderer.setAnimationLoop(quadro);
}
let fiosMesh = null;
function criarFios(dupont) {
  // os 37 fios da montagem vêm só como traçado (linha central + cor); o tubo é montado aqui, liso e leve
  const geos = dupont.userData.fios.map((f) => {
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(f.pts.map((p) => V3(...p))), Math.max(12, f.pts.length * 3), .62, 7);
    const c = new THREE.Color(f.cor), n = g.attributes.position.count, cs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) c.toArray(cs, i * 3);
    g.setAttribute("color", new THREE.BufferAttribute(cs, 3));
    return g;
  });
  fiosMesh = new THREE.Mesh(mergeGeometries(geos), material("REF_fios", { geometry: { attributes: { color: 1 } } }));
  fiosMesh.name = "REF_fios";
  fiosMesh.castShadow = true;
  dupont.parent.add(fiosMesh);
  registrar(fiosMesh);
}
function registrar(o) {
  o.geometry.computeBoundingBox();
  if (o.material) o.material.clippingPlanes = [planoCorte];
  malhas.push(o);
  porNome[o.name] = o;
}
function prepararMalha(m) {
  m.updateMatrixWorld(true);
  const c = m.geometry.boundingBox.getCenter(V3(0, 0, 0));
  m.userData.centroLocal = c;
  m.userData.base = m.position.clone();
  m.userData.desloc = deslocamento(m.name.startsWith("PAINEL") ? "PAINEL" : m.name, m.localToWorld(c.clone()));
  m.userData.opac = m.material.opacity;
  m.userData.transp = m.material.transparent;
}
function enquadrar() {
  const bb = new THREE.Box3().setFromObject(raiz), tam = bb.getSize(V3(0, 0, 0)), c = bb.getCenter(V3(0, 0, 0));
  const vfov = THREE.MathUtils.degToRad(camera.fov), hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
  const dist = Math.max((tam.y * .5) / Math.tan(vfov / 2), (Math.max(tam.x, tam.z) * .5) / Math.tan(hfov / 2)) * (camera.aspect < .8 ? 1.75 : 1.45);
  ALVO0.copy(c).add(V3(0, -tam.y * (camera.aspect < .8 ? .1 : .04), 0));
  POS0.copy(ALVO0).addScaledVector(DIR0, dist);
  controles.target.copy(ALVO0);
  camera.position.copy(POS0);
  controles.maxDistance = dist * 2.5;
}
function falha3D() {
  $("#carregando").hidden = true; tela.hidden = true; $("#reserva").hidden = false; $("#doca").hidden = true; $("#visor").hidden = true;
  $("#dica").textContent = "Seu navegador não abriu o 3D; veja as imagens e baixe o STEP abaixo.";
}
function redimensionar() {
  if (!renderer) return;
  const w = palco.clientWidth, h = palco.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w < 600 ? 38 : 30;
  aplicarDeslocamento();
}
// com o cartão do tour aberto, o assunto vai para a área livre (esquerda no desktop, acima no celular)
function aplicarDeslocamento() {
  const w = palco.clientWidth, h = palco.clientHeight, tour = !$("#tour").hidden;
  if (tour && w >= 700) camera.setViewOffset(w, h, w * .17, 0, w, h);
  else if (tour) camera.setViewOffset(w, h, 0, h * .14, w, h);
  else camera.clearViewOffset();
  camera.updateProjectionMatrix();
}

/* ------------------------------------------------------------------ painel do pedestal (LED, botão, chave, jack) */
let led, botaoAtuador, chaveBascula;
function criarPainel() {
  const mat = (cor, o = {}) => new THREE.MeshStandardMaterial({ color: cor, roughness: .5, ...o });
  const eixoX = (geo) => geo.rotateZ(-Math.PI / 2);
  // posições (Y para cima, +Z = frente): parede direita do pedestal em x = 70, altura 10,5 mm
  led = new THREE.Mesh(eixoX(new THREE.CapsuleGeometry(2.5, 3, 4, 12)), mat(0x1f5f34, { emissive: 0x36e07a, emissiveIntensity: 0, transparent: true, opacity: .95 }));
  led.position.set(71.5, 10.5, 20); led.name = "PAINEL_led";
  const cabeca = new THREE.Mesh(eixoX(new THREE.CylinderGeometry(8.5, 8.5, 2.4, 28)), mat(0x9aa0a6, { metalness: .8, roughness: .3 }));
  botaoAtuador = new THREE.Mesh(eixoX(new THREE.CylinderGeometry(5.5, 5.5, 3.2, 24)), mat(COR.sinal));
  cabeca.position.set(71.2, 10.5, -16); botaoAtuador.position.set(73.6, 10.5, -16);
  cabeca.name = botaoAtuador.name = "PAINEL_botao";
  const moldura = new THREE.Mesh(new THREE.BoxGeometry(1.8, 10.5, 15.5), mat(0x1a1d1c));
  moldura.position.set(70.9, 10.5, 3);
  chaveBascula = new THREE.Mesh(new THREE.BoxGeometry(3, 8, 12), mat(0x111312, { roughness: .35 }));
  chaveBascula.position.set(72, 10.5, 3);
  moldura.name = chaveBascula.name = "PAINEL_chave";
  const jack = new THREE.Mesh(new THREE.TorusGeometry(5, 1.6, 10, 28), mat(0x8d9399, { metalness: .9, roughness: .3 }));
  jack.position.set(0, 9, -71); jack.name = "PAINEL_jack";
  const plugue = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.6, 26, 20).rotateX(Math.PI / 2), mat(0x151718));
  plugue.position.set(0, 9, -84); plugue.name = "PAINEL_jack";
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 140, 10).rotateX(Math.PI / 2), mat(0x151718));
  cabo.position.set(0, 9, -166); cabo.name = "PAINEL_jack";
  plugue.userData.plugue = cabo.userData.plugue = true;
  for (const m of [led, cabeca, botaoAtuador, moldura, chaveBascula, jack, plugue, cabo]) {
    m.castShadow = true;
    raiz.add(m);
    registrar(m);
    m.userData.painel = true;
  }
}

/* ------------------------------------------------------------------ rótulos */
const camadaRotulos = $("#rotulos3d");
let rotulos = [];
function criarRotulos() {
  rotulos = ROTULOS.filter(([n]) => porNome[n]).map(([n, txt, fy]) => {
    const el = document.createElement("button");
    el.type = "button"; el.className = "r3d"; el.innerHTML = `<span>${txt}</span>`;
    el.addEventListener("click", () => clicarPeca(porNome[n]));
    camadaRotulos.appendChild(el);
    const m = porNome[n], c = m.userData.centroLocal.clone();
    if (fy) { const bb = m.geometry.boundingBox; c.y = bb.min.y + (bb.max.y - bb.min.y) * (1 - fy); }
    return { el, m, c };
  });
}
const tmp = V3(0, 0, 0);
function moverRotulos() {
  const w = palco.clientWidth, h = palco.clientHeight;
  for (const r of rotulos) {
    tmp.copy(r.c); r.m.localToWorld(tmp); tmp.project(camera);
    const vis = tmp.z < 1 && r.m.visible && !(isolada && isolada !== r.m);
    const x = (tmp.x * .5 + .5) * w, y = (-tmp.y * .5 + .5) * h, esq = x > w * .62;
    r.el.style.opacity = vis ? "" : "0";
    r.el.classList.toggle("esq", esq);
    r.el.style.transform = `translate(${esq ? x - r.el.offsetWidth + 4 : x - 4}px, ${y - r.el.offsetHeight / 2}px)`;
  }
}

/* ------------------------------------------------------------------ ração: reservatório, bolsos e queda */
const MASSA_GRAO = .18, GRAOS_BOLSO = 56, G_BOLSO = GRAOS_BOLSO * MASSA_GRAO, VIS_BOLSO = 18, MAX_QUEDA = 720;
const est = { ligado: true, tomada: true, wifi: true, capacidade: 1220, estoque: 1180, erro: null, pilhas: 98 };
let estoqueMesh, nEstoque = 0, bolsosMesh, bolsos = [], quedaMesh, queda = [], pesoReal = 0, pesoVisor = 0, tara = 0;
let giroAlvo = 0, giroAtual = 0;
// croquete de raça pequena (cão de 5 kg): disco Ø 9 × 4,5 mm, borda arredondada, topo levemente abaulado
const geoGrao = (() => {
  const perfil = [[0, -2.3], [3.6, -2.3], [4.9, -1.9], [5.5, -.8], [5.6, .2], [5.2, 1.4], [4.2, 2.3], [2.4, 2.8], [0, 2.95]].map(([x, y]) => new THREE.Vector2(x * .82, y * .86));
  const g = new THREE.LatheGeometry(perfil, 14);
  const p = g.attributes.position;                                   // bordas irregulares, como grão extrusado de verdade
  for (let i = 0; i < p.count; i++) {
    const ang = Math.atan2(p.getZ(i), p.getX(i)), k = 1 + .05 * Math.sin(ang * 3 + 1) + .03 * Math.sin(ang * 5);
    p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
})();
const matGrao = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .78 });
const o3 = new THREE.Object3D();
const TONS = [[0xb8782f, .62], [0xa4642a, .2], [0xc99350, .1], [0x7f3b22, .08]];   // tostado, mais assado, claro, "carne"
function corGrao() {
  let s = Math.random(), base = TONS[0][0];
  for (const [c, f] of TONS) { if (s < f) { base = c; break; } s -= f; }
  return new THREE.Color(base).offsetHSL((Math.random() - .5) * .02, (Math.random() - .5) * .08, (Math.random() - .5) * .06);
}
function escalaGrao() { const s = .92 + Math.random() * .16; o3.scale.set(s, s * (.9 + Math.random() * .2), s); }
function criarRacao() {
  // reservatório: grãos sorteados dentro do tubo, acima do chapéu; o nível mostra os de baixo
  const pts = [];
  const telhado = (z) => 298.3 + (z + 5) * Math.tan(THREE.MathUtils.degToRad(55)) + 11;   // face de cima do chapéu + raio
  let tent = 0;
  while (pts.length < 4600 && tent++ < 300000) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 43, x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = 262 + Math.random() * (655 - 262);
    if (z > -6 && y < telhado(z)) continue;
    pts.push(V3(x, y, z));
  }
  pts.sort((a, b) => a.y - b.y);
  estoqueMesh = new THREE.InstancedMesh(geoGrao, matGrao, pts.length);
  pts.forEach((p, i) => { o3.position.copy(p); o3.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); escalaGrao(); o3.updateMatrix(); estoqueMesh.setMatrixAt(i, o3.matrix); estoqueMesh.setColorAt(i, corGrao()); });
  nEstoque = pts.length;
  cena.add(estoqueMesh);
  // bolsos do rotor: 12 grãos visíveis por bolso, presos ao rotor
  bolsosMesh = new THREE.InstancedMesh(geoGrao, matGrao, 6 * VIS_BOLSO);
  for (let k = 0; k < 6; k++) {
    const grs = [];
    for (let i = 0; i < VIS_BOLSO; i++) {
      const r = 23 + Math.random() * 18, bl = (rr) => k * 60 - 25 * (rr - 19) / 25;
      const az = THREE.MathUtils.degToRad(bl(r) + 7 + Math.random() * 44), y = 226 + Math.random() * 20;
      grs.push({ p: V3(Math.cos(az) * r, y, -Math.sin(az) * r), rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0) });
      bolsosMesh.setColorAt(k * VIS_BOLSO + i, corGrao());
    }
    bolsos.push({ centro: k * 60 + 30 - 12, d: 0, acc: 0, grs });
  }
  pivoRotor.add(bolsosMesh);
  for (const b of bolsos) { const az = ((b.centro % 360) + 360) % 360; b.d = az >= 240 && az <= 312 ? 1 : 0; }
  quedaMesh = new THREE.InstancedMesh(geoGrao, matGrao, MAX_QUEDA);
  for (let i = 0; i < MAX_QUEDA; i++) quedaMesh.setColorAt(i, corGrao());
  quedaMesh.count = 0; quedaMesh.frustumCulled = false; quedaMesh.castShadow = true;
  cena.add(quedaMesh);
  atualizarNivel();
}
function atualizarNivel() {
  const f = Math.max(0, est.estoque / est.capacidade);
  if (estoqueMesh) estoqueMesh.count = Math.round(nEstoque * Math.min(1, f));
  $("#nivel-barra").style.height = (100 * f) + "%";
  $("#nivel-g").textContent = est.estoque >= 1000 ? `${fmt(est.estoque / 1000, 2)} kg` : `${Math.round(est.estoque)} g`;
  $("#nivel-pct").textContent = f < .2 ? (f <= .001 ? "VAZIO" : "ACABANDO") : `${Math.round(100 * f)} %`;
  $(".nivel").classList.toggle("baixo", f < .2);
}
function desenharBolsos() {
  const giroGraus = THREE.MathUtils.radToDeg(pivoRotor.rotation.y);
  for (let k = 0; k < 6; k++) {
    const b = bolsos[k], az = (((b.centro + giroGraus) % 360) + 360) % 360;
    if (az >= 240 && az <= 300) {                       // sobre a saída: despeja aos poucos
      const prog = (az - 240) / 60;
      if (prog > b.d) { b.acc += (prog - b.d) * GRAOS_BOLSO; b.d = prog; }
    } else if (az > 300 && az <= 312) {
      if (b.d < 1) { b.acc += (1 - b.d) * GRAOS_BOLSO; b.d = 1; }
    } else if (az < 228 || az > 312) {                  // fora do escudo: enche no reservatório
      if (b.d > 0 && est.estoque >= b.d * G_BOLSO) { est.estoque -= b.d * G_BOLSO; b.d = 0; b.acc = 0; atualizarNivel(); }
    }
    const n = Math.floor(b.acc);
    if (n > 0) { b.acc -= n; soltar(n, az); }
    const vis = Math.round(VIS_BOLSO * (1 - b.d));
    b.grs.forEach((g, i) => {
      o3.position.copy(g.p); o3.rotation.copy(g.rot); o3.scale.setScalar(i < vis ? 1 : 0); o3.updateMatrix();
      bolsosMesh.setMatrixAt(k * VIS_BOLSO + i, o3.matrix);
    });
  }
  bolsosMesh.instanceMatrix.needsUpdate = true;
}
function soltar(n, az) {
  const t0 = performance.now();
  for (let i = 0; i < n && queda.length < MAX_QUEDA; i++) {
    const r = 24 + Math.random() * 17, a = THREE.MathUtils.degToRad(az + (Math.random() - .5) * 14);
    const ang = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 26;
    queda.push({ t: t0 + i * 22 + Math.random() * 40, a: V3(Math.cos(a) * r, 220, -Math.sin(a) * r),
      fim: V3(Math.cos(ang) * rr, 0, 144 + Math.sin(ang) * rr), rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6), chegou: false });
  }
}
const P_C = (x) => V3(x * .5, 116, 104);
function desenharQueda(agora) {
  let n = 0, chegados = 0;
  for (const g of queda) {
    const t = (agora - g.t) / 1000;
    if (t < 0) continue;
    let p;
    const xb = g.a.x * .75, zb = Math.min(44, Math.max(18, g.a.z)), B = V3(xb, 202 - (zb - 16) + 5, zb);
    if (t < .1) p = g.a.clone().lerp(B, (t / .1) ** 2);
    else if (t < .4) { const u = (t - .1) / .3; p = B.clone().lerp(P_C(g.a.x), u * u * .6 + u * .4); }
    else if (t < .6) { const u = (t - .4) / .2, alvo = V3(g.fim.x, 42, g.fim.z); p = P_C(g.a.x).lerp(alvo, u); p.y = 116 + (42 - 116) * u * u; }
    else {
      if (!g.chegou) { g.chegou = true; g.y = 40 + Math.min(17, chegados * .032) * (1 - Math.hypot(g.fim.x, g.fim.z - 144) / 30); pesoReal += MASSA_GRAO; }
      p = V3(g.fim.x, g.y, g.fim.z); chegados++;
    }
    o3.position.copy(p); o3.rotation.set(g.rot.x + (t < .6 ? t * 4 : 0), g.rot.y, g.rot.z); o3.scale.setScalar(1); o3.updateMatrix();
    quedaMesh.setMatrixAt(n++, o3.matrix);
  }
  quedaMesh.count = n;
  quedaMesh.instanceMatrix.needsUpdate = true;
}
function esvaziarVasilha() { queda = []; pesoReal = 0; tara = 0; pesoVisor = 0; }

/* ------------------------------------------------------------------ energia, LED e visor */
function atualizarEnergia() {
  $("#lcd-fonte").textContent = !est.ligado ? "Desligado" : est.tomada ? "Tomada" : `Pilhas ${est.pilhas} %`;
  $(".lcd").classList.toggle("apagado", !est.ligado);
  $("#b-tomada").setAttribute("aria-pressed", est.tomada);
  $("#b-wifi").setAttribute("aria-pressed", est.wifi);
  $("#lcd-wifi").classList.toggle("fora", !est.wifi);
  $("#lcd-wifi-txt").textContent = est.wifi ? "Wi-Fi" : "Sem Wi-Fi";
  $("#b-servir").disabled = !est.ligado || rodando;
  if (chaveBascula) chaveBascula.rotation.y = est.ligado ? .22 : -.22;
  for (const m of malhas) if (m.userData.plugue) m.visible = est.tomada;
  if (!rodando) marcarEstado(!est.ligado ? "" : est.erro ? "ERRO" : !est.wifi ? "SEMWIFI" : "");
}
let timerAviso = null;
function avisar(html, ms = 7000) {
  const el = $("#aviso");
  el.innerHTML = html; el.hidden = false;
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { el.hidden = true; }, ms);
}
function brilhoLed(agora) {
  let on = false;
  if (est.ligado) {
    if (est.erro) on = Math.floor(agora / 140) % 2 === 0;
    else if (!est.wifi) on = Math.floor(agora / 700) % 2 === 0;
    else on = true;
  }
  if (led) led.material.emissiveIntensity = on ? 2.4 : 0;
  $("#lcd-led").classList.toggle("on", on);
}
const visor = { peso: $("#peso"), estado: $("#estado"), meta: $("#meta-txt"), passos: $$("#estados li") };
const NOME_ESTADO = { PRECHECK: "Checando", DESTRAVA: "Destravando", BASELINE: "Tara", GIRA: "Girando", ASSENTA: "Assentando", PESA: "Pesando",
  DONE: "Servido", RECUA: "Recuando", ERRO: "Sem fluxo", SEMWIFI: "Sem Wi-Fi", "": "Em espera" };
function marcarEstado(e, txt) {
  visor.estado.textContent = txt || (NOME_ESTADO[e] ?? e);
  let passou = true;
  for (const li of visor.passos) {
    if (li.dataset.e === e) passou = false;
    li.classList.toggle("ativo", li.dataset.e === e);
    li.classList.toggle("passou", passou && ["PRECHECK", "DESTRAVA", "BASELINE", "GIRA", "ASSENTA", "PESA", "DONE", "RECUA"].includes(e));
  }
}

/* ------------------------------------------------------------------ dosagem (firmware §4.1) */
let meta = 50;
const espera = (ms) => new Promise((r) => setTimeout(r, calmo ? ms * .4 : ms));
const estavel = () => new Promise((r) => { const t = () => (queda.every((g) => g.chegou) ? r() : setTimeout(t, 80)); t(); });
async function girar(graus, ms) { giroAlvo += THREE.MathUtils.degToRad(graus); await espera(ms); }
async function servir(gramas = meta, opcoes = {}) {
  if (rodando || !raiz || !est.ligado) return;
  rodando = true; est.erro = null;
  $("#b-servir").disabled = true;
  selecionar(null); isolar(null); demoRotor = false;
  $("#explodir").value = 0; $("#explodir").dispatchEvent(new Event("input"));
  if (corte && !opcoes.manterCorte) definirCorte(false);
  esvaziarVasilha();
  visor.meta.textContent = gramas + " g";
  if (!opcoes.semCamera) irPara(V3(0, 130, 100), V3(340, 560, 560), 1200);
  const tol = Math.max(3, gramas * .05);
  marcarEstado("PRECHECK"); await espera(650);
  marcarEstado("DESTRAVA"); await girar(-18, 260); await girar(18, 300);
  marcarEstado("BASELINE"); await estavel(); await espera(450); tara = pesoReal;
  let giros = 0, semGanho = 0, recuos = 0;
  while (giros < 40 && est.ligado) {
    const servido = pesoReal - tara, falta = gramas - servido;
    if (falta <= tol) break;
    const perto = falta < 10, n = Math.max(1, Math.round((perto ? falta * .55 : falta * .6) / MASSA_GRAO));
    const graus = Math.max(5, n / GRAOS_BOLSO * 60), antes = pesoReal;
    marcarEstado("GIRA"); await girar(graus, perto ? 520 : 380 + graus * 9);
    marcarEstado("ASSENTA"); await estavel(); await espera(320);
    marcarEstado("PESA"); await espera(380);
    if (pesoReal - antes < .5) {
      if (++semGanho >= 2) {
        if (++recuos > 4) { est.erro = "NO_FLOW"; break; }
        marcarEstado("RECUA", `Recuando ${recuos}/4`); await girar(-40, 600); await girar(40, 500); semGanho = 0;
      }
    } else semGanho = 0;
    giros++;
  }
  await girar(-8, 200);
  if (est.erro) marcarEstado("ERRO", "Sem fluxo: veja o tubo");
  else {
    marcarEstado("DONE", `Servido ${fmt(pesoReal - tara)} g`);
    if (!est.wifi) avisar("<b>Servido sem Wi-Fi.</b> A refeição saiu normalmente e ficou registrada na memória da ESP32; vai para o app quando a rede voltar.");
  }
  rodando = false;
  $("#b-servir").disabled = !est.ligado;
  $("#b-servir").textContent = "Servir de novo";
}

/* ------------------------------------------------------------------ seleção, isolar, cliques */
const raio = new THREE.Raycaster(), ponteiro = new THREE.Vector2();
let sobre = null, quadroHover = null;
function acertar(ev) {
  const r = tela.getBoundingClientRect();
  ponteiro.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  raio.setFromCamera(ponteiro, camera);
  const alvos = malhas.filter((m) => m.visible && m.name !== "REF_tubo_PVC_DN100" && (!isolada || conjunto(m, isolada)));
  const hit = raio.intersectObjects(alvos, false).find((h) => !corte || planoCorte.distanceToPoint(h.point) >= -1);
  return hit ? hit.object : null;
}
function brilho(m, cor, int) {
  if (!m || m === led) return;
  for (const o of m.name.startsWith("PAINEL") ? malhas.filter((x) => x.name === m.name) : [m]) {
    if (o === led) continue;
    o.material.emissive = new THREE.Color(cor); o.material.emissiveIntensity = int;
  }
}
function clicarPeca(m) {
  if (!m) return selecionar(null);
  if (m.name === "PAINEL_botao") return apertarBotao();
  if (m.name === "PAINEL_chave") { est.ligado = !est.ligado; if (!est.ligado) est.erro = null; atualizarEnergia(); }
  if (m.name === "PAINEL_jack") { est.tomada = !est.tomada; atualizarEnergia(); }
  selecionar(m);
}
function selecionar(m) {
  if (selecionada && selecionada !== m) brilho(selecionada, 0x000000, 0);
  selecionada = m;
  if (!m) { $("#painel-peca").hidden = true; return; }
  if (!$("#tour").hidden) return;
  brilho(m, COR.sinal, .25);
  const f = PECA(m.name) || { nome: m.name, func: "", mat: "" };
  const impressa = /^P\d\d/.test(m.name);
  $("#pp-tipo").textContent = impressa ? `${m.name.slice(0, 3)} · imprimir` : m.name.startsWith("PAINEL") ? "Painel" : "Comprado";
  $("#pp-nome").textContent = f.nome + (/_(TD|TE|FE|FD)$/.test(m.name) ? " " + m.name.slice(-2) : "");
  $("#pp-func").textContent = f.func;
  const g = D.gramas[m.name];
  $("#pp-meta").textContent = impressa ? `${f.mat}${g ? ` · ${g} g de filamento` : ""}` : f.mat;
  $("#pp-stl").hidden = !impressa;
  if (impressa) $("#pp-stl").href = `arquivos/pecas/${m.name}.stl`;
  $("#pp-isolar").hidden = !!m.userData.painel;
  $("#pp-isolar").textContent = isolada === m ? "Mostrar tudo" : "Isolar";
  $("#painel-peca").hidden = false;
}
const conjunto = (o, m) => hospede(o.name) === hospede(m.name) || (hospede(m.name) === "REF_protoboard_ESP32_modulos" && o.name === "REF_fios");
function isolar(m) {
  isolada = m;
  for (const o of malhas) {
    const fora = m && !conjunto(o, m);
    o.material.transparent = fora ? true : o.userData.transp;
    o.material.opacity = fora ? .06 : o.userData.opac;
    o.material.depthWrite = !fora && o.name !== "REF_tubo_PVC_DN100";
  }
  for (const im of [estoqueMesh, bolsosMesh, quedaMesh]) if (im) im.visible = !m;
  if (m) focar(m);
  if (selecionada) $("#pp-isolar").textContent = isolada ? "Mostrar tudo" : "Isolar";
}
function focar(m, dist) {
  const bb = new THREE.Box3().setFromObject(m), c = bb.getCenter(V3(0, 0, 0)), r = bb.getSize(V3(0, 0, 0)).length();
  const dir = camera.position.clone().sub(controles.target).normalize();
  irPara(c, c.clone().add(dir.multiplyScalar(dist || Math.max(r * 2.2, 380))));
}
function irPara(alvo, pos, ms = 900) {
  controles.autoRotate = false; zoomEx = null;
  camTween = { t0: performance.now(), ms, a0: controles.target.clone(), p0: camera.position.clone(), a1: alvo, p1: pos };
}
let timerLongo = null, longoFeito = false;
function apertarBotao(longo) {
  if (!est.ligado || !botaoAtuador) return;
  botaoAtuador.position.x = 72.4;
  setTimeout(() => { botaoAtuador.position.x = 73.6; }, 180);
  if (longo) return reabastecer();
  servir(20, { semCamera: !$("#tour").hidden });
}
function reabastecer() {
  const ini = est.estoque, t0 = performance.now(), dur = calmo ? 300 : 1400;
  est.erro = null;
  const passo = () => {
    const u = Math.min(1, (performance.now() - t0) / dur);
    est.estoque = ini + (est.capacidade - ini) * (1 - (1 - u) ** 3);
    atualizarNivel();
    if (u < 1) requestAnimationFrame(passo);
    else { atualizarEnergia(); marcarEstado("", "Reabastecido"); }
  };
  passo();
}
let semanaRodando = false;
async function umaSemana() {
  if (semanaRodando || rodando) return;
  semanaRodando = true;
  const g = 50;                                              // cão de 5 kg: ~100 g/dia em 2 refeições
  for (let d = 1; d <= 7; d++) {
    for (let r = 1; r <= 2; r++) {
      if (est.estoque < g) { est.erro = "NO_FLOW"; atualizarNivel(); marcarEstado("ERRO", `Acabou no dia ${d}`); semanaRodando = false; return; }
      const ini = est.estoque, t0 = performance.now();
      await new Promise((res) => {
        const passo = () => {
          const u = Math.min(1, (performance.now() - t0) / (calmo ? 40 : 170));
          est.estoque = ini - g * u; atualizarNivel();
          u < 1 ? requestAnimationFrame(passo) : res();
        };
        passo();
      });
      marcarEstado("", `Dia ${d} · refeição ${r}/2`);
      giroAlvo += THREE.MathUtils.degToRad(80);
    }
  }
  marcarEstado("", est.estoque / est.capacidade < .2 ? "Ração acabando" : "Semana: 700 g servidos");
  semanaRodando = false;
}

/* ------------------------------------------------------------------ anéis no chão (apoio antes/depois das patas) */
function criarAneis() {
  aneis = new THREE.Group();
  const anel = (r, cor, tracejado) => {
    const pts = [];
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(V3(Math.cos(a) * r, 1, Math.sin(a) * r)); }
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
      tracejado ? new THREE.LineDashedMaterial({ color: cor, dashSize: 8, gapSize: 6 }) : new THREE.LineBasicMaterial({ color: cor }));
    if (tracejado) l.computeLineDistances();
    return l;
  };
  aneis.add(anel(70, 0xcf3a2b, true), anel(122, 0x1e9a55, false));
  aneis.visible = false;
  cena.add(aneis);
}

/* ------------------------------------------------------------------ tour */
const TOUR = [
  { t: "O alimentador", txt: "Tubo de PVC de 640 mm com o cartucho dosador no meio, a eletrônica em pé logo abaixo e a balança sob a vasilha. Arraste para girar a qualquer momento.", cam: null },
  { t: "Reservatório", txt: "3 litros úteis: pelo menos 1,2 kg mesmo de ração leve. Não tem sensor de nível: o ESP32 desconta da carga cada grama que a balança confirma. Simule uma semana de uso e veja o nível cair.",
    cam: [[0, 460, 0], [520, 700, 640]], acoes: [["1 semana de uso", () => umaSemana()], ["Reabastecer", () => reabastecer()]] },
  { t: "Chapéu", txt: "O telhado a 55° segura boa parte da coluna de ração. Sem ele, o tubo cheio pedia ~2,9 kgf·cm do servo, que trava em 1,8. Com ele, ~1,3.", cam: [[0, 320, 0], [560, 470, 430]], corte: true, destaque: "P10_chapeu" },
  { t: "Rotor de bolsos", txt: "Seis bolsos de ~22 mL enchem no reservatório, passam sob o escudo e despejam na saída. É o giro, e não o tempo, que solta a ração: perto da meta ele gira pouco e solta grão a grão.",
    cam: [[0, 240, 0], [420, 420, 330]], corte: true, demo: true },
  { t: "Bica e vasilha", txt: "A bica a 45° atravessa a parede do tubo e despeja no centro da vasilha. A saída fica 10,8 mm acima da borda da vasilha mais alta aceita.", cam: [[0, 130, 100], [340, 520, 560]] },
  { t: "Balança", txt: "Célula de carga de 5 kg sob uma plataforma que flutua. Três batentes seguram o peso se o pet subir na vasilha. O HX711 lê 24 bits, 10 vezes por segundo.", cam: [[0, 30, 144], [320, 180, 450]], destaque: "REF_celula_5kg" },
  { t: "Eletrônica", txt: "ESP32, HX711 e step-down numa protoboard em pé dentro do tubo. A fonte de 12 V vira 5,0 V para a ESP32 e o servo; dois divisores leem a bateria e a fonte.", cam: [[0, 118, 0], [-55, 135, 335]], esconder: ["P04_bica", "REF_vasilha_maior", "P08_plataforma"] },
  { t: "Painel", txt: "LED de status, chave e botão. Aperte o botão (aqui ou no modelo): serve 20 g. Segure 3 s para registrar que reabasteceu. Desligue o Wi-Fi e veja o LED piscar devagar.",
    cam: [[70, 14, 0], [330, 80, 60]], acoes: [["Apertar o botão", () => apertarBotao()], ["Chave liga/desliga", () => { est.ligado = !est.ligado; if (!est.ligado) est.erro = null; atualizarEnergia(); }], ["Wi-Fi", () => { est.wifi = !est.wifi; atualizarEnergia(); }]] },
  { t: "No-break", txt: "Na tomada, a fonte de 12 V alimenta tudo. Se ela cair, as 6 pilhas AA assumem na hora, sem reiniciar: dois diodos fazem o \"ou\" entre as duas. Tire da tomada.",
    cam: [[0, 12, -70], [160, 110, -420]], acoes: [["Tirar/pôr na tomada", () => { est.tomada = !est.tomada; atualizarEnergia(); }]] },
  { t: "Gaveta das pilhas", txt: "Sai pela esquerda, sem virar o alimentador. Quatro ímãs de neodímio escondidos seguram a gaveta fechada.", cam: [[-90, 18, 0], [-440, 170, 260]], gaveta: true },
  { t: "Patas", txt: "Com o tubo cheio, só o pedestal (círculo vermelho, 70 mm) tombava com ~300 g de empurrão no topo. As patas levam o apoio a ~122 mm (verde): precisa do dobro de força.", cam: [[0, 0, 40], [30, 980, 300]], aneis: true },
  { t: "Servir", txt: "Tudo junto: checa, destrava, tara, gira, assenta e pesa até a meta. Acompanhe no visor.", cam: null, acoes: [["Servir 50 g", () => servir(50)]], auto: true },
];
let passoTour = -1;
let vasilhaOculta = false;
function esconder(nomes) {
  vasilhaOculta = nomes.includes("REF_vasilha_maior");
  for (const m of malhas) m.visible = !nomes.includes(hospede(m.name)) && (!m.userData.plugue || est.tomada);
}
function irTour(i) {
  if (!raiz) return;
  passoTour = Math.max(0, Math.min(TOUR.length - 1, i));
  const p = TOUR[passoTour];
  selecionar(null); isolar(null);
  $("#painel-peca").hidden = true;
  $("#tour").hidden = false;
  aplicarDeslocamento();
  $("#tour-n").textContent = `${passoTour + 1} / ${TOUR.length}`;
  $("#tour-titulo").textContent = p.t;
  $("#tour-texto").textContent = p.txt;
  $("#tour-acao").innerHTML = "";
  for (const [rot, fn] of p.acoes || []) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tecla"; b.textContent = rot; b.style.margin = "0 6px 6px 0";
    b.addEventListener("click", fn); $("#tour-acao").appendChild(b);
  }
  $("#tour-pontos").innerHTML = TOUR.map((_, k) => `<i class="${k === passoTour ? "at" : ""}"></i>`).join("");
  $("#tour-ant").disabled = passoTour === 0;
  $("#tour-prox").textContent = passoTour === TOUR.length - 1 ? "Fim" : "Próximo →";
  definirCorte(!!p.corte);
  esconder(p.esconder || []);
  demoRotor = !!p.demo;
  gavetaAlvo = p.gaveta ? 1 : 0;
  aneis.visible = !!p.aneis;
  $("#explodir").value = 0; $("#explodir").dispatchEvent(new Event("input"));
  for (const m of malhas) brilho(m, 0x000000, 0);
  if (p.destaque) brilho(porNome[p.destaque], COR.sinal, .35);
  if (p.cam) irPara(V3(...p.cam[0]), V3(...p.cam[1]), 1100); else irPara(ALVO0.clone(), POS0.clone(), 1100);
  if (p.auto) setTimeout(() => { if (passoTour === TOUR.length - 1) servir(50); }, 1300);
}
function sairTour() {
  esconder([]);
  passoTour = -1; $("#tour").hidden = true; aplicarDeslocamento(); demoRotor = false; gavetaAlvo = 0; if (aneis) aneis.visible = false;
  definirCorte(false); for (const m of malhas) brilho(m, 0x000000, 0);
}

/* ------------------------------------------------------------------ controles */
function ligarControles() {
  const sl = $("#explodir");
  const aplicar = () => {
    if (!zoomEx && raiz && passoTour < 0) {
      const f = 1 + .45 * explodirAtual;
      zoomEx = { dir: camera.position.clone().sub(controles.target).normalize(), d0: camera.position.distanceTo(controles.target) / f,
        alvo: controles.target.clone().sub(V3(0, 110 * explodirAtual, 0)) };
    }
    explodirAlvo = sl.value / 100; sl.style.setProperty("--v", sl.value + "%");
  };
  sl.addEventListener("input", aplicar); aplicar();
  $("#b-corte").addEventListener("click", () => definirCorte(!corte));
  if (innerWidth < 560) { $("#b-rotulos").setAttribute("aria-pressed", "false"); camadaRotulos.classList.add("oculto"); }
  $("#b-rotulos").addEventListener("click", (e) => {
    const on = e.currentTarget.getAttribute("aria-pressed") !== "true";
    e.currentTarget.setAttribute("aria-pressed", on); camadaRotulos.classList.toggle("oculto", !on);
  });
  $("#b-reset").addEventListener("click", () => { sairTour(); selecionar(null); isolar(null); irPara(ALVO0.clone(), POS0.clone()); });
  $("#fechar-peca").addEventListener("click", () => { selecionar(null); if (isolada) isolar(null); });
  $("#pp-isolar").addEventListener("click", () => isolar(isolada === selecionada ? null : selecionada));
  $$(".meta").forEach((b) => b.addEventListener("click", () => {
    if (rodando) return;
    $$(".meta").forEach((x) => x.setAttribute("aria-pressed", x === b));
    meta = +b.dataset.g; visor.meta.textContent = meta + " g";
  }));
  $("#b-servir").addEventListener("click", () => servir(meta));
  $("#b-tomada").addEventListener("click", () => {
    est.tomada = !est.tomada; atualizarEnergia();
    avisar(est.tomada
      ? "<b>Na tomada.</b> A fonte de 12 V volta a alimentar tudo; as pilhas ficam de reserva."
      : "<b>Faltou energia.</b> As 6 pilhas AA assumem na hora, sem desligar nem perder a agenda (no-break). O visor mostra a carga das pilhas.");
  });
  $("#b-wifi").addEventListener("click", () => {
    est.wifi = !est.wifi; atualizarEnergia();
    avisar(est.wifi
      ? "<b>Wi-Fi de volta.</b> O LED fica aceso e o histórico guardado durante a queda é enviado ao app."
      : "<b>Wi-Fi caiu.</b> Nada para: a agenda está gravada na ESP32 e as refeições continuam no horário. O LED pisca devagar e o app recebe o histórico quando a rede voltar. Teste: aperte Servir.");
  });
  $("#b-semana").addEventListener("click", umaSemana);
  $("#b-encher").addEventListener("click", reabastecer);
  for (const id of ["#b-tour", "#b-tour-hero"]) $(id).addEventListener("click", () => { $("#modelo").scrollIntoView({ behavior: calmo ? "auto" : "smooth" }); irTour(0); });
  $("#tour-sair").addEventListener("click", sairTour);
  $("#tour-ant").addEventListener("click", () => irTour(passoTour - 1));
  $("#tour-prox").addEventListener("click", () => (passoTour === TOUR.length - 1 ? sairTour() : irTour(passoTour + 1)));

  let baixo = null;
  tela.addEventListener("pointerdown", (e) => {
    baixo = { x: e.clientX, y: e.clientY }; longoFeito = false;
    const m = raiz && acertar(e);
    if (m && m.name === "PAINEL_botao") timerLongo = setTimeout(() => { timerLongo = null; longoFeito = true; apertarBotao(true); }, 3000);
  });
  tela.addEventListener("pointerup", (e) => {
    if (timerLongo) { clearTimeout(timerLongo); timerLongo = null; }
    if (!baixo || longoFeito || Math.hypot(e.clientX - baixo.x, e.clientY - baixo.y) > 5 || !raiz) return;
    clicarPeca(acertar(e));
  });
  tela.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || !raiz || e.buttons || quadroHover) return;
    quadroHover = requestAnimationFrame(() => {
      quadroHover = null;
      const m = acertar(e);
      if (sobre && sobre !== m && sobre !== selecionada) brilho(sobre, 0x000000, 0);
      sobre = m;
      if (m && m !== selecionada) brilho(m, COR.sinal, .16);
      tela.style.cursor = m ? "pointer" : "";
    });
  });
}
function definirCorte(on) {
  corte = on;
  $("#b-corte").setAttribute("aria-pressed", on);
  for (const m of malhas) {
    m.material.side = on || m.name === "REF_tubo_PVC_DN100" || m.name === "REF_vasilha_maior" ? THREE.DoubleSide : THREE.FrontSide;
    if (m.name === "REF_tubo_PVC_DN100") { m.material.opacity = on ? .85 : .16; m.userData.opac = m.material.opacity; m.material.depthWrite = on; }
    m.material.needsUpdate = true;
  }
  matGrao.clippingPlanes = on ? [planoCorte] : [];
  matGrao.needsUpdate = true;
}

/* ------------------------------------------------------------------ laço de desenho */
let ultimo = performance.now();
function quadro(agora) {
  const dtReal = Math.max(0, (agora - ultimo) / 1000), dt = Math.min(.05, dtReal);
  const aprox = (taxa) => 1 - Math.exp(-taxa * dtReal);   // suavização por tempo real (não depende do nº de quadros)
  ultimo = agora;
  if (!raiz) { if (renderer) renderer.render(cena, camera); return; }
  if (!ativo) return;
  if (camTween) {
    const u = Math.min(1, (agora - camTween.t0) / camTween.ms), e = 1 - (1 - u) ** 3;
    controles.target.lerpVectors(camTween.a0, camTween.a1, e);
    camera.position.lerpVectors(camTween.p0, camTween.p1, e);
    if (u >= 1) camTween = null;
  }
  explodirAtual += (explodirAlvo - explodirAtual) * aprox(7);
  gavetaAtual += (gavetaAlvo - gavetaAtual) * aprox(5);
  const ex = explodirAtual * explodirAtual * (3 - 2 * explodirAtual);
  for (const m of malhas) {
    m.position.copy(m.userData.base).addScaledVector(m.userData.desloc, ex);
    if (m.name === "P11_gaveta_pilhas" || m.name === "REF_pilhas_6AA") m.position.x -= 62 * gavetaAtual;
  }
  if (zoomEx && !camTween) {
    controles.target.copy(zoomEx.alvo).add(V3(0, 110 * ex, 0));
    camera.position.copy(controles.target).addScaledVector(zoomEx.dir, zoomEx.d0 * (1 + .45 * ex));
    if (Math.abs(explodirAlvo - explodirAtual) < .001) zoomEx = null;
  }
  if (!isolada) for (const im of [estoqueMesh, bolsosMesh, quedaMesh]) if (im) im.visible = ex < .02 && !(im === quedaMesh && vasilhaOculta);
  for (const m of malhas) if (m.name === "REF_fios") m.visible = ex < .02;              // fios só fazem sentido montados
  corteC += ((corte ? 0 : 1000) - corteC) * aprox(4);
  planoCorte.constant = corteC;
  if (demoRotor && !rodando && est.ligado) giroAlvo += dt * .7;
  giroAtual += (giroAlvo - giroAtual) * aprox(9);
  pivoRotor.rotation.y = giroAtual;
  if (bolsosMesh) desenharBolsos();
  if (quedaMesh) desenharQueda(agora);
  brilhoLed(agora);
  const real = pesoReal - tara;
  pesoVisor += (real - pesoVisor) * aprox(5);
  visor.peso.textContent = est.ligado ? fmt(Math.max(0, Math.round(pesoVisor * 10) / 10)) : "";
  controles.update();
  moverRotulos();
  renderer.render(cena, camera);
}

/* ================================================================== peças */
function montarPecas() {
  const ul = $("#grade-pecas");
  ul.innerHTML = D.pecas.map((p) => `
    <li class="peca" data-grupo="${p.grupo}">
      <div class="peca-img"><span class="peca-cod">${p.cod}${p.sub ? " " + p.arq.slice(-2) : ""}</span>
        <img src="${p.img}" alt="${p.nome}" loading="lazy" width="320" height="240"></div>
      <div class="peca-txt">
        <h3>${p.nome.replace(/ (TD|TE|FE|FD)$/, "")}${p.sub ? `<small>${p.sub}</small>` : ""}</h3>
        <dl><div><dt>Filamento</dt><dd>${p.g} g</dd></div><div><dt>Tempo</dt><dd>${fmt(p.h)}–${fmt(p.h2)} h</dd></div></dl>
        <p>${p.obs}</p>
        <div class="teclas">
          <button type="button" class="tecla" data-ver="${p.arq}">Ver no 3D</button>
          <a class="tecla" href="arquivos/pecas/${p.arq}.stl" download>STL</a>
          ${p.mf3 ? `<a class="tecla" href="arquivos/pecas/${p.arq}.3mf" download>3MF</a>` : ""}
        </div>
      </div>
    </li>`).join("");
  filtro("#filtro-pecas", (f) => $$(".peca", ul).forEach((li) => { li.hidden = f && li.dataset.grupo !== f; }));
  ul.addEventListener("click", (e) => { const b = e.target.closest("[data-ver]"); if (b) verNo3D(b.dataset.ver); });
  $$(".link-3d[data-alvo]").forEach((b) => b.addEventListener("click", () => verNo3D(b.dataset.alvo)));
}
function verNo3D(alvo) {
  $("#modelo").scrollIntoView({ behavior: calmo ? "auto" : "smooth" });
  if (!raiz) return;
  sairTour();
  if (alvo === "corte") { selecionar(null); isolar(null); definirCorte(true); irPara(V3(0, 260, 20), V3(1050, 520, 360)); return; }
  const m = porNome[alvo];
  if (m) { if (corte) definirCorte(false); selecionar(m); isolar(m); }
}
function filtro(sel, fn) {
  const g = $(sel);
  g.addEventListener("click", (e) => {
    const b = e.target.closest(".tecla"); if (!b) return;
    $$(".tecla", g).forEach((x) => x.setAttribute("aria-pressed", x === b));
    fn(b.dataset.f);
  });
}

/* ================================================================== compras */
function montarCompras() {
  const feitos = new Set(ler("alimentador-compras", []));
  const tb = $("#bom tbody");
  let html = "", cat = "";
  for (const i of D.bom) {
    if (i.cat !== cat) { cat = i.cat; html += `<tr class="cat" data-cat="${cat}"><td colspan="6">${cat}</td></tr>`; }
    const ck = feitos.has(i.id);
    html += `<tr data-cat="${i.cat}" data-id="${i.id}" class="${ck ? "feito" : ""}">
      <td><input type="checkbox" class="marcar" id="c-${i.id}" ${ck ? "checked" : ""} aria-label="Comprado: ${i.item.replace(/<[^>]+>/g, "")}"></td>
      <td>${i.id}</td><td>${i.item}</td><td>${i.spec}</td><td class="num">${i.usa}</td><td class="num">${i.comprar}</td></tr>`;
  }
  tb.innerHTML = html;
  let filtroAtual = "";
  const contar = () => {
    $("#compras-n").textContent = feitos.size; $("#compras-t").textContent = D.bom.length;
    $("#compras-barra").style.width = (100 * feitos.size / D.bom.length) + "%";
  };
  const aplicar = () => {
    for (const tr of $$("tr", tb)) {
      if (tr.classList.contains("cat")) tr.hidden = !!filtroAtual && filtroAtual !== "pendente" && tr.dataset.cat !== filtroAtual;
      else tr.hidden = filtroAtual === "pendente" ? feitos.has(tr.dataset.id) : !!filtroAtual && tr.dataset.cat !== filtroAtual;
    }
  };
  tb.addEventListener("change", (e) => {
    const tr = e.target.closest("tr");
    e.target.checked ? feitos.add(tr.dataset.id) : feitos.delete(tr.dataset.id);
    tr.classList.toggle("feito", e.target.checked);
    guardar("alimentador-compras", [...feitos]); contar(); aplicar();
  });
  filtro("#filtro-bom", (f) => { filtroAtual = f; aplicar(); });
  contar();
  acordeao("#bom-det", D.bomDet);
}
function acordeao(sel, itens, abrirPrimeiro = false) {
  $(sel).innerHTML = itens.map((s, k) => `<details ${abrirPrimeiro && k === 0 ? "open" : ""}><summary>${s.titulo}</summary><div class="corpo doc">${s.html}</div></details>`).join("");
}

/* ================================================================== montagem */
function montarFases() {
  const feitas = new Set(ler("alimentador-fases", []));
  const nav = $("#fases"), art = $("#fase");
  let atual = 0;
  const desenharNav = () => {
    nav.innerHTML = D.fases.map((f, k) => `<button type="button" data-k="${k}" class="${feitas.has(f.num) ? "feita" : ""}" ${k === atual ? 'aria-current="step"' : ""}>
      <span class="num">${feitas.has(f.num) ? "✓" : f.num}</span><span>${f.titulo}</span><span class="dur">${f.dur}</span></button>`).join("");
  };
  const mostrar = (k, foco) => {
    atual = Math.max(0, Math.min(D.fases.length - 1, k));
    const f = D.fases[atual];
    const separe = f.itens && f.itens.length ? `<div class="separe"><h4>Peças e componentes desta fase</h4><ul>${f.itens.map((i) =>
      `<li><div class="img"><img src="${i.img}" alt="" loading="lazy"></div><span>${i.nome}<small>${i.sub}</small></span></li>`).join("")}</ul></div>` : "";
    art.innerHTML = `<div class="fase-topo"><p class="etiqueta">Fase ${f.num} de ${D.fases.length - 1}${f.dur ? " · " + f.dur : ""}</p><h3>${f.titulo}</h3></div>
      ${separe}<div class="doc">${f.html}</div>
      <div class="fase-pe"><label class="feita-ck"><input type="checkbox" class="marcar" id="fase-ok" ${feitas.has(f.num) ? "checked" : ""}> Fase concluída</label>
        <div class="teclas"><button type="button" class="tecla" id="fase-ant" ${atual === 0 ? "disabled" : ""}>← Anterior</button>
        <button type="button" class="tecla primaria" id="fase-prox" ${atual === D.fases.length - 1 ? "disabled" : ""}>Próxima →</button></div></div>`;
    desenharNav();
    if (foco) art.focus({ preventScroll: true });
    $("#fase-ok").addEventListener("change", (e) => { e.target.checked ? feitas.add(f.num) : feitas.delete(f.num); guardar("alimentador-fases", [...feitas]); desenharNav(); });
    $("#fase-ant").addEventListener("click", () => { mostrar(atual - 1, true); art.scrollIntoView({ block: "start" }); });
    $("#fase-prox").addEventListener("click", () => { mostrar(atual + 1, true); art.scrollIntoView({ block: "start" }); });
  };
  nav.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) mostrar(+b.dataset.k, true); });
  mostrar(0);
}

/* ================================================================== engenharia */
function grafico(d) {
  const linhas = D.dem[d] || [], svg = $("#grafico-svg");
  const W = 640, esq = 176, dir = 90, h = 34, topo = 24, max = Math.max(3.2, ...linhas.map((l) => l.torque)) * 1.05;
  const x = (v) => esq + (W - esq - dir) * v / max, H = topo + linhas.length * h + 26;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  const css = getComputedStyle(document.documentElement), c = (n) => css.getPropertyValue(n).trim();
  let s = `<text x="${W - dir + 12}" y="14" style="fill:${c("--mudo")};font-size:10px">G/VOLTA</text>`;
  for (let v = 0; v <= max; v += 1) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${topo - 6}" y2="${H - 22}" stroke="${c("--linha")}" stroke-width="1"/>
      <text x="${x(v)}" y="${H - 6}" text-anchor="middle" style="fill:${c("--mudo")};font-size:10px">${v}</text>`;
  linhas.forEach((l, k) => {
    const y = topo + k * h, final = l.id === "cumeeira_h40", w = Math.max(2, x(l.torque) - esq);
    s += `<text x="${esq - 10}" y="${y + h / 2 + 4}" text-anchor="end" style="${final ? `fill:${c("--tinta")};font-weight:700` : ""}">${l.nome}</text>
      <rect x="${esq}" y="${y + 7}" width="${w}" height="${h - 14}" rx="1.5" fill="${final ? c("--sinal") : c("--linha-forte")}" stroke="${final ? c("--sinal-tinta") : "none"}" stroke-width="1.5">
        <animate attributeName="width" from="0" to="${w}" dur="${calmo ? "0.01" : ".7"}s" fill="freeze"/></rect>
      <text x="${x(l.torque) + 6}" y="${y + h / 2 + 4}" style="fill:${c("--tinta")};font-weight:700">${fmt(l.torque, 2)}</text>
      <text x="${W - dir + 12}" y="${y + h / 2 + 4}" style="fill:${c("--tinta-2")}">${fmt(l.gpv)} g</text>`;
  });
  s += `<line x1="${x(1.8)}" x2="${x(1.8)}" y1="${topo - 12}" y2="${H - 22}" stroke="${c("--perigo")}" stroke-width="1.5" stroke-dasharray="4 4"/>
    <text x="${x(1.8) + 5}" y="${topo - 10}" style="fill:${c("--perigo")};font-size:10px;font-weight:700">SERVO TRAVA · 1,8</text>
    <text x="8" y="${H - 6}" style="fill:${c("--mudo")};font-size:10px">KGF·CM</text>`;
  svg.innerHTML = s;
}
function montarEngenharia() {
  let d = "10";
  grafico(d);
  $("#grafico .teclas").addEventListener("click", (e) => {
    const b = e.target.closest(".tecla"); if (!b) return;
    $$("#grafico .tecla").forEach((x) => x.setAttribute("aria-pressed", x === b));
    d = b.dataset.d; grafico(d);
  });
  new MutationObserver(() => grafico(d)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => grafico(d));
  $("#decisoes").innerHTML = D.decisoes.map((x) => `<li><span class="id">${x.id}</span><p class="dec">${x.decisao}</p><p class="mot">${x.motivo}</p></li>`).join("");
}

/* ================================================================== diversos */
function montarDiversos() {
  acordeao("#uso-lista", D.uso, true);
  acordeao("#ligacoes", D.ligacoes);
  $$(".dl-tam").forEach((el) => { const v = D.tam[el.dataset.arq]; el.textContent = v ? `${fmt(v)} MB` : ""; if (!v) el.closest(".dl-card").hidden = true; });
  const zip = D.tam["pecas_para_imprimir.zip"];
  if (zip) $("#zip-pecas").textContent = `Baixar todas · ZIP ${fmt(zip)} MB`;
  if (!calmo) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("revela"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
    $$(".sistema, .peca, .dl-card, .passos3 li").forEach((el) => io.observe(el));
  }
}

montarPecas();
montarCompras();
montarFases();
montarEngenharia();
montarDiversos();
iniciar3D();
