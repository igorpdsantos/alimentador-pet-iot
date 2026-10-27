// Conexão com o broker e pedido/resposta por req_id (specs/06-app-mobile.md §4).
import mqtt, { type IClientOptions, type MqttClient } from 'mqtt';
import {
  buildCommand, newReqId, parseData, type CommandMap, type CommandName,
} from '../protocol/commands';
import * as S from '../protocol/schemas';
import { parseTopic, subscriptions, topic } from '../protocol/topics';
import { errorText } from '../protocol/messages';

export const REQUEST_TIMEOUT_MS = 8000;

export type BrokerConfig = { url: string; username?: string; password?: string };
export type ConnState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type Handlers = {
  onConn?: (s: ConnState, detail?: string) => void;
  onOnline?: (online: boolean) => void;
  onStatus?: (s: S.Status) => void;
  onConfig?: (c: S.Config) => void;
  onEvent?: (e: S.DeviceEvent) => void;
};

export class FeederError extends Error {
  constructor(public code: string, message: string, public reqId?: string) {
    super(message);
  }
}

type Pending = { name: CommandName; resolve: (d: unknown) => void; reject: (e: FeederError) => void; timer: ReturnType<typeof setTimeout> };
type Connect = (url: string, opts: IClientOptions) => MqttClient;

export class FeederClient {
  private client: MqttClient | null = null;
  private pending = new Map<string, Pending>();

  constructor(
    private deviceId: string,
    private handlers: Handlers,
    private connectFn: Connect = mqtt.connect,
  ) {}

  connect(cfg: BrokerConfig) {
    this.close();
    this.handlers.onConn?.('connecting');
    const c = this.connectFn(cfg.url, {
      username: cfg.username || undefined,
      password: cfg.password || undefined,
      clientId: `app-${newReqId()}`,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      clean: true,
    });
    this.client = c;
    c.on('connect', () => {
      c.subscribe(subscriptions(this.deviceId), { qos: 1 });
      this.handlers.onConn?.('connected');
    });
    c.on('reconnect', () => this.handlers.onConn?.('reconnecting'));
    c.on('offline', () => this.handlers.onConn?.('reconnecting'));
    c.on('error', (e) => this.handlers.onConn?.('error', e.message));
    c.on('message', (t, payload) => this.handleMessage(t, payload.toString()));
  }

  get connected() {
    return !!this.client?.connected;
  }

  close() {
    for (const [id, p] of this.pending) {
      clearTimeout(p.timer);
      p.reject(new FeederError('OFFLINE', errorText('OFFLINE'), id));
    }
    this.pending.clear();
    this.client?.end(true);
    this.client = null;
  }

  // Envia um comando e espera a resposta. Para tentar de novo após TIMEOUT, passe o mesmo reqId:
  // o firmware reconhece o req_id e não executa duas vezes.
  request<K extends CommandName>(
    name: K,
    args: CommandMap[K]['args'],
    opts: { reqId?: string; timeoutMs?: number } = {},
  ): Promise<CommandMap[K]['data']> {
    const reqId = opts.reqId ?? newReqId();
    if (!this.client?.connected) return Promise.reject(new FeederError('OFFLINE', errorText('OFFLINE'), reqId));
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new FeederError('TIMEOUT', errorText('TIMEOUT'), reqId));
      }, opts.timeoutMs ?? REQUEST_TIMEOUT_MS);
      this.pending.set(reqId, { name, resolve: resolve as (d: unknown) => void, reject, timer });
      this.client!.publish(topic(this.deviceId, 'cmd'), JSON.stringify(buildCommand(name, args, reqId)), { qos: 1 });
    });
  }

  // Público para os testes. Mensagem inválida é descartada e logada; nunca derruba a tela.
  handleMessage(t: string, payload: string) {
    const parsed = parseTopic(t);
    if (!parsed || parsed.deviceId !== this.deviceId) return;
    let json: unknown;
    try {
      json = JSON.parse(payload);
    } catch {
      console.warn('[mqtt] JSON inválido em', t);
      return;
    }
    const check = <T>(schema: { safeParse: (x: unknown) => { success: true; data: T } | { success: false; error: unknown } }) => {
      const r = schema.safeParse(json);
      if (!r.success) {
        console.warn('[mqtt] mensagem fora do contrato em', t, r.error);
        return null;
      }
      return r.data;
    };
    switch (parsed.kind) {
      case 'online':
        if (typeof json === 'boolean') this.handlers.onOnline?.(json);
        return;
      case 'status': {
        const s = check(S.status);
        if (s) this.handlers.onStatus?.(s);
        return;
      }
      case 'config': {
        const c = check(S.config);
        if (c) this.handlers.onConfig?.(c);
        return;
      }
      case 'event': {
        const e = check(S.event);
        if (e) this.handlers.onEvent?.(e);
        return;
      }
      case 'resp': {
        const r = check(S.resp);
        if (!r) return;
        const p = this.pending.get(r.req_id);
        if (!p) return;
        clearTimeout(p.timer);
        this.pending.delete(r.req_id);
        if (!r.ok) return p.reject(new FeederError(r.error, errorText(r.error, r.msg), r.req_id));
        try {
          p.resolve(parseData(p.name, r.data));
        } catch {
          p.reject(new FeederError('INVALID_RESPONSE', 'Resposta inesperada do alimentador', r.req_id));
        }
      }
    }
  }
}
