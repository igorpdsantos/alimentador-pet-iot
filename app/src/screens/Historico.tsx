// Histórico: lista das refeições, gráficos de consumo e precisão da dose.
import { useEffect, useMemo, useState } from 'react';
import { DayBars, DayLine } from '../components/Charts';
import { Pill, ScreenHead, Segmented } from '../components/ui';
import { Icon } from '../components/Icon';
import * as db from '../db/history';
import { dayMonth, grams, time } from '../lib/format';
import { dayKey, eatenPerDay, lastDays, precision, samplesOfDay, servedPerDay } from '../lib/metrics';
import { SOURCE_TEXT, STATUS_TEXT, STATUS_TONE } from '../protocol/messages';
import type { ConsumptionRecord, FeedRecord } from '../protocol/schemas';
import { useDevice } from '../store/device';

export function Historico() {
  const version = useDevice((s) => s.historyVersion);
  const syncing = useDevice((s) => s.syncing);
  const sync = useDevice((s) => s.syncHistory);
  const [tab, setTab] = useState<'feeds' | 'charts'>('feeds');
  const [range, setRange] = useState<'7' | '30'>('7');
  const [feeds, setFeeds] = useState<FeedRecord[]>([]);
  const [samples, setSamples] = useState<ConsumptionRecord[]>([]);

  useEffect(() => {
    const since = Math.floor(Date.now() / 1000) - 31 * 86400;
    Promise.all([db.feedsSince(since), db.consumptionSince(since)])
      .then(([f, c]) => {
        setFeeds(f.sort((a, b) => b.ts - a.ts));
        setSamples(c);
      })
      .catch(() => {});
  }, [version]);

  const now = Math.floor(Date.now() / 1000);
  const days = useMemo(() => lastDays(Number(range), now), [range, now]);
  const served = useMemo(() => servedPerDay(feeds, days), [feeds, days]);
  const eaten = useMemo(() => eatenPerDay(samples, days), [samples, days]);
  const today = useMemo(() => samplesOfDay(samples, dayKey(now)).map((s) => ({ ts: s.ts, g: s.food_g })), [samples, now]);
  const prec = useMemo(() => precision(feeds.filter((f) => f.ts > now - Number(range) * 86400)), [feeds, range, now]);

  return (
    <main className="screen">
      <ScreenHead
        title="Histórico"
        right={
          <button type="button" className="icon-btn" onClick={() => sync()} aria-label="Atualizar histórico" disabled={syncing}>
            {syncing ? <span className="spin" /> : <Icon name="refresh" />}
          </button>
        }
      />
      <Segmented label="Ver" value={tab} onChange={setTab} options={[{ value: 'feeds', label: 'Refeições' }, { value: 'charts', label: 'Gráficos' }]} />

      {tab === 'feeds' ? (
        <section className="card">
          {feeds.length === 0 ? (
            <p className="empty">Nenhuma refeição registrada ainda.</p>
          ) : (
            <div className="list">
              {feeds.slice(0, 100).map((f) => (
                <div key={f.seq} className="list-item">
                  <div style={{ minWidth: 58 }}>
                    <div className="mid">{time(f.ts)}</div>
                    <div className="small">{dayMonth(f.ts)}</div>
                  </div>
                  <div className="grow">
                    <div className="num" style={{ fontWeight: 600 }}>
                      {grams(f.served_g)} <span className="small">de {grams(f.target_g)}</span>
                    </div>
                    <div className="small">
                      {SOURCE_TEXT[f.source]}
                      {f.unjam_tries > 0 && ` · destravou ${f.unjam_tries}×`}
                      {f.interference && ' · pet mexeu na vasilha'}
                    </div>
                  </div>
                  <Pill tone={STATUS_TONE[f.status]}>{STATUS_TEXT[f.status]}</Pill>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <Segmented label="Período" value={range} onChange={setRange} options={[{ value: '7', label: '7 dias' }, { value: '30', label: '30 dias' }]} />
          <section className="card">
            <h2>Servido × comido por dia</h2>
            <DayBars
              series={[
                { values: served, className: 'bar-served', name: 'servido' },
                { values: eaten, className: 'bar-eaten', name: 'comido' },
              ]}
            />
            <div className="legend">
              <span><i style={{ background: 'var(--primary)' }} />Servido</span>
              <span><i style={{ background: 'var(--food)' }} />Comido (estimado)</span>
            </div>
          </section>
          <section className="card">
            <h2>Ração na vasilha hoje</h2>
            <DayLine points={today} />
          </section>
          <section className="card">
            <h2>Precisão da dose</h2>
            {prec ? (
              <div className="grid-2">
                <Metric label="Erro médio" value={`${prec.meanErrorG > 0 ? '+' : ''}${grams(prec.meanErrorG)}`} />
                <Metric label="Desvio-padrão" value={grams(prec.sdErrorG)} />
                <Metric label="Erro médio absoluto" value={`${prec.meanAbsPct.toLocaleString('pt-BR')} %`} />
                <Metric label="Refeições OK" value={`${prec.okPct}%`} />
              </div>
            ) : (
              <p className="empty">Sem refeições no período.</p>
            )}
            {prec && <span className="hint">Com base em {prec.n} refeições (servido − meta).</span>}
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="small">{label}</div>
      <div className="mid">{value}</div>
    </div>
  );
}
