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
