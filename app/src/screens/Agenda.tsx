// Agenda: até 8 refeições. Salvar manda a lista inteira e só confirma com resp ok + config novo.
import { useEffect, useState } from 'react';
import { Banner, Button, ScreenHead, Segmented, Sheet, Stepper, Switch } from '../components/ui';
import { Icon } from '../components/Icon';
import { useCommand } from '../components/useCommand';
import { daysText, gramsInt, WEEKDAYS, WEEKDAYS_SHORT } from '../lib/format';
import type { Meal } from '../protocol/schemas';
import { useCanCommand, useDevice } from '../store/device';

const MAX_MEALS = 8;
const sortMeals = (m: Meal[]) => [...m].sort((a, b) => a.time.localeCompare(b.time));

export function Agenda() {
  const config = useDevice((s) => s.config);
  const canCommand = useCanCommand();
  const { run, busy, error } = useCommand();
  const toast = useDevice((s) => s.toast);
  const [editing, setEditing] = useState<Meal | 'new' | null>(null);
  const meals = sortMeals(config?.meals ?? []);

  async function save(next: Meal[]) {
    const ok = await run('set_schedule', { meals: sortMeals(next) });
    if (ok) toast('Agenda salva no alimentador');
    return !!ok;
  }

  const nextId = () => {
    for (let i = 1; i <= 255; i++) if (!meals.some((m) => m.id === i)) return i;
    return 255;
  };

  return (
    <main className="screen">
      <ScreenHead
        title="Agenda"
        subtitle={`${meals.length} de ${MAX_MEALS} refeições`}
        right={
          <Button variant="primary" size="sm" disabled={!canCommand || meals.length >= MAX_MEALS} onClick={() => setEditing('new')}>
            <Icon name="plus" size={18} /> Nova
          </Button>
        }
      />
      {!config && <section className="card"><p className="empty">Carregando a agenda do alimentador…</p></section>}
      {config && meals.length === 0 && (
        <section className="card">
          <p className="empty">Nenhuma refeição agendada.<br />Toque em <b>Nova</b> para programar horários.</p>
        </section>
      )}
      {meals.length > 0 && (
        <section className="card">
          <div className="list">
            {meals.map((m) => (
              <div key={m.id} className="list-item">
                <button type="button" className="row grow" style={{ background: 'none', border: 0, padding: 0, textAlign: 'left', cursor: 'pointer', minHeight: 44 }}
                  onClick={() => setEditing(m)} disabled={!canCommand} aria-label={`Editar refeição das ${m.time}`}>
                  <span className="meal-time" style={{ opacity: m.enabled ? 1 : 0.45 }}>{m.time}</span>
                  <span className="grow">
                    <span className="mid" style={{ display: 'block', opacity: m.enabled ? 1 : 0.45 }}>
                      {m.mode === 'fill_to' ? `Completar até ${gramsInt(m.grams)}` : gramsInt(m.grams)}
                    </span>
                    <span className="small">{daysText(m.days)}</span>
                  </span>
                </button>
                <Switch
                  checked={m.enabled}
                  label={`Refeição das ${m.time} ativa`}
                  disabled={!canCommand || busy === 'set_schedule'}
                  onChange={(v) => save(meals.map((x) => (x.id === m.id ? { ...x, enabled: v } : x)))}
                />
              </div>
            ))}
          </div>
        </section>
      )}
      {error && !editing && <Banner tone="bad" action={error.retry && <Button size="sm" onClick={error.retry}>Tentar de novo</Button>}>{error.message}</Banner>}
      <p className="hint">A agenda fica guardada no alimentador e funciona mesmo sem internet. Refeição perdida com o alimentador desligado não é servida depois.</p>
      {editing && (
        <MealSheet
          meal={editing === 'new' ? { id: nextId(), time: '08:00', grams: 40, days: [0, 1, 2, 3, 4, 5, 6], enabled: true, mode: 'add' } : editing}
          isNew={editing === 'new'}
          busy={busy === 'set_schedule'}
          error={error?.message}
          onClose={() => setEditing(null)}
          onSave={async (m) => {
            const next = editing === 'new' ? [...meals, m] : meals.map((x) => (x.id === m.id ? m : x));
            if (await save(next)) setEditing(null);
          }}
          onDelete={editing === 'new' ? undefined : async () => {
            if (await save(meals.filter((x) => x.id !== (editing as Meal).id))) setEditing(null);
          }}
        />
      )}
    </main>
  );
}

function MealSheet({ meal, isNew, busy, error, onClose, onSave, onDelete }: {
  meal: Meal; isNew: boolean; busy: boolean; error?: string;
  onClose: () => void; onSave: (m: Meal) => void; onDelete?: () => void;
}) {
  const [m, setM] = useState(meal);
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => setM(meal), [meal]);
  const toggleDay = (d: number) =>
    setM({ ...m, days: m.days.includes(d) ? m.days.filter((x) => x !== d) : [...m.days, d].sort() });

  return (
    <Sheet title={isNew ? 'Nova refeição' : 'Editar refeição'} onClose={onClose}>
      <label className="field">
        <span>Horário</span>
        <input className="input" type="time" value={m.time} onChange={(e) => e.target.value && setM({ ...m, time: e.target.value })} style={{ fontSize: 22, fontWeight: 650 }} />
      </label>
      <Stepper value={m.grams} onChange={(grams) => setM({ ...m, grams })} min={5} max={200} step={5} label="Gramas" />
      <Segmented
        label="Modo"
        value={m.mode}
        onChange={(mode) => setM({ ...m, mode })}
        options={[{ value: 'add', label: 'Servir' }, { value: 'fill_to', label: 'Completar até' }]}
      />
      <div className="field">
        <span>Dias</span>
        <div className="chips" role="group" aria-label="Dias da semana">
          {WEEKDAYS_SHORT.map((d, i) => (
            <button key={i} type="button" className="chip" aria-pressed={m.days.includes(i)} aria-label={WEEKDAYS[i]} onClick={() => toggleDay(i)}>{d}</button>
          ))}
        </div>
        {m.days.length === 0 && <span className="error-text">Escolha pelo menos um dia.</span>}
      </div>
      {error && <Banner tone="bad">{error}</Banner>}
      <Button variant="primary" size="lg" block busy={busy} disabled={m.days.length === 0} onClick={() => onSave(m)}>Salvar</Button>
      {onDelete && (confirmDelete ? (
        <Button variant="danger" block busy={busy} onClick={onDelete}>Confirmar: remover refeição</Button>
      ) : (
        <Button variant="ghost" block onClick={() => setConfirmDelete(true)}>Remover refeição</Button>
      ))}
    </Sheet>
  );
}
