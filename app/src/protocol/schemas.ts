// Schemas do contrato MQTT (specs/05-protocolo-mqtt.md). Único lugar do app com formatos de mensagem.
import { z } from 'zod';

export const PROTO = 1;

export const feedMode = z.enum(['add', 'fill_to']);
export const feedSource = z.enum(['schedule', 'app', 'button']);
export const feedStatus = z.enum([
  'OK', 'PARTIAL', 'NO_FLOW', 'BOWL_MISSING', 'LOW_BATTERY', 'SCALE_ERROR', 'CANCELED', 'SKIPPED_FULL', 'TIMEOUT',
]);

export const meal = z.object({
  id: z.number().int().min(1).max(255),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  grams: z.number().min(5).max(200),
  days: z.array(z.number().int().min(0).max(6)),
  enabled: z.boolean(),
  mode: feedMode.default('add'),
});

export const status = z.object({
  proto: z.number(),
  ts: z.number(),
  fw: z.string(),
  power: z.object({ source: z.enum(['mains', 'battery']) }),
  battery: z.object({
    pct: z.number(),
    v: z.number(),
    level: z.enum(['ok', 'low', 'critical']),
    installed: z.boolean(),
  }),
  bowl: z.object({ present: z.boolean(), food_g: z.number() }),
  hopper: z.object({
    remaining_g: z.number(),
    pct: z.number(),
    capacity_g: z.number(),
    capacity_learned: z.boolean(),
    days_left: z.number().nullable(),
  }),
  feeding: z.boolean(),
  next_meal: z.object({ id: z.number(), time: z.string(), grams: z.number() }).nullable(),
  wifi_rssi: z.number(),
  time_synced: z.boolean(),
  alerts: z.array(z.string()),
});

export const settings = z.object({
  pet_name: z.string(),
  button_grams: z.number(),
  max_bowl_g: z.number(),
  battery_chemistry: z.string(),
  timezone: z.string(),
});

export const config = z.object({
  proto: z.number(),
  meals: z.array(meal),
  settings,
  calibration: z.object({
    scale_factor: z.number(),
    bowl_weight_g: z.number(),
    servo_neutral_us: z.number(),
    flow_g_per_ms: z.number(),
  }),
});

const eventBase = { proto: z.number(), seq: z.number(), ts: z.number() };

export const feedRecord = z.object({
  seq: z.number(),
  ts: z.number(),
  feed_id: z.number(),
  source: feedSource,
  meal_id: z.number().optional(),
  target_g: z.number(),
  served_g: z.number(),
  duration_ms: z.number(),
  pulses: z.number(),
  unjam_tries: z.number(),
  status: feedStatus,
  unstable: z.boolean(),
  interference: z.boolean(),
  battery_pct: z.number(),
});

export const consumptionRecord = z.object({ seq: z.number(), ts: z.number(), food_g: z.number() });

export const event = z.discriminatedUnion('type', [
  z.object({
    ...eventBase,
    type: z.literal('feed_started'),
    feed_id: z.number(),
    source: feedSource,
    meal_id: z.number().optional(),
    target_g: z.number(),
  }),
  z.object({ ...eventBase, type: z.literal('feed_progress'), feed_id: z.number(), served_g: z.number() }),
  feedRecord.extend({ proto: z.number(), type: z.literal('feed_result') }),
  z.object({ ...eventBase, type: z.literal('alert'), code: z.string(), msg: z.string() }),
  z.object({ ...eventBase, type: z.literal('consumption'), food_g: z.number() }),
]);

export const resp = z.union([
  z.object({ req_id: z.string(), ok: z.literal(true), data: z.record(z.unknown()).default({}) }),
  z.object({ req_id: z.string(), ok: z.literal(false), error: z.string(), msg: z.string().default('') }),
]);

export const historyPage = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ items: z.array(item), next_seq: z.number(), has_more: z.boolean() });

export type FeedMode = z.infer<typeof feedMode>;
export type FeedSource = z.infer<typeof feedSource>;
export type FeedStatus = z.infer<typeof feedStatus>;
export type Meal = z.infer<typeof meal>;
export type Status = z.infer<typeof status>;
export type Settings = z.infer<typeof settings>;
export type Config = z.infer<typeof config>;
export type FeedRecord = z.infer<typeof feedRecord>;
export type ConsumptionRecord = z.infer<typeof consumptionRecord>;
export type DeviceEvent = z.infer<typeof event>;
export type Resp = z.infer<typeof resp>;
