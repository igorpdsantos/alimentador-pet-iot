// Formatação pt-BR: gramas com 1 casa, hora 24 h, datas dd/mm.
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

export const grams = (g: number) => `${nf1.format(g)} g`;
export const gramsInt = (g: number) => `${nf0.format(g)} g`;
export const volts = (v: number) => `${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)} V`;

const TZ = 'America/Sao_Paulo';
export const time = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
export const dayMonth = (ts: number) =>
  new Date(ts * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: TZ });
export const dayLabel = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

export function ago(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}

export const WEEKDAYS_SHORT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function daysText(days: number[]) {
  const set = [...new Set(days)].sort();
  if (set.length === 7) return 'Todos os dias';
  if (set.join() === '1,2,3,4,5') return 'Seg a sex';
  if (set.join() === '0,6') return 'Fins de semana';
  if (!set.length) return 'Nenhum dia';
  return set.map((d) => WEEKDAYS[d]).join(', ');
}
