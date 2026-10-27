// Contas dos gráficos e métricas de precisão (specs/06-app-mobile.md §3 Histórico, specs/07 §3).
import type { ConsumptionRecord, FeedRecord } from '../protocol/schemas';

const DAY = 86400;
// Dia local (UTC−3 por padrão, igual ao firmware) como AAAA-MM-DD.
export function dayKey(ts: number, tzOffsetH = -3) {
  return new Date((ts + tzOffsetH * 3600) * 1000).toISOString().slice(0, 10);
}

export function lastDays(n: number, nowTs: number, tzOffsetH = -3): string[] {
  return Array.from({ length: n }, (_, i) => dayKey(nowTs - (n - 1 - i) * DAY, tzOffsetH));
}

export function servedPerDay(feeds: FeedRecord[], days: string[], tzOffsetH = -3) {
  const sum = new Map(days.map((d) => [d, 0]));
  for (const f of feeds) {
    const k = dayKey(f.ts, tzOffsetH);
    if (sum.has(k)) sum.set(k, sum.get(k)! + f.served_g);
  }
  return days.map((d) => ({ day: d, grams: Math.round(sum.get(d)! * 10) / 10 }));
}

// Consumo estimado: soma das quedas de peso entre amostras seguidas (subidas são refeições servidas).
export function eatenPerDay(samples: ConsumptionRecord[], days: string[], tzOffsetH = -3) {
  const sorted = [...samples].sort((a, b) => a.ts - b.ts);
  const sum = new Map(days.map((d) => [d, 0]));
  for (let i = 1; i < sorted.length; i++) {
    const drop = sorted[i - 1].food_g - sorted[i].food_g;
    const k = dayKey(sorted[i].ts, tzOffsetH);
    if (drop > 0.5 && sum.has(k)) sum.set(k, sum.get(k)! + drop);
  }
  return days.map((d) => ({ day: d, grams: Math.round(sum.get(d)! * 10) / 10 }));
}

export function samplesOfDay(samples: ConsumptionRecord[], day: string, tzOffsetH = -3) {
  return samples.filter((s) => dayKey(s.ts, tzOffsetH) === day).sort((a, b) => a.ts - b.ts);
}

export type Precision = { n: number; meanErrorG: number; sdErrorG: number; meanAbsPct: number; okPct: number };

// Erro da dose (servido − meta) nas refeições que realmente tentaram servir.
export function precision(feeds: FeedRecord[]): Precision | null {
  const tried = feeds.filter((f) => f.status === 'OK' || f.status === 'PARTIAL');
  const all = feeds.filter((f) => f.status !== 'SKIPPED_FULL' && f.status !== 'CANCELED');
  if (!tried.length) return null;
  const err = tried.map((f) => f.served_g - f.target_g);
  const mean = err.reduce((s, x) => s + x, 0) / err.length;
  const sd = err.length > 1 ? Math.sqrt(err.reduce((s, x) => s + (x - mean) ** 2, 0) / (err.length - 1)) : 0;
  const absPct = tried.reduce((s, f) => s + Math.abs(f.served_g - f.target_g) / f.target_g, 0) / tried.length;
  const ok = all.filter((f) => f.status === 'OK').length;
  return {
    n: tried.length,
    meanErrorG: Math.round(mean * 10) / 10,
    sdErrorG: Math.round(sd * 10) / 10,
    meanAbsPct: Math.round(absPct * 1000) / 10,
    okPct: all.length ? Math.round((100 * ok) / all.length) : 0,
  };
}
