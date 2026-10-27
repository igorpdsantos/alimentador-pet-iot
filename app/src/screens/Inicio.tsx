// Tela inicial: status, vasilha, reservatório, próxima refeição e "Alimentar agora".
import { useEffect, useState } from 'react';
import { Banner, Bar, Button, Pill, ScreenHead, Segmented, Sheet, Stepper } from '../components/ui';
import { Icon } from '../components/Icon';
import { useCommand } from '../components/useCommand';
import { ago, grams, gramsInt, volts } from '../lib/format';
import { alertText, errorText, STATUS_TEXT, STATUS_TONE } from '../protocol/messages';
import type { FeedMode } from '../protocol/schemas';
import { useCanCommand, useDevice } from '../store/device';

export function Inicio() {
  const status = useDevice((s) => s.status);
  const statusAt = useDevice((s) => s.statusAt);
  const online = useDevice((s) => s.online);
  const conn = useDevice((s) => s.conn);
  const config = useDevice((s) => s.config);
  const feed = useDevice((s) => s.feed);
  const lastResult = useDevice((s) => s.lastResult);
  const clearResult = useDevice((s) => s.clearResult);
  const canCommand = useCanCommand();
  const [feedSheet, setFeedSheet] = useState(false);
  const [refillSheet, setRefillSheet] = useState(false);
  const cancel = useCommand();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const petName = config?.settings.pet_name;
  const offlineText =
    conn !== 'connected' ? 'Sem conexão com a internet' : online === false ? 'Alimentador offline' : null;
  const visibleAlerts = (status?.alerts ?? []).filter((a) => !['ON_BATTERY', 'LOW_BATTERY'].includes(a));

  return (
    <main className="screen">
      <ScreenHead
        title={petName ? `Olá, ${petName}` : 'Início'}
        subtitle={
          offlineText ? (
            <Pill tone="bad" dot>{offlineText}{statusAt ? ` · visto ${ago(statusAt)}` : ''}</Pill>
          ) : online ? (
            <Pill tone="ok" dot>Online</Pill>
          ) : (
            <Pill tone="muted" dot>Conectando…</Pill>
          )
        }
      />

      {status && !status.time_synced && <Banner tone="warn">{alertText('NO_TIME')}. A agenda fica pausada até a hora certa voltar.</Banner>}
      {visibleAlerts.filter((a) => a !== 'NO_TIME').map((a) => (
        <Banner key={a} tone={['HOPPER_EMPTY', 'NO_FLOW', 'SCALE_ERROR', 'OVERLOAD'].includes(a) ? 'bad' : 'warn'}>{alertText(a)}</Banner>
      ))}

      {feed ? (
        <section className="card hero-feed" aria-live="polite">
          <h2>Servindo…</h2>
          <div className="row between">
            <span className="big">{grams(feed.servedG)}</span>
            <span className="small">de {grams(feed.targetG)}</span>
          </div>
          <Bar value={feed.servedG} max={feed.targetG} large label="Progresso da refeição" />
          <Button onClick={() => cancel.run('cancel_feed', {})} busy={cancel.busy === 'cancel_feed'} block>Cancelar</Button>
        </section>
      ) : (
        <Button variant="primary" size="lg" block disabled={!canCommand} onClick={() => setFeedSheet(true)}>
          <Icon name="paw" /> Alimentar agora
        </Button>
      )}

      {lastResult && !feed && (
        <Banner
          tone={STATUS_TONE[lastResult.status] === 'ok' ? 'info' : STATUS_TONE[lastResult.status] === 'bad' ? 'bad' : 'warn'}
          action={<button type="button" className="icon-btn" onClick={clearResult} aria-label="Fechar aviso"><Icon name="x" size={18} /></button>}
        >
          {lastResult.status === 'OK'
            ? `Servido ${grams(lastResult.served_g)} de ${grams(lastResult.target_g)}`
            : lastResult.status === 'PARTIAL'
              ? `Servido só ${grams(lastResult.served_g)} de ${grams(lastResult.target_g)}`
              : `${STATUS_TEXT[lastResult.status]}: ${errorText(lastResult.status, STATUS_TEXT[lastResult.status])}`}
        </Banner>
      )}

      {!status ? (
        <section className="card"><p className="empty">Esperando o primeiro status do alimentador…</p></section>
      ) : (
        <>
          <div className="grid-2">
            <section className="tile" aria-label="Ração na vasilha">
              <span className="label"><Icon name="bowl" size={18} /> Na vasilha</span>
              {status.bowl.present ? (
                <>
                  <span className="big">{gramsInt(status.bowl.food_g)}</span>
                  <Bar value={status.bowl.food_g} max={config?.settings.max_bowl_g ?? 300} tone="food" label="Ração na vasilha" />
                </>
              ) : (
                <>
                  <span className="mid">Sem vasilha</span>
                  <span className="small">Coloque a vasilha na balança</span>
                </>
              )}
            </section>
            <section className="tile" aria-label="Próxima refeição">
              <span className="label"><Icon name="clock" size={18} /> Próxima</span>
              {status.next_meal ? (
                <>
                  <span className="big">{status.next_meal.time}</span>
                  <span className="small">{gramsInt(status.next_meal.grams)}</span>
                </>
              ) : (
                <span className="small">Nenhuma refeição agendada</span>
              )}
            </section>
          </div>

          <section className="card" aria-label="Reservatório">
            <div className="row between">
              <h2><Icon name="silo" size={16} /> Reservatório</h2>
              <Button size="sm" variant="ghost" disabled={!canCommand} onClick={() => setRefillSheet(true)}>Reabasteci</Button>
            </div>
            <div className="row between">
              <span className="big">{status.hopper.pct}%</span>
              <span className="small num">
                ~{gramsInt(status.hopper.remaining_g)}
                {status.hopper.days_left !== null && ` · dura mais ~${status.hopper.days_left} ${status.hopper.days_left === 1 ? 'dia' : 'dias'}`}
              </span>
            </div>
            <Bar
              value={status.hopper.pct}
              max={100}
              tone={status.hopper.pct <= 10 ? 'bad' : status.hopper.pct <= 20 ? 'warn' : undefined}
              label="Nível do reservatório"
            />
            <span className="hint">
              Estimado pelo que a balança pesou{status.hopper.capacity_learned ? '' : ' (capacidade ainda sendo aprendida)'}.
            </span>
          </section>

          <section className="card" aria-label="Energia">
            <div className="row between">
              <h2>Energia</h2>
              {status.power.source === 'mains' ? (
                <Pill tone="ok"><Icon name="plug" size={14} /> Na tomada</Pill>
              ) : (
                <Pill tone="warn"><Icon name="battery" size={14} /> Nas pilhas</Pill>
              )}
            </div>
            {status.battery.installed ? (
              <>
                <div className="row between">
                  <span className="mid">Pilhas de reserva {status.battery.pct}%</span>
                  <span className="small num">{volts(status.battery.v)}</span>
                </div>
                <Bar
                  value={status.battery.pct}
                  max={100}
                  tone={status.battery.level === 'critical' ? 'bad' : status.battery.level === 'low' ? 'warn' : undefined}
                  label="Carga das pilhas"
                />
                {status.battery.level !== 'ok' && (
                  <span className={status.battery.level === 'critical' ? 'error-text' : 'hint'}>
                    {status.battery.level === 'critical' ? 'Pilhas no fim: troque agora.' : 'Troque as pilhas em breve.'}
                  </span>
                )}
              </>
            ) : (
              <span className="hint">Sem pilhas de reserva instaladas.</span>
            )}
          </section>
        </>
      )}

      {cancel.error && <Banner tone="bad">{cancel.error.message}</Banner>}
      {feedSheet && <FeedSheet onClose={() => setFeedSheet(false)} />}
      {refillSheet && <RefillSheet onClose={() => setRefillSheet(false)} />}
    </main>
  );
}

function FeedSheet({ onClose }: { onClose: () => void }) {
  const config = useDevice((s) => s.config);
  const [g, setG] = useState(config?.settings.button_grams ?? 20);
  const [mode, setMode] = useState<FeedMode>('add');
  const { run, busy, error } = useCommand();

  async function go() {
    if (await run('feed', { grams: g, mode })) onClose();
  }

  return (
    <Sheet title="Alimentar agora" onClose={onClose}>
      <Stepper value={g} onChange={setG} min={5} max={200} step={5} label="Gramas" />
      <div className="chips" role="group" aria-label="Atalhos">
        {[10, 20, 50, 100].map((v) => (
          <button key={v} type="button" className="chip" aria-pressed={g === v} onClick={() => setG(v)}>{v} g</button>
        ))}
      </div>
      <Segmented
        label="Modo"
        value={mode}
        onChange={setMode}
        options={[{ value: 'add', label: `Servir ${g} g` }, { value: 'fill_to', label: `Completar até ${g} g` }]}
      />
      <p className="hint">
        {mode === 'add' ? `Coloca mais ${g} g na vasilha.` : `Serve só o que falta para a vasilha ficar com ${g} g.`}
      </p>
      {error && <Banner tone="bad" action={error.retry && <Button size="sm" onClick={error.retry}>Tentar de novo</Button>}>{error.message}</Banner>}
      <Button variant="primary" size="lg" block busy={busy === 'feed'} onClick={go}>Servir</Button>
    </Sheet>
  );
}

function RefillSheet({ onClose }: { onClose: () => void }) {
  const [g, setG] = useState(500);
  const { run, busy, error } = useCommand();
  const toast = useDevice((s) => s.toast);
  async function send(args: { full: true } | { grams: number }) {
    const r = await run('refill', args);
    if (r) {
      toast(`Reservatório: ~${gramsInt(r.remaining_g)}`);
      onClose();
    }
  }
  return (
    <Sheet title="Reabasteci" onClose={onClose}>
      <Button variant="primary" size="lg" block busy={busy === 'refill'} onClick={() => send({ full: true })}>Enchi até o topo</Button>
      <p className="hint">Ou informe quanto colocou:</p>
      <Stepper value={g} onChange={setG} min={50} max={2000} step={50} label="Gramas colocadas" />
      <Button block busy={busy === 'refill'} onClick={() => send({ grams: g })}>Coloquei {g} g</Button>
      {error && <Banner tone="bad">{error.message}</Banner>}
    </Sheet>
  );
}
