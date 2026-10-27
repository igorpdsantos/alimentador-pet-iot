// Simulador do alimentador: faz o papel do ESP32 no contrato MQTT (specs/05-protocolo-mqtt.md)
// com balança, bateria e reservatório falsos. Serve para desenvolver e demonstrar o app sem hardware.
//
//   node simulador.mjs --local --id pf-sim001     broker próprio em ws://localhost:9001 (sem internet)
//   node simulador.mjs --id pf-sim001             usa o broker de .env (MQTT_URL, MQTT_USER, MQTT_PASS)
//
// Opções: --fail-rate 0.1 (chance de NO_FLOW), --no-seed (sem histórico inicial), --port 9001
// Teclas (no terminal): p = tomada/pilhas · b = tira/põe a vasilha · v = esvazia o reservatório · q = sair
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import readline from 'node:readline';
import mqtt from 'mqtt';
import { WebSocketServer, createWebSocketStream } from 'ws';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const flag = (name) => args.includes(`--${name}`);

const ID = opt('id', 'pf-sim001');
const FAIL_RATE = Number(opt('fail-rate', '0'));
const LOCAL = flag('local');
const PORT = Number(opt('port', '9001'));
const FW = '0.1.0-sim';
const PROTO = 1;

// ---------- Broker local (aedes sobre WebSocket) ----------
let url, user, pass;
if (LOCAL) {
  const aedes = require('aedes')();
  const http = createServer();
  const wss = new WebSocketServer({ server: http, handleProtocols: (p) => (p.has('mqtt') ? 'mqtt' : false) });
  wss.on('connection', (ws) => aedes.handle(createWebSocketStream(ws)));
  await new Promise((r) => http.listen(PORT, r));
  url = `ws://localhost:${PORT}/mqtt`;
  console.log(`[sim] broker local em ${url} (no app: URL ${url}, usuário e senha em branco)`);
} else {
  const envFile = new URL('.env', import.meta.url);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  url = process.env.MQTT_URL;
  user = process.env.MQTT_USER;
  pass = process.env.MQTT_PASS;
  if (!url) {
    console.error('Defina MQTT_URL/MQTT_USER/MQTT_PASS em tools/simulador/.env ou use --local');
    process.exit(1);
  }
}

// ---------- Estado simulado ----------
const now = () => Math.floor(Date.now() / 1000);
const r1 = (x) => Math.round(x * 10) / 10;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const state = {
  seq: 0,
  feedId: 0,
  onMains: true,
  batteryV: 8.9,
  bowlPresent: true,
  bowlWeight: 180,
  food: 25,
  hopper: { remaining: 640, capacity: 800, learned: false },
  feeding: null, // { feedId, cancel }
  meals: [
    { id: 1, time: '07:30', grams: 40, days: [0, 1, 2, 3, 4, 5, 6], enabled: true, mode: 'add' },
    { id: 2, time: '18:00', grams: 50, days: [0, 1, 2, 3, 4, 5, 6], enabled: true, mode: 'add' },
  ],
  settings: { pet_name: 'Thor', button_grams: 20, max_bowl_g: 300, battery_chemistry: 'alkaline', timezone: '<-03>3' },
  calibration: { scale_factor: 412.3, bowl_weight_g: 180, servo_neutral_us: 1500, flow_g_per_ms: 0.01 },
  feeds: [], // histórico de refeições
  consumption: [],
  lastServed: {}, // meal_id → AAAA-MM-DD
  reqCache: new Map(),
  alerts: new Set(),
};

const CELL_V = [1.55, 1.45, 1.38, 1.3, 1.25, 1.2, 1.15, 1.1, 1.05, 1.0];
const CELL_PCT = [100, 90, 75, 55, 40, 25, 15, 8, 3, 0];
function batteryPct(v) {
  const c = v / 6;
  if (c >= CELL_V[0]) return 100;
  for (let i = 1; i < CELL_V.length; i++) {
    if (c >= CELL_V[i]) {
      const t = (c - CELL_V[i]) / (CELL_V[i - 1] - CELL_V[i]);
      return Math.round(CELL_PCT[i] + t * (CELL_PCT[i - 1] - CELL_PCT[i]));
    }
  }
  return 0;
}
const battery = () => {
  const pct = batteryPct(state.batteryV);
  return { pct, v: Math.round(state.batteryV * 100) / 100, level: pct <= 5 ? 'critical' : pct <= 20 ? 'low' : 'ok', installed: true };
};
const hopperPct = () => Math.round((100 * state.hopper.remaining) / state.hopper.capacity);

function dailyAverage() {
  const cutoff = now() - 7 * 86400;
  const served = state.feeds.filter((f) => f.ts > cutoff).reduce((s, f) => s + f.served_g, 0);
  return served / 7;
}

function localParts(d = new Date()) {
  // Hora de Brasília (UTC−3), como o firmware com TZ "<-03>3"
  const t = new Date(d.getTime() - 3 * 3600 * 1000);
  return {
    date: t.toISOString().slice(0, 10),
    wday: t.getUTCDay(),
    hhmm: t.toISOString().slice(11, 16),
    minutes: t.getUTCHours() * 60 + t.getUTCMinutes(),
  };
}

function nextMeal() {
  const p = localParts();
  let best = null;
  for (const m of state.meals) {
    if (!m.enabled || !m.days.length) continue;
    const [h, mi] = m.time.split(':').map(Number);
    for (let d = 0; d < 8; d++) {
      if (!m.days.includes((p.wday + d) % 7)) continue;
      const dist = d * 1440 + h * 60 + mi - p.minutes;
      if (dist < 0 || (dist === 0 && state.lastServed[m.id] === p.date)) continue;
      if (!best || dist < best.dist) best = { dist, m };
      break;
    }
  }
  return best ? { id: best.m.id, time: best.m.time, grams: best.m.grams } : null;
}

function computeAlerts() {
  const a = new Set();
  const b = battery();
  if (b.level !== 'ok') a.add('LOW_BATTERY');
  if (!state.onMains) a.add('ON_BATTERY');
  if (state.hopper.remaining <= 0) a.add('HOPPER_EMPTY');
  else if (hopperPct() <= 20) a.add('HOPPER_LOW');
  return a;
}

function status() {
  const avg = dailyAverage();
  return {
    proto: PROTO,
    ts: now(),
    fw: FW,
    power: { source: state.onMains ? 'mains' : 'battery' },
    battery: battery(),
    bowl: { present: state.bowlPresent, food_g: state.bowlPresent ? r1(state.food) : 0 },
    hopper: {
      remaining_g: Math.round(state.hopper.remaining),
      pct: hopperPct(),
      capacity_g: Math.round(state.hopper.capacity),
      capacity_learned: state.hopper.learned,
      days_left: avg >= 1 ? Math.floor(state.hopper.remaining / avg) : null,
    },
    feeding: !!state.feeding,
    next_meal: nextMeal(),
    wifi_rssi: -55 - Math.round(Math.random() * 10),
    time_synced: true,
    alerts: [...state.alerts],
  };
}

const config = () => ({ proto: PROTO, meals: state.meals, settings: state.settings, calibration: state.calibration });

// ---------- MQTT ----------
const T = (s) => `petfeeder/${ID}/${s}`;
const client = mqtt.connect(url, {
  username: user,
  password: pass,
  clientId: `${ID}-${Math.random().toString(16).slice(2, 6)}`,
  will: { topic: T('online'), payload: 'false', qos: 1, retain: true },
  reconnectPeriod: 2000,
});

const pub = (sub, obj, retain = false) =>
  client.publish(T(sub), typeof obj === 'string' ? obj : JSON.stringify(obj), { qos: sub === 'status' ? 0 : 1, retain });
const publishStatus = () => pub('status', status(), true);
const publishConfig = () => pub('config', config(), true);
const event = (type, fields, seq = 0) => pub('event', { proto: PROTO, seq, ts: now(), type, ...fields });

function respond(reqId, body) {
  const msg = { req_id: reqId, ...body };
  state.reqCache.set(reqId, msg);
  if (state.reqCache.size > 16) state.reqCache.delete(state.reqCache.keys().next().value);
  pub('resp', msg);
}
const ok = (reqId, data = {}) => respond(reqId, { ok: true, data });
const err = (reqId, error, msg) => respond(reqId, { ok: false, error, msg });

client.on('connect', () => {
  console.log(`[sim] conectado; device_id ${ID}`);
  pub('online', 'true', true);
  client.subscribe(T('cmd'), { qos: 1 });
  publishConfig();
  publishStatus();
});
client.on('error', (e) => console.error('[sim] erro MQTT:', e.message));

// ---------- Dosagem simulada ----------
async function feed({ grams, mode = 'add', source, mealId, reqId }) {
  if (state.feeding) return reqId && err(reqId, 'BUSY', 'Já há uma refeição em andamento');
  const feedId = ++state.feedId;
  const seq = ++state.seq;
  if (reqId) ok(reqId, { feed_id: feedId });
  const started = Date.now();
  state.feeding = { feedId, cancel: false };
  let target = mode === 'fill_to' ? grams - state.food : grams;
  target = Math.max(0, Math.min(target, state.settings.max_bowl_g - state.food));
  event('feed_started', { feed_id: feedId, source, ...(mealId ? { meal_id: mealId } : {}), target_g: r1(target) }, seq);
  publishStatus();

  const result = { served: 0, pulses: 0, unjam: 0, status: 'OK' };
  const tol = Math.max(3, 0.05 * target);
  const willJam = Math.random() < FAIL_RATE;
  if (!state.bowlPresent) result.status = 'BOWL_MISSING';
  else if (!state.onMains && battery().pct <= 15) result.status = 'LOW_BATTERY';
  else if (target < 3) result.status = 'SKIPPED_FULL';
  else {
    let noGain = 0;
    while (target - result.served > tol * 0.4) {
      if (state.feeding.cancel) { result.status = 'CANCELED'; break; }
      if (Date.now() - started > 90000) { result.status = 'TIMEOUT'; break; }
      const missing = target - result.served;
      const slow = missing < 11;
      await sleep(slow ? 900 : 1600);
      result.pulses++;
      let gain = 0;
      if (!willJam && state.hopper.remaining > 0) {
        const want = slow ? missing * (0.4 + Math.random() * 0.5) : Math.min(missing * 0.7, 6 + Math.random() * 10);
        gain = Math.min(state.hopper.remaining, want * (0.9 + Math.random() * 0.2));
      }
      state.hopper.remaining -= gain;
      state.food += gain;
      result.served += gain;
      event('feed_progress', { feed_id: feedId, served_g: r1(result.served) }, seq);
      if (gain >= 0.5) { noGain = 0; continue; }
      if (++noGain >= (result.unjam ? 1 : 2)) {
        if (result.unjam >= 4) { result.status = 'NO_FLOW'; break; }
        result.unjam++;
        noGain = 0;
        await sleep(600);
      }
    }
    if (result.status === 'OK' && result.served < target - tol) result.status = 'PARTIAL';
  }

  const rec = {
    seq, ts: now(), feed_id: feedId, source, ...(mealId ? { meal_id: mealId } : {}),
    target_g: r1(target), served_g: r1(result.served), duration_ms: Date.now() - started,
    pulses: result.pulses, unjam_tries: result.unjam, status: result.status,
    unstable: false, interference: false, battery_pct: battery().pct,
  };
  if (result.status === 'NO_FLOW' && state.hopper.remaining <= 0.15 * state.hopper.capacity) state.hopper.remaining = 0;
  state.feeds.push(rec);
  state.feeding = null;
  event('feed_result', rec, seq);
  console.log(`[sim] refeição ${feedId}: ${rec.status} ${rec.served_g} de ${rec.target_g} g`);
  refreshAlerts();
  publishStatus();
}

// ---------- Comandos ----------
const fail = (reqId, msg) => err(reqId, 'INVALID_ARGS', msg);
const num = (v, lo, hi) => typeof v === 'number' && v >= lo && v <= hi;

client.on('message', async (_topic, buf) => {
  let c;
  try { c = JSON.parse(buf.toString()); } catch { return; }
  if (!c.req_id) return;
  if (state.reqCache.has(c.req_id)) return pub('resp', state.reqCache.get(c.req_id));
  if (c.proto !== PROTO) return fail(c.req_id, 'Versão do protocolo incompatível');
  console.log(`[sim] cmd ${c.cmd} (${c.req_id})`);
  const hw = ['feed', 'tare_platform', 'calibrate', 'tare_bowl', 'read_scale', 'rotor_test', 'servo_trim', 'unjam', 'empty_hopper', 'calibrate_battery'];
  if (hw.includes(c.cmd) && state.feeding) return err(c.req_id, 'BUSY', 'Já há uma refeição em andamento');

  switch (c.cmd) {
    case 'ping':
      return ok(c.req_id, { fw: FW, proto: PROTO, uptime_s: Math.round(process.uptime()) });
    case 'feed':
      if (!num(c.grams, 5, 200)) return fail(c.req_id, 'Gramas entre 5 e 200');
      if (c.mode && !['add', 'fill_to'].includes(c.mode)) return fail(c.req_id, 'Modo inválido');
      return feed({ grams: c.grams, mode: c.mode, source: 'app', reqId: c.req_id });
    case 'cancel_feed': {
      const was = !!state.feeding;
      if (state.feeding) state.feeding.cancel = true;
      return ok(c.req_id, { was_feeding: was });
    }
    case 'set_schedule': {
      const meals = c.meals;
      const valid = Array.isArray(meals) && meals.length <= 8 && meals.every((m) =>
        num(m.id, 1, 255) && num(m.grams, 5, 200) && /^([01]\d|2[0-3]):[0-5]\d$/.test(m.time) &&
        Array.isArray(m.days) && m.days.every((d) => num(d, 0, 6)) && typeof m.enabled === 'boolean');
      if (!valid) return fail(c.req_id, 'Refeição inválida');
      state.meals = meals.map((m) => ({ ...m, mode: m.mode ?? 'add', days: [...new Set(m.days)].sort() }));
      publishConfig();
      publishStatus();
      return ok(c.req_id);
    }
    case 'set_settings': {
      const s = { ...state.settings };
      for (const k of Object.keys(s)) if (c[k] !== undefined) s[k] = c[k];
      if (!num(s.button_grams, 5, 200) || !num(s.max_bowl_g, 50, 2000)) return fail(c.req_id, 'Valores fora da faixa');
      state.settings = s;
      publishConfig();
      return ok(c.req_id);
    }
    case 'history': {
      const since = c.since_seq ?? 0;
      const limit = Math.min(c.limit ?? 20, 50);
      const list = (c.kind === 'consumption' ? state.consumption : state.feeds).filter((x) => x.seq > since);
      const items = list.slice(0, limit);
      return ok(c.req_id, { items, next_seq: items.length ? items.at(-1).seq : since, has_more: list.length > limit });
    }
    case 'tare_platform':
      await sleep(1000);
      return ok(c.req_id);
    case 'calibrate':
      if (!num(c.known_g, 10, 4500)) return fail(c.req_id, 'Peso conhecido entre 10 e 4500 g');
      await sleep(1000);
      state.calibration.scale_factor = r1(410 + Math.random() * 5);
      publishConfig();
      return ok(c.req_id, { scale_factor: state.calibration.scale_factor });
    case 'tare_bowl':
      await sleep(1000);
      state.calibration.bowl_weight_g = state.bowlWeight;
      state.food = 0;
      publishConfig();
      return ok(c.req_id, { bowl_weight_g: state.bowlWeight });
    case 'read_scale': {
      const g = (state.bowlPresent ? state.bowlWeight + state.food : 0) + (Math.random() - 0.5) * 0.4;
      return ok(c.req_id, { raw: Math.round(g * state.calibration.scale_factor + 84000), grams: r1(g), stable: true });
    }
    case 'rotor_test':
      if (!['fwd', 'rev'].includes(c.dir) || !num(c.ms, 50, 2000)) return fail(c.req_id, 'dir fwd/rev e ms ≤ 2000');
      await sleep(c.ms);
      return ok(c.req_id);
    case 'servo_trim':
      if (!num(c.neutral_us, 1400, 1600)) return fail(c.req_id, 'neutral_us entre 1400 e 1600');
      state.calibration.servo_neutral_us = Math.round(c.neutral_us);
      publishConfig();
      return ok(c.req_id, { neutral_us: state.calibration.servo_neutral_us });
    case 'unjam':
      await sleep(1200);
      return ok(c.req_id);
    case 'calibrate_battery':
      if (!num(c.measured_v, 3, 12)) return fail(c.req_id, 'Tensão entre 3 e 12 V');
      state.batteryV = c.measured_v;
      publishStatus();
      return ok(c.req_id, { v: c.measured_v });
    case 'refill':
      if (c.full === true) state.hopper.remaining = state.hopper.capacity;
      else if (num(c.grams, 1, 5000)) state.hopper.remaining = Math.min(state.hopper.capacity, state.hopper.remaining + c.grams);
      else return fail(c.req_id, 'Informe full=true ou grams');
      ok(c.req_id, { remaining_g: Math.round(state.hopper.remaining), capacity_g: state.hopper.capacity });
      refreshAlerts();
      return publishStatus();
    case 'empty_hopper':
      ok(c.req_id);
      state.hopper.remaining = 0;
      refreshAlerts();
      return publishStatus();
    case 'reboot':
      ok(c.req_id);
      return publishStatus();
    default:
      return fail(c.req_id, 'Comando desconhecido');
  }
});

function refreshAlerts() {
  const next = computeAlerts();
  for (const a of next) {
    if (!state.alerts.has(a)) event('alert', { code: a, msg: ALERT_MSG[a] ?? a });
  }
  if (state.alerts.has('ON_BATTERY') && !next.has('ON_BATTERY')) event('alert', { code: 'MAINS_RESTORED', msg: 'Energia da tomada voltou' });
  const changed = next.size !== state.alerts.size || [...next].some((a) => !state.alerts.has(a));
  state.alerts = next;
  return changed;
}
const ALERT_MSG = {
  LOW_BATTERY: 'Troque as pilhas',
  ON_BATTERY: 'Sem energia na tomada — usando pilhas',
  HOPPER_LOW: 'Ração acabando no reservatório',
  HOPPER_EMPTY: 'Reabasteça o alimentador',
};

// ---------- Histórico inicial (7 dias) para os gráficos ----------
function seedHistory() {
  const start = now() - 7 * 86400;
  let food = 10;
  for (let ts = start - (start % 900); ts < now(); ts += 900) {
    const h = new Date((ts - 3 * 3600) * 1000).getUTCHours();
    const m = new Date((ts - 3 * 3600) * 1000).getUTCMinutes();
    for (const meal of state.meals) {
      const [mh, mm] = meal.time.split(':').map(Number);
      if (h === mh && m === mm) {
        const served = r1(meal.grams + (Math.random() - 0.5) * 4);
        const statusPick = Math.random() < 0.04 ? 'NO_FLOW' : 'OK';
        const real = statusPick === 'OK' ? served : r1(Math.random() * 5);
        food += real;
        state.feeds.push({
          seq: ++state.seq, ts: ts + 30, feed_id: ++state.feedId, source: 'schedule', meal_id: meal.id,
          target_g: meal.grams, served_g: real, duration_ms: 7000 + Math.round(Math.random() * 4000),
          pulses: 4 + Math.round(Math.random() * 3), unjam_tries: statusPick === 'OK' ? (Math.random() < 0.15 ? 1 : 0) : 4,
          status: statusPick, unstable: false, interference: Math.random() < 0.05, battery_pct: 96,
        });
      }
    }
    // pet come aos poucos nas horas depois da refeição
    if (food > 0 && Math.random() < 0.35) food = Math.max(0, food - (2 + Math.random() * 8));
    state.consumption.push({ seq: ++state.seq, ts, food_g: r1(food) });
  }
  state.food = food;
  console.log(`[sim] histórico inicial: ${state.feeds.length} refeições, ${state.consumption.length} amostras`);
}
if (!flag('no-seed')) seedHistory();
refreshAlerts();

// ---------- Relógio: agenda, consumo, pet comendo ----------
setInterval(() => {
  const p = localParts();
  for (const m of state.meals) {
    if (m.enabled && m.time === p.hhmm && m.days.includes(p.wday) && state.lastServed[m.id] !== p.date) {
      state.lastServed[m.id] = p.date;
      feed({ grams: m.grams, mode: m.mode, source: 'schedule', mealId: m.id });
    }
  }
}, 20000);

let lastSlot = Math.floor(now() / 900);
setInterval(() => {
  if (!state.feeding && state.food > 0 && Math.random() < 0.3) state.food = Math.max(0, state.food - Math.random() * 3);
  if (!state.onMains) state.batteryV = Math.max(5.8, state.batteryV - 0.002);
  const slot = Math.floor(now() / 900);
  if (slot !== lastSlot && state.bowlPresent) {
    lastSlot = slot;
    const rec = { seq: ++state.seq, ts: now(), food_g: r1(state.food) };
    state.consumption.push(rec);
    event('consumption', { food_g: rec.food_g }, rec.seq);
  }
  refreshAlerts();
  publishStatus();
}, 15000);

// ---------- Teclado ----------
if (process.stdin.isTTY) {
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.on('keypress', (_s, key) => {
    if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
      pub('online', 'false', true);
      setTimeout(() => process.exit(0), 200);
    } else if (key.name === 'p') {
      state.onMains = !state.onMains;
      console.log(`[sim] energia: ${state.onMains ? 'tomada' : 'pilhas'}`);
    } else if (key.name === 'b') {
      state.bowlPresent = !state.bowlPresent;
      console.log(`[sim] vasilha ${state.bowlPresent ? 'no lugar' : 'retirada'}`);
    } else if (key.name === 'v') {
      state.hopper.remaining = 0;
      console.log('[sim] reservatório vazio');
    } else return;
    refreshAlerts();
    publishStatus();
  });
  console.log('[sim] teclas: p = tomada/pilhas · b = vasilha · v = esvazia reservatório · q = sair');
}
