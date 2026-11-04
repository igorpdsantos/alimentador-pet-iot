// Modo demonstração: faz o papel do alimentador dentro do navegador, sem broker nem hardware (specs/06-app-mobile.md §6).
// Mesma lógica de tools/simulador, com a mesma interface de FeederClient: as telas não sabem a diferença.
// Os dados são sempre inventados; o app mostra a faixa "Modo demonstração" enquanto ele está ativo.
import { FeederError, type Handlers } from '../mqtt/client';
import type { CommandMap, CommandName } from '../protocol/commands';
import { errorText } from '../protocol/messages';
import type { Config, ConsumptionRecord, FeedMode, FeedRecord, FeedSource, FeedStatus, Meal, Status } from '../protocol/schemas';

export type DemoScenario = 'power' | 'bowl' | 'empty' | 'jam';

const FW = '0.1.0-demo';
const PROTO = 1;
const LATENCY_MS = 150;

const now = () => Math.floor(Date.now() / 1000);
const r1 = (x: number) => Math.round(x * 10) / 10;

const CELL_V = [1.55, 1.45, 1.38, 1.3, 1.25, 1.2, 1.15, 1.1, 1.05, 1.0];
const CELL_PCT = [100, 90, 75, 55, 40, 25, 15, 8, 3, 0];
function batteryPct(v: number) {
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

const ALERT_MSG: Record<string, string> = {
  LOW_BATTERY: 'Troque as pilhas',
  ON_BATTERY: 'Sem energia na tomada — usando pilhas',
  HOPPER_LOW: 'Ração acabando no reservatório',
  HOPPER_EMPTY: 'Reabasteça o alimentador',
};

export class DemoClient {
  private seq = 0;
  private feedId = 0;
  private onMains = true;
  private batteryV = 8.9;
  private bowlPresent = true;
  private bowlWeight = 180;
  private food = 25;
  private hopper = { remaining: 640, capacity: 800 };
  private feeding: { cancel: boolean } | null = null;
  private jamNext = false;
  private meals: Meal[] = [
    { id: 1, time: '07:30', grams: 40, days: [0, 1, 2, 3, 4, 5, 6], enabled: true, mode: 'add' },
    { id: 2, time: '18:00', grams: 50, days: [0, 1, 2, 3, 4, 5, 6], enabled: true, mode: 'add' },
  ];
  private settings: Config['settings'] = { pet_name: 'Thor', button_grams: 20, max_bowl_g: 300, battery_chemistry: 'alkaline', timezone: '<-03>3' };
  private calibration: Config['calibration'] = { scale_factor: 412.3, bowl_weight_g: 180, servo_neutral_us: 1500, flow_g_per_ms: 0.01 };
  private feeds: FeedRecord[] = [];
  private consumption: ConsumptionRecord[] = [];
  private lastServed: Record<number, string> = {};
  private alerts = new Set<string>();
  private timers: ReturnType<typeof setInterval>[] = [];
  private closed = false;
  private startedAt = Date.now();

  constructor(private handlers: Handlers) {
    this.seedHistory();
    this.alerts = this.computeAlerts();
  }

  connect() {
    this.handlers.onConn?.('connecting');
    setTimeout(() => {
      if (this.closed) return;
      this.handlers.onConn?.('connected');
      this.handlers.onOnline?.(true);
      this.publishConfig();
      this.publishStatus();
      this.timers.push(setInterval(() => this.runSchedule(), 20000));
      this.timers.push(setInterval(() => this.tick(), 15000));
    }, 300);
  }

  close() {
    this.closed = true;
    this.timers.forEach(clearInterval);
    this.timers = [];
  }

  // Situações que no simulador saem pelo teclado; aqui, pelos botões em Ajustes.
  scenario(s: DemoScenario) {
    if (s === 'power') this.onMains = !this.onMains;
    else if (s === 'bowl') this.bowlPresent = !this.bowlPresent;
    else if (s === 'empty') this.hopper.remaining = 0;
    else this.jamNext = true;
    this.refreshAlerts();
    this.publishStatus();
  }

  async request<K extends CommandName>(name: K, args: CommandMap[K]['args'], opts: { reqId?: string } = {}): Promise<CommandMap[K]['data']> {
    await this.sleep(LATENCY_MS);
    return this.execute(name, args, opts.reqId) as Promise<CommandMap[K]['data']>;
  }

  private async execute(name: CommandName, rawArgs: unknown, reqId?: string): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const a = rawArgs as any;
    const fail = (code: string, msg?: string) => new FeederError(code, errorText(code, msg), reqId);
    const needsHardware: CommandName[] = ['feed', 'tare_platform', 'calibrate', 'tare_bowl', 'read_scale', 'rotor_test', 'servo_trim', 'unjam', 'empty_hopper', 'calibrate_battery'];
    if (needsHardware.includes(name) && this.feeding) throw fail('BUSY');

    switch (name) {
      case 'ping':
        return { fw: FW, proto: PROTO, uptime_s: Math.round((Date.now() - this.startedAt) / 1000) };
      case 'feed': {
        if (!(a.grams >= 5 && a.grams <= 200)) throw fail('INVALID_ARGS');
        return { feed_id: this.startFeed(a.grams, a.mode ?? 'add', 'app') };
      }
      case 'cancel_feed': {
        const was = !!this.feeding;
        if (this.feeding) this.feeding.cancel = true;
        return { was_feeding: was };
      }
      case 'set_schedule':
        this.meals = (a.meals as Meal[]).map((m) => ({ ...m, days: [...new Set(m.days)].sort() }));
        this.publishConfig();
        this.publishStatus();
        return {};
      case 'set_settings':
        this.settings = { ...this.settings, ...a };
        this.publishConfig();
        return {};
      case 'history_feeds':
        return this.page(this.feeds, a.since_seq, a.limit);
      case 'history_consumption':
        return this.page(this.consumption, a.since_seq, a.limit);
      case 'tare_platform':
        await this.sleep(1000);
        return {};
      case 'calibrate':
        await this.sleep(1000);
        this.calibration = { ...this.calibration, scale_factor: r1(410 + Math.random() * 5) };
        this.publishConfig();
        return { scale_factor: this.calibration.scale_factor };
      case 'tare_bowl':
        await this.sleep(1000);
        this.calibration = { ...this.calibration, bowl_weight_g: this.bowlWeight };
        this.food = 0;
        this.publishConfig();
        return { bowl_weight_g: this.bowlWeight };
      case 'read_scale': {
        const g = (this.bowlPresent ? this.bowlWeight + this.food : 0) + (Math.random() - 0.5) * 0.4;
        return { raw: Math.round(g * this.calibration.scale_factor + 84000), grams: r1(g), stable: true };
      }
      case 'rotor_test':
        await this.sleep(a.ms);
        return {};
      case 'servo_trim':
        await this.sleep(2000);
        this.calibration = { ...this.calibration, servo_neutral_us: Math.round(a.neutral_us) };
        this.publishConfig();
        return { neutral_us: this.calibration.servo_neutral_us };
      case 'unjam':
        await this.sleep(1200);
        return {};
      case 'calibrate_battery':
        this.batteryV = a.measured_v;
        this.publishStatus();
        return { v: a.measured_v };
      case 'refill':
        this.hopper.remaining = a.full ? this.hopper.capacity : Math.min(this.hopper.capacity, this.hopper.remaining + a.grams);
        this.refreshAlerts();
        this.publishStatus();
        return { remaining_g: Math.round(this.hopper.remaining), capacity_g: this.hopper.capacity };
      case 'empty_hopper':
        this.hopper.remaining = 0;
        this.refreshAlerts();
        this.publishStatus();
        return {};
      case 'reboot':
        return {};
    }
  }

  private page<T extends { seq: number }>(list: T[], since: number, limit: number) {
    const rest = list.filter((x) => x.seq > since);
    const items = rest.slice(0, limit);
    return { items, next_seq: items.length ? items[items.length - 1].seq : since, has_more: rest.length > limit };
  }

  private sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
  }

  private battery(): Status['battery'] {
    const pct = batteryPct(this.batteryV);
    return { pct, v: Math.round(this.batteryV * 100) / 100, level: pct <= 5 ? 'critical' : pct <= 20 ? 'low' : 'ok', installed: true };
  }

  private hopperPct() {
    return Math.round((100 * this.hopper.remaining) / this.hopper.capacity);
  }

  private nextMeal(): Status['next_meal'] {
    const d = new Date();
    const minutes = d.getHours() * 60 + d.getMinutes();
    const today = d.toDateString();
    let best: { dist: number; m: Meal } | null = null;
    for (const m of this.meals) {
      if (!m.enabled || !m.days.length) continue;
      const [h, mi] = m.time.split(':').map(Number);
      for (let day = 0; day < 8; day++) {
        if (!m.days.includes((d.getDay() + day) % 7)) continue;
        const dist = day * 1440 + h * 60 + mi - minutes;
        if (dist < 0 || (dist === 0 && this.lastServed[m.id] === today)) continue;
        if (!best || dist < best.dist) best = { dist, m };
        break;
      }
    }
    return best ? { id: best.m.id, time: best.m.time, grams: best.m.grams } : null;
  }

  private computeAlerts() {
    const a = new Set<string>();
    if (this.battery().level !== 'ok') a.add('LOW_BATTERY');
    if (!this.onMains) a.add('ON_BATTERY');
    if (this.hopper.remaining <= 0) a.add('HOPPER_EMPTY');
    else if (this.hopperPct() <= 20) a.add('HOPPER_LOW');
    return a;
  }

  private refreshAlerts() {
    const next = this.computeAlerts();
    for (const code of next) if (!this.alerts.has(code)) this.alert(code, ALERT_MSG[code] ?? code);
    if (this.alerts.has('ON_BATTERY') && !next.has('ON_BATTERY')) this.alert('MAINS_RESTORED', 'Energia da tomada voltou');
    this.alerts = next;
  }

  private alert(code: string, msg: string) {
    this.handlers.onEvent?.({ proto: PROTO, seq: 0, ts: now(), type: 'alert', code, msg });
  }

  private status(): Status {
    const cutoff = now() - 7 * 86400;
    const avg = this.feeds.filter((f) => f.ts > cutoff).reduce((s, f) => s + f.served_g, 0) / 7;
    return {
      proto: PROTO,
      ts: now(),
      fw: FW,
      power: { source: this.onMains ? 'mains' : 'battery' },
      battery: this.battery(),
      bowl: { present: this.bowlPresent, food_g: this.bowlPresent ? r1(this.food) : 0 },
      hopper: {
        remaining_g: Math.round(this.hopper.remaining),
        pct: this.hopperPct(),
        capacity_g: this.hopper.capacity,
        capacity_learned: false,
        days_left: avg >= 1 ? Math.floor(this.hopper.remaining / avg) : null,
      },
      feeding: !!this.feeding,
      next_meal: this.nextMeal(),
      wifi_rssi: -55 - Math.round(Math.random() * 10),
      time_synced: true,
      alerts: [...this.alerts],
    };
  }

  private publishStatus() {
    if (!this.closed) this.handlers.onStatus?.(this.status());
  }

  private publishConfig() {
    if (!this.closed) this.handlers.onConfig?.({ proto: PROTO, meals: this.meals, settings: this.settings, calibration: this.calibration });
  }

  // Devolve o feed_id na hora; a dosagem continua em segundo plano, como no alimentador.
  private startFeed(grams: number, mode: FeedMode, source: FeedSource, mealId?: number) {
    const feedId = ++this.feedId;
    void this.dose(feedId, grams, mode, source, mealId);
    return feedId;
  }

  private async dose(feedId: number, grams: number, mode: FeedMode, source: FeedSource, mealId?: number) {
    const seq = ++this.seq;
    const started = Date.now();
    const feeding = { cancel: false };
    this.feeding = feeding;
    const meal = mealId ? { meal_id: mealId } : {};
    const wanted = mode === 'fill_to' ? grams - this.food : grams;
    const target = Math.max(0, Math.min(wanted, this.settings.max_bowl_g - this.food));
    this.handlers.onEvent?.({ proto: PROTO, seq, ts: now(), type: 'feed_started', feed_id: feedId, source, ...meal, target_g: r1(target) });
    this.publishStatus();

    const tol = Math.max(3, 0.05 * target);
    const jammed = this.jamNext;
    this.jamNext = false;
    let served = 0;
    let pulses = 0;
    let unjam = 0;
    let result: FeedStatus = 'OK';
    if (!this.bowlPresent) result = 'BOWL_MISSING';
    else if (!this.onMains && this.battery().pct <= 15) result = 'LOW_BATTERY';
    else if (target < 3) result = 'SKIPPED_FULL';
    else {
      let noGain = 0;
      while (target - served > tol * 0.4) {
        if (feeding.cancel) { result = 'CANCELED'; break; }
        const missing = target - served;
        const slow = missing < 11;
        await this.sleep(slow ? 900 : 1600);
        if (this.closed) return;
        pulses++;
        let gain = 0;
        if (!jammed && this.hopper.remaining > 0) {
          const want = slow ? missing * (0.4 + Math.random() * 0.5) : Math.min(missing * 0.7, 6 + Math.random() * 10);
          gain = Math.min(this.hopper.remaining, want * (0.9 + Math.random() * 0.2));
        }
        this.hopper.remaining -= gain;
        this.food += gain;
        served += gain;
        this.handlers.onEvent?.({ proto: PROTO, seq, ts: now(), type: 'feed_progress', feed_id: feedId, served_g: r1(served) });
        if (gain >= 0.5) { noGain = 0; continue; }
        if (++noGain >= (unjam ? 1 : 2)) {
          if (unjam >= 4) { result = 'NO_FLOW'; break; }
          unjam++;
          noGain = 0;
          await this.sleep(600);
          if (this.closed) return;
        }
      }
      if (result === 'OK' && served < target - tol) result = 'PARTIAL';
    }

    const rec: FeedRecord = {
      seq, ts: now(), feed_id: feedId, source, ...meal,
      target_g: r1(target), served_g: r1(served), duration_ms: Date.now() - started,
      pulses, unjam_tries: unjam, status: result, unstable: false, interference: false, battery_pct: this.battery().pct,
    };
    this.feeds.push(rec);
    this.feeding = null;
    this.handlers.onEvent?.({ proto: PROTO, type: 'feed_result', ...rec });
    this.refreshAlerts();
    this.publishStatus();
  }

  private runSchedule() {
    const d = new Date();
    const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const today = d.toDateString();
    for (const m of this.meals) {
      if (m.enabled && m.time === hhmm && m.days.includes(d.getDay()) && this.lastServed[m.id] !== today && !this.feeding) {
        this.lastServed[m.id] = today;
        this.startFeed(m.grams, m.mode, 'schedule', m.id);
      }
    }
  }

  private lastSlot = Math.floor(now() / 900);
  private tick() {
    // O pet come aos poucos; a cada 15 min sai uma amostra de consumo, como no firmware.
    if (!this.feeding && this.food > 0 && Math.random() < 0.3) this.food = Math.max(0, this.food - Math.random() * 3);
    if (!this.onMains) this.batteryV = Math.max(5.8, this.batteryV - 0.002);
    const slot = Math.floor(now() / 900);
    if (slot !== this.lastSlot && this.bowlPresent) {
      this.lastSlot = slot;
      const rec = { seq: ++this.seq, ts: now(), food_g: r1(this.food) };
      this.consumption.push(rec);
      this.handlers.onEvent?.({ proto: PROTO, type: 'consumption', ...rec });
    }
    this.refreshAlerts();
    this.publishStatus();
  }

  // 7 dias de histórico para os gráficos. Uma refeição travada de propósito, para a tela mostrar o caso de erro.
  private seedHistory() {
    const start = now() - 7 * 86400;
    let food = 10;
    let mealCount = 0;
    for (let ts = start - (start % 900); ts < now(); ts += 900) {
      const d = new Date(ts * 1000);
      for (const meal of this.meals) {
        const [h, m] = meal.time.split(':').map(Number);
        if (d.getHours() !== h || d.getMinutes() !== m) continue;
        const jam = ++mealCount === 6;
        const served = jam ? r1(Math.random() * 5) : r1(meal.grams + (Math.random() - 0.5) * 4);
        food += served;
        this.feeds.push({
          seq: ++this.seq, ts: ts + 30, feed_id: ++this.feedId, source: 'schedule', meal_id: meal.id,
          target_g: meal.grams, served_g: served, duration_ms: 7000 + Math.round(Math.random() * 4000),
          pulses: 4 + Math.round(Math.random() * 3), unjam_tries: jam ? 4 : Math.random() < 0.15 ? 1 : 0,
          status: jam ? 'NO_FLOW' : 'OK', unstable: false, interference: false, battery_pct: 96,
        });
      }
      if (food > 0 && Math.random() < 0.35) food = Math.max(0, food - (2 + Math.random() * 8));
      this.consumption.push({ seq: ++this.seq, ts, food_g: r1(food) });
    }
    // Abre com ração na vasilha, para a tela Início não começar zerada.
    this.food = Math.max(food, 22);
    this.consumption[this.consumption.length - 1].food_g = r1(this.food);
  }
}
