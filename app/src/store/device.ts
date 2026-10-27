// Estado do app: pareamento, conexão, último status/config, refeição em andamento e avisos.
import { create } from 'zustand';
import { FeederClient, FeederError, type BrokerConfig, type ConnState } from '../mqtt/client';
import type { CommandMap, CommandName } from '../protocol/commands';
import type { Config, DeviceEvent, FeedRecord, Status } from '../protocol/schemas';
import { alertText } from '../protocol/messages';
import * as db from '../db/history';

export type Pairing = BrokerConfig & { deviceId: string };
export type ActiveFeed = { feedId: number; targetG: number; servedG: number; source: string };
export type Toast = { id: number; text: string; tone: 'info' | 'warn' | 'bad' };

const PAIRING_KEY = 'alimentador.pairing';
const PAIR_TIMEOUT_MS = 30000;
const HISTORY_PAGE = 50;

type DeviceState = {
  pairing: Pairing | null;
  conn: ConnState;
  connDetail?: string;
  online: boolean | null;
  status: Status | null;
  statusAt: number | null; // quando o status chegou (ms, relógio do celular)
  config: Config | null;
  feed: ActiveFeed | null;
  lastResult: FeedRecord | null;
  toasts: Toast[];
  historyVersion: number; // muda quando chega histórico novo
  syncing: boolean;

  init: () => void;
  pair: (p: Pairing) => Promise<void>;
  unpair: () => Promise<void>;
  command: <K extends CommandName>(name: K, args: CommandMap[K]['args'], reqId?: string) => Promise<CommandMap[K]['data']>;
  syncHistory: () => Promise<void>;
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
  clearResult: () => void;
};

let client: FeederClient | null = null;
let toastSeq = 0;
let onlineWaiter: ((online: boolean) => void) | null = null;

export const defaultBroker = (): BrokerConfig => ({
  url: import.meta.env.VITE_MQTT_URL ?? '',
  username: import.meta.env.VITE_MQTT_USER ?? '',
  password: import.meta.env.VITE_MQTT_PASS ?? '',
});

function loadPairing(): Pairing | null {
  try {
    const raw = localStorage.getItem(PAIRING_KEY);
    return raw ? (JSON.parse(raw) as Pairing) : null;
  } catch {
    return null;
  }
}

function savePairing(p: Pairing | null) {
  try {
    if (p) localStorage.setItem(PAIRING_KEY, JSON.stringify(p));
    else localStorage.removeItem(PAIRING_KEY);
  } catch {
    // modo privado: o pareamento vale só para esta sessão
  }
}

export const useDevice = create<DeviceState>((set, get) => {
  function onEvent(e: DeviceEvent) {
    switch (e.type) {
      case 'feed_started':
        set({ feed: { feedId: e.feed_id, targetG: e.target_g, servedG: 0, source: e.source }, lastResult: null });
        return;
      case 'feed_progress': {
        const f = get().feed;
        if (f && f.feedId === e.feed_id) set({ feed: { ...f, servedG: e.served_g } });
        return;
      }
      case 'feed_result': {
        const { proto: _p, type: _t, ...rec } = e;
        set({ feed: null, lastResult: rec });
        db.putRecords('feeds', [rec]).then(() => set({ historyVersion: get().historyVersion + 1 }));
        return;
      }
      case 'consumption':
        db.putRecords('consumption', [{ seq: e.seq, ts: e.ts, food_g: e.food_g }]).then(() =>
          set({ historyVersion: get().historyVersion + 1 }),
        );
        return;
      case 'alert':
        get().toast(alertText(e.code, e.msg), e.code === 'MAINS_RESTORED' ? 'info' : 'warn');
    }
  }

  function connect(p: Pairing) {
    client?.close();
    set({ conn: 'connecting', online: null, status: null, statusAt: null, config: null, feed: null });
    client = new FeederClient(p.deviceId, {
      onConn: (conn, connDetail) => {
        const wasConnected = get().conn === 'connected';
        set({ conn, connDetail });
        if (conn === 'connected' && !wasConnected) get().syncHistory();
      },
      onOnline: (online) => {
        set({ online });
        onlineWaiter?.(online);
      },
      onStatus: (status) => {
        set({ status, statusAt: Date.now() });
        if (!status.feeding && get().feed) set({ feed: null });
      },
      onConfig: (config) => set({ config }),
      onEvent,
    });
    client.connect(p);
  }

  return {
    pairing: null,
    conn: 'idle',
    online: null,
    status: null,
    statusAt: null,
    config: null,
    feed: null,
    lastResult: null,
    toasts: [],
    historyVersion: 0,
    syncing: false,

    init() {
      const p = loadPairing();
      if (!p || get().pairing) return;
      set({ pairing: p });
      db.openHistory(p.deviceId).then(() => connect(p));
    },

    async pair(p) {
      await db.openHistory(p.deviceId);
      connect(p);
      const online = await new Promise<boolean | 'timeout'>((resolve) => {
        const timer = setTimeout(() => resolve('timeout'), PAIR_TIMEOUT_MS);
        onlineWaiter = (o) => {
          if (!o) return; // pode chegar "false" retido antes do dispositivo conectar
          clearTimeout(timer);
          resolve(o);
        };
      });
      onlineWaiter = null;
      if (online !== true) {
        client?.close();
        client = null;
        set({ conn: 'idle' });
        const detail = get().connDetail;
        throw new Error(
          get().online === false
            ? 'O alimentador está desligado ou sem internet. Ligue-o e tente de novo.'
            : detail
              ? `Não foi possível falar com o broker: ${detail}`
              : 'O alimentador não apareceu em 30 s. Confira o código e se ele está conectado ao Wi-Fi.',
        );
      }
      savePairing(p);
      set({ pairing: p });
    },

    async unpair() {
      const p = get().pairing;
      client?.close();
      client = null;
      savePairing(null);
      if (p) await db.deleteHistory(p.deviceId);
      set({ pairing: null, conn: 'idle', online: null, status: null, config: null, feed: null, lastResult: null });
    },

    command(name, args, reqId) {
      if (!client) return Promise.reject(new FeederError('OFFLINE', 'Sem conexão com o alimentador'));
      if (get().online === false) return Promise.reject(new FeederError('OFFLINE', 'O alimentador está offline'));
      return client.request(name, args, { reqId });
    },

    async syncHistory() {
      if (get().syncing || !client) return;
      set({ syncing: true });
      try {
        for (const kind of ['feeds', 'consumption'] as const) {
          let since = await db.lastSeq(kind);
          for (let page = 0; page < 40; page++) {
            const name = kind === 'feeds' ? 'history_feeds' : 'history_consumption';
            const data = await client.request(name, { since_seq: since, limit: HISTORY_PAGE });
            await db.putRecords(kind, data.items);
            if (data.next_seq > since) {
              since = data.next_seq;
              await db.setLastSeq(kind, since);
            }
            if (!data.has_more || !data.items.length) break;
          }
        }
        set({ historyVersion: get().historyVersion + 1 });
      } catch (e) {
        console.warn('[sync] histórico não sincronizado:', e);
      } finally {
        set({ syncing: false });
      }
    },

    toast(text, tone = 'info') {
      const id = ++toastSeq;
      set({ toasts: [...get().toasts, { id, text, tone }].slice(-3) });
      setTimeout(() => get().dismissToast(id), 6000);
    },

    dismissToast(id) {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    },

    clearResult() {
      set({ lastResult: null });
    },
  };
});

// Comandos só fazem sentido com o broker conectado e o alimentador online.
export const useCanCommand = () => useDevice((s) => s.conn === 'connected' && s.online === true);
