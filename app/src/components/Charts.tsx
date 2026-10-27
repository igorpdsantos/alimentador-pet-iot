// Gráficos simples em SVG: barras por dia e linha ao longo do dia.
import { dayLabel } from '../lib/format';

type DayValue = { day: string; grams: number };

export function DayBars({ series, height = 180 }: { series: { values: DayValue[]; className: string; name: string }[]; height?: number }) {
  const days = series[0]?.values ?? [];
  const W = 340, H = height, padL = 34, padB = 22, padT = 8;
  const max = Math.max(10, ...series.flatMap((s) => s.values.map((v) => v.grams)));
  const nice = Math.ceil(max / 20) * 20;
  const slot = (W - padL) / Math.max(1, days.length);
  const barW = Math.max(2, Math.min(18, (slot - 4) / series.length));
  const y = (g: number) => padT + (H - padT - padB) * (1 - g / nice);
  const labelEvery = days.length > 10 ? Math.ceil(days.length / 7) : 1;
  const summary = days.map((d, i) => `${dayLabel(d.day)}: ${series.map((s) => `${s.name} ${s.values[i].grams} g`).join(', ')}`).join('; ');
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line className="grid" x1={padL} x2={W} y1={y(nice * f)} y2={y(nice * f)} />
          <text x={padL - 6} y={y(nice * f) + 4} textAnchor="end">{Math.round(nice * f)}</text>
        </g>
      ))}
      {days.map((d, i) => (
        <g key={d.day}>
          {series.map((s, k) => {
            const g = s.values[i].grams;
            const x = padL + i * slot + (slot - barW * series.length) / 2 + k * barW;
            return <rect key={s.name} className={s.className} x={x} y={y(g)} width={barW - 1} height={Math.max(0, y(0) - y(g))} rx={2} />;
          })}
          {i % labelEvery === 0 && (
            <text x={padL + i * slot + slot / 2} y={H - 6} textAnchor="middle">{dayLabel(d.day)}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function DayLine({ points, height = 160 }: { points: { ts: number; g: number }[]; height?: number }) {
  const W = 340, H = height, padL = 34, padB = 22, padT = 8;
  if (points.length < 2) return <p className="empty">Ainda sem leituras suficientes hoje.</p>;
  const t0 = points[0].ts - (((points[0].ts - 3 * 3600) % 86400) + 86400) % 86400; // meia-noite local
  const max = Math.max(20, ...points.map((p) => p.g));
  const nice = Math.ceil(max / 20) * 20;
  const x = (ts: number) => padL + ((W - padL - 4) * (ts - t0)) / 86400;
  const y = (g: number) => padT + (H - padT - padB) * (1 - g / nice);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.ts).toFixed(1)},${y(p.g).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.at(-1)!.ts).toFixed(1)},${y(0)} L${x(points[0].ts).toFixed(1)},${y(0)} Z`;
  const last = points.at(-1)!;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Ração na vasilha ao longo do dia; última leitura ${last.g} g`}>
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line className="grid" x1={padL} x2={W} y1={y(nice * f)} y2={y(nice * f)} />
          <text x={padL - 6} y={y(nice * f) + 4} textAnchor="end">{Math.round(nice * f)}</text>
        </g>
      ))}
      {[0, 6, 12, 18, 24].map((h) => (
        <text key={h} x={x(t0 + h * 3600)} y={H - 6} textAnchor={h === 0 ? 'start' : h === 24 ? 'end' : 'middle'}>{`${h}h`}</text>
      ))}
      <path className="area" d={area} />
      <path className="line" d={d} />
    </svg>
  );
}
