// Comandos do app para o alimentador (specs/05-protocolo-mqtt.md §2) e o formato de cada resposta.
import { z } from 'zod';
import {
  PROTO, consumptionRecord, feedRecord, historyPage, type FeedMode, type Meal, type Settings,
} from './schemas';

export type CommandMap = {
  ping: { args: Record<string, never>; data: { fw: string; proto: number; uptime_s: number } };
  feed: { args: { grams: number; mode?: FeedMode }; data: { feed_id: number } };
  cancel_feed: { args: Record<string, never>; data: { was_feeding?: boolean } };
  set_schedule: { args: { meals: Meal[] }; data: Record<string, never> };
  set_settings: { args: Partial<Settings>; data: Record<string, never> };
  history_feeds: { args: { since_seq: number; limit: number }; data: z.infer<typeof feedsPage> };
  history_consumption: { args: { since_seq: number; limit: number }; data: z.infer<typeof consumptionPage> };
  tare_platform: { args: Record<string, never>; data: { unstable?: boolean } };
  calibrate: { args: { known_g: number }; data: { scale_factor: number; unstable?: boolean } };
  tare_bowl: { args: Record<string, never>; data: { bowl_weight_g: number; unstable?: boolean } };
  read_scale: { args: Record<string, never>; data: { raw: number; grams: number; stable: boolean } };
  rotor_test: { args: { dir: 'fwd' | 'rev'; ms: number }; data: Record<string, never> };
  servo_trim: { args: { neutral_us: number }; data: { neutral_us: number } };
  unjam: { args: Record<string, never>; data: Record<string, never> };
  calibrate_battery: { args: { measured_v: number }; data: { v: number } };
  refill: { args: { full: true } | { grams: number }; data: { remaining_g: number; capacity_g: number } };
  empty_hopper: { args: Record<string, never>; data: Record<string, never> };
  reboot: { args: Record<string, never>; data: Record<string, never> };
};
export type CommandName = keyof CommandMap;

export const feedsPage = historyPage(feedRecord);
export const consumptionPage = historyPage(consumptionRecord);

// Validação da `data` das respostas que o app usa de verdade; as demais passam como vieram.
const dataSchemas: Partial<Record<CommandName, z.ZodTypeAny>> = {
  feed: z.object({ feed_id: z.number() }),
  history_feeds: feedsPage,
  history_consumption: consumptionPage,
  read_scale: z.object({ raw: z.number(), grams: z.number(), stable: z.boolean() }),
  refill: z.object({ remaining_g: z.number(), capacity_g: z.number() }),
};

export function parseData<K extends CommandName>(name: K, data: unknown): CommandMap[K]['data'] {
  const schema = dataSchemas[name];
  return (schema ? schema.parse(data) : data) as CommandMap[K]['data'];
}

export function newReqId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Monta o envelope. `history_*` vira cmd "history" com o `kind` certo.
export function buildCommand<K extends CommandName>(name: K, args: CommandMap[K]['args'], reqId: string) {
  if (name === 'history_feeds' || name === 'history_consumption') {
    return { proto: PROTO, req_id: reqId, cmd: 'history', kind: name === 'history_feeds' ? 'feeds' : 'consumption', ...args };
  }
  return { proto: PROTO, req_id: reqId, cmd: name, ...args };
}
