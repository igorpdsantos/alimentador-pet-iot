// Gera as imagens do manual de montagem (docs/manual/img/<id>.png) abrindo site/manual.html?foto=<id> no Chrome
// sem interface (protocolo DevTools, sem dependências) e escreve docs/manual/README.md a partir de passos.js.
//   node site/ferramentas/capturar_manual.mjs            → todos os passos + markdown
//   node site/ferramentas/capturar_manual.mjs b2 b3      → só esses passos (sem reescrever o markdown)
//   SAIDA=/outra/pasta node ...                           → grava as imagens em outra pasta (rascunho)
//   SO_MD=1 node ...                                      → só reescreve o markdown (texto mudou, imagens não)
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SITE = path.join(RAIZ, "site");
const DOCS = path.join(RAIZ, "docs", "manual");
const IMG = process.env.SAIDA || path.join(DOCS, "img");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const W = 1200, H = 860;
const { PASSOS, MODULOS, TIPOS } = await import(pathToFileURL(path.join(SITE, "manual", "passos.js")));
const so = process.argv.slice(2);
const SO_MD = !!process.env.SO_MD;          // SO_MD=1: só reescreve o markdown (imagens já existem)

// servidor estático da pasta site/
const tipos = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".glb": "model/gltf-binary", ".png": "image/png", ".json": "application/json" };
const srv = createServer(async (req, res) => {
  const p = path.join(SITE, decodeURIComponent(new URL(req.url, "http://x").pathname));
  try { res.writeHead(200, { "content-type": tipos[path.extname(p)] || "application/octet-stream" }); res.end(await readFile(p)); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const porta = srv.address().port;

if (!SO_MD) {
const perfil = path.join(process.env.TMPDIR || "/tmp", "manual-chrome-" + process.pid);
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", "--user-data-dir=" + perfil, "--no-first-run",
  "--use-angle=metal", "--enable-gpu", "--hide-scrollbars", `--window-size=${W},${H}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const wsUrl = await new Promise((ok, erro) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/ws:\/\/[^\s]+/); if (m) ok(m[0]); });
  setTimeout(() => erro(new Error("Chrome não abriu")), 20000);
});
const alvo = await (await fetch(wsUrl.replace("ws://", "http://").replace(/\/devtools\/browser\/.*/, "/json/new?about:blank"), { method: "PUT" })).json();
const ws = new WebSocket(alvo.webSocketDebuggerUrl);
await new Promise((ok) => ws.addEventListener("open", ok));
let seq = 0;
const pend = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((ok) => { const id = ++seq; pend.set(id, ok); ws.send(JSON.stringify({ id, method, params })); });
const avaliar = async (expr) => (await cdp("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

await cdp("Page.enable");
await cdp("Runtime.enable");
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await mkdir(IMG, { recursive: true });
const lista = PASSOS.filter((p) => !so.length || so.includes(p.id));
let primeiro = true;
for (const p of lista) {
  if (primeiro) {
    await cdp("Page.navigate", { url: `http://localhost:${porta}/manual.html?foto=${p.id}` });
    for (let i = 0; i < 200 && !(await avaliar("window.FOTO_PRONTA === true")); i++) await espera(150);
    primeiro = false;
  } else {
    await avaliar(`window.FOTO_PRONTA = false; window.irPara(${JSON.stringify(p.id)}); true`);
    for (let i = 0; i < 100 && !(await avaliar("window.FOTO_PRONTA === true")); i++) await espera(60);
  }
  await espera(350);
  const shot = await cdp("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(IMG, p.id + ".png"), Buffer.from(shot.result.data, "base64"));
  process.stdout.write(p.id + " ");
}
console.log("\n" + lista.length + " imagens em " + path.relative(RAIZ, IMG));
ws.close(); chrome.kill();
}
srv.close();

/* ------------------------------------------------------------------ docs/manual/README.md */
if (so.length || process.env.SAIDA) process.exit(0);
const tira = (t) => String(t);
const linhas = [
  "# Manual de montagem — Alimentador v3",
  "",
  "> Gerado por `site/ferramentas/capturar_manual.mjs` a partir de `site/manual/passos.js` — **não edite à mão**.",
  "> Versão interativa (gira, aproxima e anima cada passo): `site/manual.html` (no site do projeto: **Manual 3D**).",
  "",
  "Legenda das imagens: **amarelo = peça que entra neste passo**, cinza = o que já está montado, translúcido = só referência",
  "(ex.: o tubo, para ver por dentro). A seta tracejada mostra o caminho da peça até o lugar dela.",
  "",
  "Tipos de trabalho: " + Object.values(TIPOS).map((t) => `${t.emoji} ${t.nome}`).join(" · "),
  "",
  "## Módulos",
  "",
  "| Módulo | O que é | Tipo | Depende de | Tempo |",
  "|---|---|---|---|---|",
  ...MODULOS.map((m) => `| **${m.cod}** ${m.nome} | ${m.desc} | ${m.tipo} | ${m.depende || "—"} | ${m.tempo || ""} |`),
  "",
];
for (const m of MODULOS) {
  linhas.push(`## ${m.cod} — ${m.nome}`, "", m.desc, "");
  for (const p of PASSOS.filter((x) => x.modulo === m.id)) {
    linhas.push(`### ${p.num} ${p.titulo}`, "");
    linhas.push(((p.tipo || []).map((t) => TIPOS[t].emoji + " " + TIPOS[t].nome).join(" · ")) + (p.tempo ? ` · ⏱ ${p.tempo}` : ""), "");
    if (existsSync(path.join(IMG, p.id + ".png"))) linhas.push(`![${p.num} ${p.titulo}](img/${p.id}.png)`, "");
    if (p.resumo) linhas.push(tira(p.resumo), "");
    if (p.md) linhas.push(p.md, "");
    if (p.pecas?.length) {
      linhas.push("**Separe:**", "", "| Qtd | Item |", "|---|---|");
      for (const [q, item, obs] of p.pecas) linhas.push(`| ${q} | ${tira(item)}${obs ? " — " + tira(obs) : ""} |`);
      linhas.push("");
    }
    if (p.ferramentas?.length) linhas.push("**Ferramentas:** " + p.ferramentas.join(", ") + ".", "");
    if (p.passos?.length) { linhas.push("**Faça:**", ""); p.passos.forEach((x, i) => linhas.push(`${i + 1}. ${tira(x)}`)); linhas.push(""); }
    if (p.atencao?.length) { linhas.push("> ⚠️ **Atenção**"); p.atencao.forEach((x) => linhas.push("> - " + tira(x))); linhas.push(""); }
    if (p.confira?.length) { linhas.push("✅ **Confira antes de seguir:**", ""); p.confira.forEach((x) => linhas.push("- [ ] " + tira(x))); linhas.push(""); }
  }
}
await writeFile(path.join(DOCS, "README.md"), linhas.join("\n"));
console.log("docs/manual/README.md escrito");
