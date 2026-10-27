import { describe, expect, it } from 'vitest';
import { fixture, fixtureNames } from '../test/fixtures';
import * as S from './schemas';
import { buildCommand, feedsPage, consumptionPage } from './commands';
import { parseTopic, topic } from './topics';

describe('schemas contra os fixtures do contrato', () => {
  it('status e config', () => {
    expect(S.status.parse(fixture('status.json')).hopper.days_left).toBe(10);
    expect(S.config.parse(fixture('config.json')).meals).toHaveLength(1);
  });

  it('todos os eventos', () => {
    const events = fixtureNames().filter((f) => f.startsWith('event_'));
    expect(events.length).toBeGreaterThanOrEqual(6);
    for (const f of events) expect(() => S.event.parse(fixture(f)), f).not.toThrow();
  });

  it('todas as respostas', () => {
    for (const f of fixtureNames().filter((n) => n.startsWith('resp_'))) {
      expect(() => S.resp.parse(fixture(f)), f).not.toThrow();
    }
    const feeds = S.resp.parse(fixture('resp_history_feeds.json'));
    expect(feeds.ok && feedsPage.parse(feeds.data).items[1].unjam_tries).toBe(1);
    const cons = S.resp.parse(fixture('resp_history_consumption.json'));
    expect(cons.ok && consumptionPage.parse(cons.data).has_more).toBe(true);
  });

  it('status sem próxima refeição e sem estimativa de dias', () => {
    const s = { ...(fixture('status.json') as object), next_meal: null, hopper: { remaining_g: 0, pct: 0, capacity_g: 800, capacity_learned: false, days_left: null } };
    expect(S.status.safeParse(s).success).toBe(true);
  });

  it('rejeita mensagem fora do contrato', () => {
    expect(S.status.safeParse({ proto: 1 }).success).toBe(false);
    expect(S.event.safeParse({ proto: 1, seq: 1, ts: 1, type: 'teleport' }).success).toBe(false);
  });
});

describe('comandos', () => {
  it('monta igual aos fixtures', () => {
    expect(buildCommand('feed', { grams: 50, mode: 'add' }, 'a1b2c3')).toEqual(fixture('cmd_feed.json'));
    expect(buildCommand('history_feeds', { since_seq: 120, limit: 20 }, 'h1')).toEqual(fixture('cmd_history.json'));
    expect(buildCommand('refill', { full: true }, 'rf1')).toEqual(fixture('cmd_refill.json'));
    const sched = fixture('cmd_set_schedule.json') as { meals: S.Meal[] };
    expect(buildCommand('set_schedule', { meals: sched.meals }, 's1')).toEqual(sched);
  });

  it('tópicos', () => {
    expect(topic('pf-a1b2c3', 'cmd')).toBe('petfeeder/pf-a1b2c3/cmd');
    expect(parseTopic('petfeeder/pf-a1b2c3/status')).toEqual({ deviceId: 'pf-a1b2c3', kind: 'status' });
    expect(parseTopic('outro/pf-a1b2c3/status')).toBeNull();
  });
});
