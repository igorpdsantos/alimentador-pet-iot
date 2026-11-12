// Tópicos MQTT do contrato (specs/05-protocolo-mqtt.md §1).
export type TopicKind = 'online' | 'status' | 'config' | 'cmd' | 'resp' | 'event';

export const topic = (deviceId: string, kind: TopicKind) => `petfeeder/${deviceId}/${kind}`;
export const subscriptions = (deviceId: string) =>
  (['online', 'status', 'config', 'resp', 'event'] as const).map((k) => topic(deviceId, k));

export function parseTopic(t: string): { deviceId: string; kind: TopicKind } | null {
  const m = /^petfeeder\/([^/]+)\/(online|status|config|cmd|resp|event)$/.exec(t);
  return m ? { deviceId: m[1], kind: m[2] as TopicKind } : null;
}

export const DEVICE_ID_RE = /^pf-[a-z0-9]{3,12}$/;

/**
 * Código de pareamento (D24): `pf-xxxxxx-segredo`. O `device_id` vira o usuário do broker e o segredo a senha,
 * e o broker só deixa esse usuário nos tópicos `petfeeder/{device_id}/...`. Sem segredo (`pf-xxxxxx`) só serve
 * com broker informado à mão (simulador, desenvolvimento).
 */
export const PAIR_SECRET_RE = /^[a-z0-9]{8,32}$/;

export function parsePairCode(input: string): { deviceId: string; secret?: string } | null {
  const v = input.trim().toLowerCase().replace(/\s+/g, '');
  if (DEVICE_ID_RE.test(v)) return { deviceId: v };
  const i = v.lastIndexOf('-');
  const deviceId = v.slice(0, i);
  const secret = v.slice(i + 1);
  if (i > 0 && DEVICE_ID_RE.test(deviceId) && PAIR_SECRET_RE.test(secret)) return { deviceId, secret };
  return null;
}
