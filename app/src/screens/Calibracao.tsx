// Assistente de calibração da balança em 3 passos + leitura ao vivo (specs/06-app-mobile.md §3).
import { useEffect, useState } from 'react';
import { Banner, Button, ScreenHead, Stepper } from '../components/ui';
import { Icon } from '../components/Icon';
import { useCommand } from '../components/useCommand';
import { grams } from '../lib/format';
import { useCanCommand, useDevice } from '../store/device';

export function Calibracao({ back }: { back: () => void }) {
  const [step, setStep] = useState(0);
  const [known, setKnown] = useState(500);
  const [live, setLive] = useState<{ grams: number; stable: boolean } | null>(null);
  const { run, busy, error } = useCommand();
  const command = useDevice((s) => s.command);
  const canCommand = useCanCommand();
  const toast = useDevice((s) => s.toast);

  // Leitura ao vivo a cada 1 s, sem empilhar pedidos se o anterior ainda não voltou.
  useEffect(() => {
    if (!canCommand) return;
    let stop = false;
    let inFlight = false;
    const t = setInterval(async () => {
      if (inFlight || busy) return;
      inFlight = true;
      try {
        const r = await command('read_scale', {});
        if (!stop) setLive({ grams: r.grams, stable: r.stable });
      } catch {
        // ignora: a próxima leitura tenta de novo
      } finally {
        inFlight = false;
      }
    }, 1000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [canCommand, command, busy]);

  const steps = [
    {
      title: 'Tire tudo da plataforma',
      text: 'Deixe a plataforma da balança vazia, sem a vasilha, e sem encostar em nada.',
      action: 'Pronto, está vazia',
      run: () => run('tare_platform', {}),
    },
    {
      title: 'Coloque um peso conhecido',
      text: 'Use algo de peso conhecido, como um pacote fechado de 500 g ou 1 kg de arroz. Informe o peso:',
      action: `Coloquei ${known} g`,
      run: () => run('calibrate', { known_g: known }),
    },
    {
      title: 'Coloque a vasilha vazia',
      text: 'Tire o peso e coloque a vasilha vazia na plataforma, no lugar de sempre.',
      action: 'Pronto, vasilha no lugar',
      run: () => run('tare_bowl', {}),
    },
  ];

  async function next() {
    const r = await steps[step].run();
    if (!r) return;
    if (r && 'unstable' in r && r.unstable) toast('Leitura oscilando: confira se nada encosta na plataforma', 'warn');
    setStep(step + 1);
  }

  return (
    <main className="screen no-tabs">
      <ScreenHead
        title="Calibrar balança"
        right={<button type="button" className="icon-btn" onClick={back} aria-label="Voltar"><Icon name="back" /></button>}
      />
      <div className="steps" aria-label={`Passo ${Math.min(step + 1, 3)} de 3`}>
        {[0, 1, 2].map((i) => <span key={i} className={i <= step ? 'on' : ''} />)}
      </div>

      {step < 3 ? (
        <section className="card">
          <span className="small">Passo {step + 1} de 3</span>
          <h2 style={{ fontSize: 22, color: 'var(--text)' }}>{steps[step].title}</h2>
          <p>{steps[step].text}</p>
          {step === 1 && <Stepper value={known} onChange={setKnown} min={50} max={4500} step={50} label="Peso conhecido" />}
          {error && <Banner tone="bad" action={error.retry && <Button size="sm" onClick={error.retry}>Tentar de novo</Button>}>{error.message}</Banner>}
          <Button variant="primary" size="lg" block busy={busy !== null} disabled={!canCommand} onClick={next}>{steps[step].action}</Button>
        </section>
      ) : (
        <section className="card">
          <Banner tone="info">Balança calibrada! Coloque um peso conhecido de novo para conferir a leitura abaixo.</Banner>
          <Button variant="primary" block onClick={back}>Concluir</Button>
        </section>
      )}

      <section className="card" aria-live="polite">
        <h2>Leitura ao vivo (plataforma)</h2>
        <div className="row between">
          <span className="big">{live ? grams(live.grams) : '—'}</span>
          {live && <span className={`pill ${live.stable ? 'ok' : 'warn'}`}>{live.stable ? 'estável' : 'oscilando'}</span>}
        </div>
        <span className="hint">Inclui o peso da vasilha. Antes do passo 2 o valor não tem significado.</span>
      </section>
    </main>
  );
}
