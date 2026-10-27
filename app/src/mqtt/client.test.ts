import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MqttClient } from 'mqtt';
import { fixture } from '../test/fixtures';
import { FeederClient, FeederError, type Handlers } from './client';

class FakeMqtt extends EventEmitter {
  connected = true;
  published: { topic: string; payload: string }[] = [];
  subscribe = vi.fn();
  end = vi.fn();
  publish(topic: string, payload: string) {
    this.published.push({ topic, payload });
  }
}

function setup(handlers: Handlers = {}) {
  const fake = new FakeMqtt();
  const c = new FeederClient('pf-a1b2c3', handlers, () => fake as unknown as MqttClient);
  c.connect({ url: 'ws://x' });
  fake.emit('connect');
  return { c, fake, lastCmd: () => JSON.parse(fake.published.at(-1)!.payload) };
}

const reply = (c: FeederClient, body: object) => c.handleMessage('petfeeder/pf-a1b2c3/resp', JSON.stringify(body));

afterEach(() => vi.useRealTimers());

describe('FeederClient', () => {
  it('assina os tópicos do dispositivo', () => {
    const { fake } = setup();
    expect(fake.subscribe.mock.calls[0][0]).toContain('petfeeder/pf-a1b2c3/event');
  });

  it('casa a resposta pelo req_id', async () => {
    const { c, lastCmd } = setup();
    const p = c.request('feed', { grams: 50 });
    const cmd = lastCmd();
    expect(cmd).toMatchObject({ proto: 1, cmd: 'feed', grams: 50 });
    reply(c, { req_id: 'outro', ok: true, data: { feed_id: 1 } });
    reply(c, { req_id: cmd.req_id, ok: true, data: { feed_id: 57 } });
    await expect(p).resolves.toEqual({ feed_id: 57 });
  });

  it('erro do dispositivo vira mensagem em português', async () => {
    const { c, lastCmd } = setup();
    const p = c.request('feed', { grams: 50 });
    reply(c, { ...(fixture('resp_error_busy.json') as object), req_id: lastCmd().req_id });
    await expect(p).rejects.toMatchObject({ code: 'BUSY', message: expect.stringContaining('andamento') });
  });

  it('timeout de 8 s mantém o req_id para tentar de novo', async () => {
    vi.useFakeTimers();
    const { c, lastCmd } = setup();
    const p = c.request('ping', {});
    const id = lastCmd().req_id;
    vi.advanceTimersByTime(8001);
    const err = await p.catch((e) => e);
    expect(err).toBeInstanceOf(FeederError);
    expect(err.code).toBe('TIMEOUT');
    expect(err.reqId).toBe(id);
    c.request('ping', {}, { reqId: id }).catch(() => {});
    expect(lastCmd().req_id).toBe(id);
  });

  it('sem conexão falha na hora', async () => {
    const { c, fake } = setup();
    fake.connected = false;
    await expect(c.request('ping', {})).rejects.toMatchObject({ code: 'OFFLINE' });
  });

  it('entrega status, config, eventos e online; descarta lixo', () => {
    const h = { onStatus: vi.fn(), onConfig: vi.fn(), onEvent: vi.fn(), onOnline: vi.fn() };
    const { c } = setup(h);
    const T = 'petfeeder/pf-a1b2c3/';
    c.handleMessage(T + 'status', JSON.stringify(fixture('status.json')));
    c.handleMessage(T + 'config', JSON.stringify(fixture('config.json')));
    c.handleMessage(T + 'event', JSON.stringify(fixture('event_feed_result.json')));
    c.handleMessage(T + 'online', 'true');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    c.handleMessage(T + 'status', '{"proto":1}');
    c.handleMessage(T + 'event', 'não é json');
    c.handleMessage('petfeeder/pf-outro/status', JSON.stringify(fixture('status.json')));
    warn.mockRestore();
    expect(h.onStatus).toHaveBeenCalledTimes(1);
    expect(h.onConfig).toHaveBeenCalledTimes(1);
    expect(h.onEvent.mock.calls[0][0]).toMatchObject({ type: 'feed_result', served_g: 49.6 });
    expect(h.onOnline).toHaveBeenCalledWith(true);
  });
});
