// Textos em português para códigos de erro, alertas e status (specs/05-protocolo-mqtt.md §6).
import type { FeedStatus } from './schemas';

export const ERROR_TEXT: Record<string, string> = {
  BUSY: 'Já há uma refeição em andamento. Aguarde terminar.',
  INVALID_ARGS: 'Valores inválidos. Confira o formulário.',
  BOWL_MISSING: 'Coloque a vasilha na balança.',
  NO_FLOW: 'Reservatório vazio ou travado — confira a ração.',
  LOW_BATTERY: 'Pilhas fracas — troque as pilhas.',
  SCALE_ERROR: 'A balança não respondeu. Verifique os fios da balança.',
  NOT_CALIBRATED: 'A balança ainda não foi calibrada. Abra Ajustes → Calibrar balança.',
  NO_TIME: 'O alimentador está sem hora certa. Verifique a internet dele.',
  TIMEOUT: 'O alimentador não respondeu.',
  OFFLINE: 'Sem conexão com o alimentador.',
};

export const ALERT_TEXT: Record<string, string> = {
  LOW_BATTERY: 'Pilhas fracas: troque em breve',
  ON_BATTERY: 'Sem energia na tomada — usando as pilhas',
  MAINS_RESTORED: 'A energia da tomada voltou',
  HOPPER_LOW: 'Ração acabando no reservatório',
  HOPPER_EMPTY: 'Reservatório vazio: reabasteça',
  NO_FLOW: 'Reservatório vazio ou travado — confira a ração',
  NO_TIME: 'Sem hora certa: verifique a internet do alimentador',
  NOT_CALIBRATED: 'Balança sem calibração',
  SCALE_ERROR: 'Verifique a balança',
  OVERLOAD: 'Algo pesado na plataforma da balança',
  BOWL_MISSING: 'Coloque a vasilha',
};

export const STATUS_TEXT: Record<FeedStatus, string> = {
  OK: 'Servido',
  PARTIAL: 'Parcial',
  NO_FLOW: 'Sem ração / travado',
  BOWL_MISSING: 'Sem vasilha',
  LOW_BATTERY: 'Pilhas fracas',
  SCALE_ERROR: 'Erro na balança',
  CANCELED: 'Cancelado',
  SKIPPED_FULL: 'Vasilha já cheia',
  TIMEOUT: 'Tempo esgotado',
};

export type Tone = 'ok' | 'warn' | 'bad' | 'muted';
export const STATUS_TONE: Record<FeedStatus, Tone> = {
  OK: 'ok',
  PARTIAL: 'warn',
  NO_FLOW: 'bad',
  BOWL_MISSING: 'warn',
  LOW_BATTERY: 'bad',
  SCALE_ERROR: 'bad',
  CANCELED: 'muted',
  SKIPPED_FULL: 'muted',
  TIMEOUT: 'warn',
};

export const SOURCE_TEXT = { schedule: 'Agenda', app: 'App', button: 'Botão' } as const;

export const errorText = (code: string, fallback?: string) => ERROR_TEXT[code] ?? fallback ?? `Erro ${code}`;
export const alertText = (code: string, fallback?: string) => ALERT_TEXT[code] ?? fallback ?? code;
