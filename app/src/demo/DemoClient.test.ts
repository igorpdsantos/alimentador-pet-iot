import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { consumptionPage, feedsPage } from '../protocol/commands';
import * as S from '../protocol/schemas';
import { DemoClient } from './DemoClient';

// Tudo o que a demonstração gera tem que passar pelos mesmos schemas do alimentador real.
function setup() {
  const events: S.DeviceEvent[] = [];
  const statuses: S.Status[] = [];
  const configs: S.Config[] = [];
  const conns: string[] = [];
  const client = new DemoClient({
    onConn: (c) => conns.push(c),
    onStatus: (s) => statuses.push(S.status.parse(s)),
    onConfig: (c) => configs.push(S.config.parse(c)),
    onEvent: (e) => events.push(S.event.parse(e)),
  });
  client.connect();
  return { client, events, statuses, configs, conns };
}

async function ask<T>(p: Promise<T>) {
  await vi.advanceTimersByTimeAsync(5000);
  return p;
}

let open: DemoClient | null = null;
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  open?.close();
  vi.useRealTimers();
});

describe('DemoClient', () => {
  it('conecta sem broker e publica status e config válidos', async () => {
    const t = setup();
    open = t.client;
    await vi.advanceTimersByTimeAsync(400);
    expect(t.conns).toEqual(['connecting', 'connected']);
    expect(t.statuses.at(-1)?.feeding).toBe(false);
    expect(t.configs.at(-1)?.settings.pet_name).toBe('Thor');
  });

  it('tem 7 dias de histórico válido, com um caso de erro', async () => {
    const t = setup();
    open = t.client;
    const feeds = feedsPage.parse(await ask(t.client.request('history_feeds', { since_seq: 0, limit: 50 })));
    const cons = consumptionPage.parse(await ask(t.client.request('history_consumption', { since_seq: 0, limit: 50 })));
    expect(feeds.items.length).toBeGreaterThanOrEqual(13);
    expect(feeds.items.some((f) => f.status === 'NO_FLOW')).toBe(true);
    expect(cons.items).toHaveLength(50);
    expect(cons.has_more).toBe(true);
  });

  it('serve a refeição dentro da tolerância e desconta do reservatório', async () => {
    const t = setup();
    open = t.client;
    await vi.advanceTimersByTimeAsync(400);
    const before = t.statuses.at(-1)!.hopper.remaining_g;
    const pending = t.client.request('feed', { grams: 50 });
    await vi.advanceTimersByTimeAsync(60000);
    expect((await pending).feed_id).toBeGreaterThan(0);
    const result = t.events.find((e) => e.type === 'feed_result');
    if (result?.type !== 'feed_result') throw new Error('sem resultado');
    expect(result.status).toBe('OK');
    expect(Math.abs(result.served_g - 50)).toBeLessThanOrEqual(3);
    expect(t.events.some((e) => e.type === 'feed_progress')).toBe(true);
    expect(t.statuses.at(-1)!.hopper.remaining_g).toBeLessThan(before);
    expect(t.statuses.at(-1)!.feeding).toBe(false);
  });

  it('recusa um segundo feed enquanto serve', async () => {
    const t = setup();
    open = t.client;
    const first = t.client.request('feed', { grams: 50 });
    await vi.advanceTimersByTimeAsync(200);
    await first;
    const second = t.client.request('feed', { grams: 50 });
    const check = expect(second).rejects.toMatchObject({ code: 'BUSY' });
    await vi.advanceTimersByTimeAsync(200);
    await check;
  });

  it.each([
    ['jam', 'NO_FLOW'],
    ['empty', 'NO_FLOW'],
    ['bowl', 'BOWL_MISSING'],
  ] as const)('cenário %s termina em %s', async (scenario, status) => {
    const t = setup();
    open = t.client;
    t.client.scenario(scenario);
    const pending = t.client.request('feed', { grams: 50 });
    await vi.advanceTimersByTimeAsync(60000);
    await pending;
    const result = t.events.find((e) => e.type === 'feed_result');
    expect(result).toMatchObject({ status });
  });

  it('corte de energia e volta geram os avisos', async () => {
    const t = setup();
    open = t.client;
    t.client.scenario('power');
    t.client.scenario('power');
    const codes = t.events.flatMap((e) => (e.type === 'alert' ? [e.code] : []));
    expect(codes).toEqual(['ON_BATTERY', 'MAINS_RESTORED']);
  });
});
