import { describe, expect, it } from 'vitest';
import type { FeedRecord } from '../protocol/schemas';
import { dayKey, eatenPerDay, lastDays, precision, servedPerDay } from './metrics';

const T0 = 1792724400; // 2026-10-23 03:00 UTC = 00:00 em Brasília
const feed = (ts: number, target: number, served: number, status: FeedRecord['status'] = 'OK'): FeedRecord => ({
  seq: ts, ts, feed_id: 1, source: 'schedule', target_g: target, served_g: served, duration_ms: 1, pulses: 1,
  unjam_tries: 0, status, unstable: false, interference: false, battery_pct: 90,
});

describe('métricas', () => {
  it('dia local em UTC−3', () => {
    expect(dayKey(T0)).toBe('2026-10-23');
    expect(dayKey(T0 - 1)).toBe('2026-10-22');
  });

  it('servido por dia', () => {
    const days = lastDays(2, T0 + 3600);
    expect(days).toEqual(['2026-10-22', '2026-10-23']);
    const s = servedPerDay([feed(T0 - 100, 40, 41), feed(T0 + 100, 50, 49.5), feed(T0 + 200, 20, 20)], days);
    expect(s).toEqual([{ day: '2026-10-22', grams: 41 }, { day: '2026-10-23', grams: 69.5 }]);
  });

  it('consumo soma só as quedas', () => {
    const samples = [10, 50, 45, 30, 30.2, 5].map((g, i) => ({ seq: i, ts: T0 + i * 900, food_g: g }));
    expect(eatenPerDay(samples, ['2026-10-23'])[0].grams).toBe(45.2);
  });

  it('precisão ignora cancelados e conta NO_FLOW como falha', () => {
    const p = precision([feed(1, 50, 52), feed(2, 50, 48), feed(3, 20, 20), feed(4, 50, 3, 'NO_FLOW'), feed(5, 50, 0, 'CANCELED')])!;
    expect(p.n).toBe(3);
    expect(p.meanErrorG).toBe(0);
    expect(p.sdErrorG).toBe(2);
    expect(p.okPct).toBe(75);
    expect(precision([])).toBeNull();
  });
});
