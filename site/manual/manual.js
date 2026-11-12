// Manual de montagem 3D do Alimentador v3.
// Modelo: site/manual/montagem.min.glb (um nó por objeto da montagem detalhada do FreeCAD, Z do CAD → Y do three).
// Passos: site/manual/passos.js (coordenadas do CAD: mm, Z para cima, frente = −Y).
// URL: manual.html#<id-do-passo>.  Modo foto (para gerar as imagens do manual impresso): manual.html?foto=<id>
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { MODULOS, PASSOS, TIPOS, furo, pinoEsp } from "./passos.js";

const $ = (s, el = document) => el.querySelector(s);
const params = new URLSearchParams(location.search);
const FOTO = params.get("foto");
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const cad = (p) => V3(p[0], p[2], -p[1]);                // CAD (Z para cima) → three (Y para cima)
const ler = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem storage */ } };
const esc = (t) => String(t).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
// **negrito**, `código`
const rico = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");

if (FOTO) document.documentElement.classList.add("foto");

/* ------------------------------------------------------------------ tema */
(() => {
  const salvo = ler("alimentador-tema", null);
  if (salvo && !FOTO) document.documentElement.dataset.theme = salvo;
  if (FOTO) document.documentElement.dataset.theme = "light";
  $("#tema")?.addEventListener("click", () => {
    const escuro = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = escuro ? "light" : "dark";
    guardar("alimentador-tema", document.documentElement.dataset.theme);
    pintarFundo();
  });
})();

/* ================================================================== cena */
const palco = $("#palco"), tela = $("#tela"), camadaRot = $("#rotulos"), svgRot = $("#linhas");
let renderer, cena, camera, controles, raiz, chao;
const nos = {};                 // nome → { obj (Mesh), base (posição), centro (mundo), mats {normal, contexto, novo, fantasma} }
const grupos = {};              // "3 Pedestal" → [nomes]
let passoAtual = null, estado = null, t0 = performance.now(), pausado = calmo, montadoFixo = false;
let camTween = null;
const setas = new THREE.Group();

function iniciar() {
  renderer = new THREE.WebGLRenderer({ canvas: tela, antialias: true, alpha: true, preserveDrawingBuffer: !!FOTO });
  renderer.setPixelRatio(FOTO ? 2 : Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  cena = new THREE.Scene();
  cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;
  camera = new THREE.PerspectiveCamera(28, 1, 2, 9000);
  controles = new OrbitControls(camera, tela);
  Object.assign(controles, { enableDamping: true, dampingFactor: .09, minDistance: 30, maxDistance: 3000 });
  controles.addEventListener("start", () => { camTween = null; });
  cena.add(new THREE.HemisphereLight(0xf6f8f2, 0x3a3a34, .7));
  const sol = new THREE.DirectionalLight(0xffffff, 1.6);
  sol.position.set(420, 1100, 760);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  Object.assign(sol.shadow.camera, { left: -500, right: 500, top: 800, bottom: -500, near: 100, far: 3000 });
  sol.shadow.bias = -.0005;
  cena.add(sol);
  const rec = new THREE.DirectionalLight(0xffffff, .45);
  rec.position.set(-600, 300, -500);
  cena.add(rec);
  const baixo = new THREE.DirectionalLight(0xffffff, .55);      // vistas de baixo (pés, parafusos da célula)
  baixo.position.set(200, -900, 300);
  cena.add(baixo);
  chao = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.ShadowMaterial({ opacity: .16 }));
  chao.rotation.x = -Math.PI / 2;
  chao.receiveShadow = true;
  cena.add(chao);
  cena.add(setas);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load("manual/montagem.min.glb", (gltf) => {
    raiz = gltf.scene;
    const fios = gltf.parser.json.asset.extras?.fios || {};
    raiz.traverse((o) => { if (o.isMesh) registrar(o); });
    for (const [nome, f] of Object.entries(fios)) criarFio(nome, f);
    cena.add(raiz);
    $("#carregando")?.remove();
    const id = FOTO || decodeURIComponent(location.hash.slice(1)) || ler("manual-passo", PASSOS[0].id);
    irPara(PASSOS.find((p) => p.id === id) ? id : PASSOS[0].id, true);
  }, (ev) => {
    const el = $("#carregando b");
    if (el && ev.total) el.textContent = Math.round(100 * ev.loaded / ev.total) + " %";
  }, () => { $("#carregando").textContent = "Não foi possível carregar o modelo 3D."; });

  new ResizeObserver(redimensionar).observe(palco);
  redimensionar();
  pintarFundo();
  renderer.setAnimationLoop(quadro);
}

function pintarFundo() {
  if (!renderer) return;
  const cor = getComputedStyle(document.documentElement).getPropertyValue("--palco").trim() || "#e9ece6";
  renderer.setClearColor(new THREE.Color(cor), 1);
}

function materiais(o) {
  const m0 = o.material;
  const temCor = !!o.geometry.attributes.color;
  const nome = o.name;
  let rug = .55, met = 0;
  if (/^Parafuso_|_pino_|perna|terminal|_rosca|_porca|Header_servo_pino|Jack_P4_flange/.test(nome)) { rug = .3; met = .85; }
  if (/^Celula_carga|^Imas|Vasilha|polo/.test(nome)) { rug = .3; met = .8; }
  if (/^Tubo_PVC|^Cap_superior/.test(nome)) rug = .25;
  const impressa = /^P\d\d_/.test(nome);           // peças impressas: uma cor só (PETG), como vão sair da impressora
  const base = m0.map
    ? new THREE.MeshStandardMaterial({ map: m0.map, roughness: .6 })
    : impressa ? new THREE.MeshStandardMaterial({ color: 0x59625e, roughness: .55 })
      : new THREE.MeshStandardMaterial({ color: temCor ? 0xffffff : m0.color, vertexColors: temCor, roughness: temCor ? rug : .4, metalness: temCor ? met : 0 });
  if (m0.map) m0.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const contexto = base.clone();
  contexto.color = new THREE.Color(impressa ? 0xaeb3ad : 0xc4c8c2);
  if (contexto.map) { contexto.color = new THREE.Color(0xd8dbd5); }
  const fantasma = base.clone();
  Object.assign(fantasma, { transparent: true, opacity: .14, depthWrite: false, side: THREE.DoubleSide });
  const novo = base.clone();
  novo.emissive = new THREE.Color(0xf2be0f);
  novo.emissiveIntensity = 0;
  if (impressa) { novo.color = new THREE.Color(0xf2be0f); novo.emissive = new THREE.Color(0x6b5200); }
  return { normal: base, contexto, fantasma, novo };
}

function registrar(o) {
  const nome = o.name.split("#")[0] === o.name ? o.name : o.name;     // "Protoboard_furacao#tex" fica com nome próprio
  o.castShadow = true;
  o.receiveShadow = true;
  o.updateMatrixWorld(true);
  o.geometry.computeBoundingBox();
  const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
  nos[nome] = { obj: o, base: o.position.clone(), bb, mats: materiais(o) };
  const g = o.userData.grupo || "";
  if (g) (grupos[g] = grupos[g] || []).push(nome);
  o.visible = false;
}

function criarFio(nome, f) {
  const pts = f.pts.map((p) => V3(...p));
  const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), Math.max(16, pts.length * 4), .62, 8);
  const malha = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: f.cor, roughness: .4 }));
  malha.name = nome;
  raiz.add(malha);
  registrar(malha);
}

/* ------------------------------------------------------------------ seleção: "Nome", "Prefixo*", "@3 Pedestal", "fio:12" */
function resolver(lista) {
  const out = new Set();
  for (const s of lista || []) {
    if (s.startsWith("@")) { for (const n of grupos[s.slice(1)] || []) out.add(n); continue; }
    if (s.startsWith("fio:")) {
      const k = +s.slice(4);
      const p = "Fio_" + String(k).padStart(2, "0") + "_", d = "Dupont_" + String(k - 1).padStart(2, "0") + "_";
      for (const n in nos) if (n.startsWith(p) || n.startsWith(d)) out.add(n);
      continue;
    }
    if (s.endsWith("*")) { const p = s.slice(0, -1); for (const n in nos) if (n.startsWith(p)) out.add(n); continue; }
    if (nos[s]) out.add(s);
  }
  for (const n of [...out]) if (nos[n + "#tex"]) out.add(n + "#tex");    // adesivo com textura acompanha a peça
  return out;
}

/* ================================================================== passos */
function irPara(id, inicial = false) {
  const p = PASSOS.find((x) => x.id === id);
  if (!p || !raiz) return;
  passoAtual = p;
  guardar("manual-passo", id);
  if (!FOTO && location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  const mostra = resolver(p.mostra), fant = resolver(p.fantasma);
  const novos = [];          // { nomes:Set, de:Vector3 (three) }
  const todosNovos = new Set();
  for (const n of p.novo || []) {
    const nomes = resolver(n.sel);
    nomes.forEach((x) => todosNovos.add(x));
    novos.push({ nomes, de: cad(n.de || [0, 0, 0]) });
  }
  for (const [nome, no] of Object.entries(nos)) {
    const o = no.obj;
    o.position.copy(no.base);
    if (todosNovos.has(nome)) { o.visible = true; o.material = no.mats.novo; }
    else if (fant.has(nome)) { o.visible = true; o.material = no.mats.fantasma; o.castShadow = false; continue; }
    else if (mostra.has(nome)) { o.visible = true; o.material = p.contexto === false ? no.mats.normal : no.mats.contexto; }
    else o.visible = false;
    o.castShadow = true;
  }
  // peças que mantêm a cor real mesmo como contexto (ex.: protoboard já montada)
  for (const nome of resolver(p.cor)) if (nos[nome] && nos[nome].obj.visible && !todosNovos.has(nome)) nos[nome].obj.material = nos[nome].mats.normal;
  estado = { novos, todosNovos };
  // setas: do centro explodido ao centro montado
  setas.clear();
  for (const g of novos) {
    if (g.de.lengthSq() < 1) continue;
    const bb = new THREE.Box3();
    g.nomes.forEach((n) => bb.union(nos[n].bb));
    if (bb.isEmpty()) continue;
    const c1 = bb.getCenter(V3(0, 0, 0)), c0 = c1.clone().add(g.de);
    const dir = c1.clone().sub(c0), L = dir.length();
    const seta = new THREE.ArrowHelper(dir.normalize(), c0, L * .92, 0xd9a400, Math.min(10, L * .25), Math.min(5, L * .12));
    seta.line.material = new THREE.LineDashedMaterial({ color: 0xc89600, dashSize: 4, gapSize: 3 });
    seta.line.computeLineDistances();
    setas.add(seta);
  }
  enquadrar(p, inicial || !!FOTO);
  montarRotulos(p);
  if (!FOTO) pintarPainel(p);
  t0 = performance.now();
  if (FOTO) requestAnimationFrame(() => requestAnimationFrame(() => { renderizar(0); window.FOTO_PRONTA = true; }));
}

function enquadrar(p, imediato) {
  const foco = resolver(p.cam?.foco || []);
  const bb = new THREE.Box3();
  const juntar = (n) => { if (nos[n]) bb.union(nos[n].bb); };
  if (foco.size) {
    foco.forEach(juntar);
    for (const g of estado.novos) g.nomes.forEach((n) => { if (foco.has(n)) bb.union(nos[n].bb.clone().translate(g.de)); });
  }
  else {
    estado.todosNovos.forEach(juntar);
    for (const g of estado.novos) g.nomes.forEach((n) => { if (nos[n]) bb.union(nos[n].bb.clone().translate(g.de)); });
    if (bb.isEmpty()) for (const n in nos) if (nos[n].obj.visible && nos[n].obj.material !== nos[n].mats.fantasma) juntar(n);
  }
  if (bb.isEmpty()) bb.setFromCenterAndSize(V3(0, 200, 0), V3(300, 400, 300));
  const esfera = bb.getBoundingSphere(new THREE.Sphere());
  const alvo = p.cam?.alvo ? cad(p.cam.alvo) : esfera.center;
  const dir = cad(p.cam?.dir || [1, -1.3, .8]).normalize();
  const fov = THREE.MathUtils.degToRad(camera.fov), asp = Math.min(1, camera.aspect);
  const dist = Math.max(40, esfera.radius / Math.sin(Math.atan(Math.tan(fov / 2) * asp))) * (p.cam?.zoom || 1) * 1.02;
  const pos = alvo.clone().addScaledVector(dir, dist);
  if (imediato) { controles.target.copy(alvo); camera.position.copy(pos); camTween = null; }
  else camTween = { t: performance.now(), a0: controles.target.clone(), p0: camera.position.clone(), a1: alvo, p1: pos };
  chao.visible = p.chao !== false;
}

/* ------------------------------------------------------------------ rótulos (HTML sobre o 3D) */
let rotulos = [];
function ancora(r) {
  if (r.furo) return cad(furo(r.furo));
  if (r.pino) return cad(pinoEsp(r.pino));
  if (r.sel) {
    const bb = new THREE.Box3();
    resolver([r.sel]).forEach((n) => bb.union(nos[n].bb));
    if (!bb.isEmpty()) return bb.getCenter(V3(0, 0, 0));
  }
  return cad(r.p || [0, 0, 0]);
}
function montarRotulos(p) {
  camadaRot.innerHTML = "";
  svgRot.innerHTML = "";
  rotulos = (p.rotulos || []).map((r) => {
    const el = document.createElement("div");
    el.className = "rot" + (r.tipo ? " rot-" + r.tipo : "");
    el.innerHTML = rico(r.t);
    camadaRot.appendChild(el);
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    const pt = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    pt.setAttribute("r", 3.2);
    svgRot.append(ln, pt);
    return { el, ln, pt, p: ancora(r), o: r.o || [34, -30], segue: r.segue || r.sel };
  });
}
function posicionarRotulos() {
  const w = palco.clientWidth, h = palco.clientHeight, v = V3(0, 0, 0);
  for (const r of rotulos) {
    v.copy(r.p);
    if (r.segue && estado) {       // rótulo preso a uma peça que se move na animação
      const n = nos[[...resolver([r.segue])][0]];
      if (n) v.add(n.obj.position.clone().sub(n.base));
    }
    v.project(camera);
    const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h, fora = v.z > 1;
    let lx = x + r.o[0], ly = Math.min(h - 14, Math.max(14, y + r.o[1]));
    const lw = r.el.offsetWidth, esq = r.o[0] < 0;          // rótulo não sai da área do 3D
    if (esq) lx = Math.max(lw + 4, lx); else lx = Math.min(w - lw - 4, lx);
    r.el.style.transform = `translate(${lx}px, ${ly}px) translate(${esq ? "-100%" : "0"}, -50%)`;
    r.el.style.opacity = fora ? 0 : 1;
    r.ln.setAttribute("x1", x); r.ln.setAttribute("y1", y); r.ln.setAttribute("x2", lx); r.ln.setAttribute("y2", ly);
    r.pt.setAttribute("cx", x); r.pt.setAttribute("cy", y);
  }
}

/* ------------------------------------------------------------------ animação: explodido → montado */
const PERIODO = 3600;
function fase(t) {           // 0 = explodido, 1 = montado
  if (montadoFixo) return 1;
  const u = (t % PERIODO) / PERIODO;
  if (u < .22) return 0;
  if (u < .62) { const k = (u - .22) / .4; return k * k * (3 - 2 * k); }
  return 1;
}
function renderizar(k) {
  if (estado) {
    for (const g of estado.novos) for (const n of g.nomes) {
      const no = nos[n];
      no.obj.position.copy(no.base).addScaledVector(g.de, 1 - k);
    }
    const brilho = FOTO ? .22 : .12 + .14 * (1 - k) + .06 * Math.sin(performance.now() / 260);
    for (const n of estado.todosNovos) nos[n].mats.novo.emissiveIntensity = brilho;
    setas.visible = k < .98;
  }
  posicionarRotulos();
  renderer.render(cena, camera);
}
function quadro(t) {
  if (camTween) {
    const e = Math.min(1, (t - camTween.t) / 700), s = e * e * (3 - 2 * e);
    controles.target.lerpVectors(camTween.a0, camTween.a1, s);
    camera.position.lerpVectors(camTween.p0, camTween.p1, s);
    if (e >= 1) camTween = null;
  }
  controles.update();
  if (FOTO) return renderizar(params.get("montado") ? 1 : 0);
  if (!pausado) renderizar(fase(t - t0));
  else renderizar(montadoFixo ? 1 : fase(PERIODO * .1));
}
function redimensionar() {
  const w = palco.clientWidth, h = palco.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

/* ================================================================== painel do passo */
const feitos = new Set(ler("manual-feitos", []));
function pintarIndice() {
  const nav = $("#indice");
  nav.innerHTML = MODULOS.map((m) => {
    const ps = PASSOS.filter((p) => p.modulo === m.id);
    const ok = ps.filter((p) => feitos.has(p.id)).length;
    return `<section class="mod" data-mod="${m.id}">
      <h3><span class="mod-cod">${m.cod}</span><span class="mod-nome">${esc(m.nome)}</span><span class="mod-ok">${ok}/${ps.length}</span></h3>
      <ol>${ps.map((p) => `<li><a href="#${p.id}" data-id="${p.id}" class="${feitos.has(p.id) ? "feito" : ""}">
        <span class="n">${p.num}</span><span class="t">${esc(p.titulo)}</span>
        <span class="tipos">${(p.tipo || []).map((t) => `<i class="tp tp-${t}" title="${TIPOS[t].nome}"></i>`).join("")}</span></a></li>`).join("")}</ol>
    </section>`;
  }).join("");
}
function pintarPainel(p) {
  const m = MODULOS.find((x) => x.id === p.modulo);
  const i = PASSOS.indexOf(p);
  const lista = (titulo, itens, cls) => itens?.length ? `<h4>${titulo}</h4><ul class="${cls || ""}">${itens.map((x) => `<li>${rico(x)}</li>`).join("")}</ul>` : "";
  const pecas = p.pecas?.length ? `<h4>Separe</h4><table class="pecas">${p.pecas.map(([q, item, obs]) =>
    `<tr><td class="q">${esc(q)}</td><td>${rico(item)}${obs ? `<small>${rico(obs)}</small>` : ""}</td></tr>`).join("")}</table>` : "";
  $("#passo").innerHTML = `
    <p class="passo-mod"><span class="mod-cod">${m.cod}</span> ${esc(m.nome)} <span class="passo-pos">passo ${i + 1} de ${PASSOS.length}</span></p>
    <h2><span class="n">${p.num}</span> ${esc(p.titulo)}</h2>
    <p class="tipos-linha">${(p.tipo || []).map((t) => `<span class="tag tp-${t}"><i class="tp tp-${t}"></i>${TIPOS[t].nome}</span>`).join("")}
      ${p.tempo ? `<span class="tag tempo">⏱ ${esc(p.tempo)}</span>` : ""}${p.quem ? `<span class="tag quem">${esc(p.quem)}</span>` : ""}</p>
    ${p.resumo ? `<p class="resumo">${rico(p.resumo)}</p>` : ""}
    ${p.html || ""}
    ${pecas}
    ${lista("Ferramentas", p.ferramentas, "ferr")}
    ${p.passos?.length ? `<h4>Faça</h4><ol class="faca">${p.passos.map((x) => `<li>${rico(x)}</li>`).join("")}</ol>` : ""}
    ${p.atencao?.length ? `<div class="atencao"><b>Atenção</b><ul>${p.atencao.map((x) => `<li>${rico(x)}</li>`).join("")}</ul></div>` : ""}
    ${p.confira?.length ? `<div class="confira"><b>✅ Confira antes de seguir</b><ul>${p.confira.map((x) => `<li>${rico(x)}</li>`).join("")}</ul></div>` : ""}
    <label class="feito-check"><input type="checkbox" id="marcar-feito" ${feitos.has(p.id) ? "checked" : ""}> Passo feito</label>`;
  $("#marcar-feito").addEventListener("change", (e) => {
    e.target.checked ? feitos.add(p.id) : feitos.delete(p.id);
    guardar("manual-feitos", [...feitos]);
    pintarIndice(); marcarAtivo();
  });
  $("#ant").disabled = i === 0;
  $("#prox").disabled = i === PASSOS.length - 1;
  $("#prox").textContent = i < PASSOS.length - 1 ? "Próximo: " + PASSOS[i + 1].num + " →" : "Fim";
  $("#passo").scrollTop = 0;
  $("#barra i").style.width = (100 * (i + 1) / PASSOS.length) + "%";
  marcarAtivo();
}
function marcarAtivo() {
  document.querySelectorAll("#indice a").forEach((a) => a.classList.toggle("ativo", a.dataset.id === passoAtual?.id));
  document.querySelector("#indice a.ativo")?.scrollIntoView({ block: "nearest" });
}
function mover(d) {
  const i = PASSOS.indexOf(passoAtual) + d;
  if (PASSOS[i]) irPara(PASSOS[i].id);
}

if (!FOTO) {
  pintarIndice();
  $("#indice").addEventListener("click", (e) => {
    const a = e.target.closest("a[data-id]");
    if (!a) return;
    e.preventDefault();
    irPara(a.dataset.id);
    document.body.classList.remove("indice-aberto");
  });
  $("#ant").addEventListener("click", () => mover(-1));
  $("#prox").addEventListener("click", () => mover(1));
  $("#abrir-indice").addEventListener("click", () => document.body.classList.toggle("indice-aberto"));
  $("#tocar").addEventListener("click", () => {
    pausado = !pausado; montadoFixo = false; t0 = performance.now();
    $("#tocar").setAttribute("aria-pressed", String(!pausado));
    $("#tocar").textContent = pausado ? "▶ Animar" : "❚❚ Pausar";
  });
  $("#tocar").textContent = pausado ? "▶ Animar" : "❚❚ Pausar";
  $("#montado").addEventListener("click", () => { pausado = true; montadoFixo = !montadoFixo; $("#tocar").textContent = "▶ Animar";
    $("#montado").textContent = montadoFixo ? "Ver explodido" : "Ver montado"; });
  $("#recentrar").addEventListener("click", () => passoAtual && enquadrar(passoAtual, false));
  addEventListener("hashchange", () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && id !== passoAtual?.id) irPara(id); });
  addEventListener("keydown", (e) => {
    if (e.target.closest("input, textarea")) return;
    if (e.key === "ArrowRight") mover(1);
    if (e.key === "ArrowLeft") mover(-1);
  });
}
window.irPara = irPara;
iniciar();
