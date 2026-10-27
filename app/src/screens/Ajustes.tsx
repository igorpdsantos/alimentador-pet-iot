// Ajustes: pet, porções, calibrações, manutenção do rotor e dados do dispositivo.
import { useEffect, useState } from 'react';
import { Banner, Button, ScreenHead } from '../components/ui';
import { Icon } from '../components/Icon';
import { useCommand } from '../components/useCommand';
import { volts } from '../lib/format';
import { useCanCommand, useDevice } from '../store/device';

export function Ajustes({ go }: { go: (route: string) => void }) {
  const config = useDevice((s) => s.config);
  const status = useDevice((s) => s.status);
  const pairing = useDevice((s) => s.pairing);
  const unpair = useDevice((s) => s.unpair);
  const toast = useDevice((s) => s.toast);
  const canCommand = useCanCommand();
  const settings = useCommand();
  const maint = useCommand();

  const [petName, setPetName] = useState('');
  const [buttonGrams, setButtonGrams] = useState(20);
  const [maxBowl, setMaxBowl] = useState(300);
  const [measuredV, setMeasuredV] = useState('');
  const [neutral, setNeutral] = useState(1500);
  const [confirm, setConfirm] = useState<'empty' | 'unpair' | 'reboot' | null>(null);

  useEffect(() => {
    if (!config) return;
    setPetName(config.settings.pet_name);
    setButtonGrams(config.settings.button_grams);
    setMaxBowl(config.settings.max_bowl_g);
    setNeutral(config.calibration.servo_neutral_us);
  }, [config]);

  const dirty =
    !!config &&
    (petName.trim() !== config.settings.pet_name || buttonGrams !== config.settings.button_grams || maxBowl !== config.settings.max_bowl_g);
  const valid = petName.trim().length > 0 && petName.trim().length <= 32 && buttonGrams >= 5 && buttonGrams <= 200 && maxBowl >= 50 && maxBowl <= 2000;

  async function saveSettings() {
    if (await settings.run('set_settings', { pet_name: petName.trim(), button_grams: buttonGrams, max_bowl_g: maxBowl })) toast('Ajustes salvos');
  }

  async function maintenance<K extends 'rotor_test' | 'unjam' | 'empty_hopper' | 'reboot'>(name: K, args: K extends 'rotor_test' ? { dir: 'fwd' | 'rev'; ms: number } : Record<string, never>, done: string) {
    setConfirm(null);
    if (await maint.run(name, args as never)) toast(done);
  }

  const v = Number(measuredV.replace(',', '.'));

  return (
    <main className="screen">
      <ScreenHead title="Ajustes" />

      <section className="card">
        <h2>Pet e porções</h2>
        <label className="field">
          <span>Nome do pet</span>
          <input className="input" value={petName} maxLength={32} onChange={(e) => setPetName(e.target.value)} disabled={!config} />
        </label>
        <div className="grid-2">
          <label className="field">
            <span>Porção do botão (g)</span>
            <input className="input num" type="number" inputMode="numeric" min={5} max={200} step={5} value={buttonGrams} onChange={(e) => setButtonGrams(Number(e.target.value))} disabled={!config} />
          </label>
          <label className="field">
            <span>Vasilha cabe (g)</span>
            <input className="input num" type="number" inputMode="numeric" min={50} max={2000} step={10} value={maxBowl} onChange={(e) => setMaxBowl(Number(e.target.value))} disabled={!config} />
          </label>
        </div>
        <span className="hint">O alimentador nunca enche a vasilha além do que ela cabe. Pilhas: alcalinas AA.</span>
        {settings.error && <Banner tone="bad">{settings.error.message}</Banner>}
        <Button variant="primary" block disabled={!canCommand || !dirty || !valid} busy={settings.busy === 'set_settings'} onClick={saveSettings}>Salvar</Button>
      </section>

      <section className="card">
        <h2>Calibração</h2>
        <button type="button" className="list-item button" onClick={() => go('calibracao')} disabled={!canCommand}>
          <Icon name="scale" />
          <span className="grow">
            <span style={{ display: 'block', fontWeight: 600 }}>Calibrar a balança</span>
            <span className="small">
              {config && config.calibration.scale_factor ? `Vasilha tarada: ${config.calibration.bowl_weight_g.toLocaleString('pt-BR')} g` : 'Ainda não calibrada'}
            </span>
          </span>
          <Icon name="chevron" />
        </button>
        <div className="field">
          <span>Bateria: tensão medida no multímetro</span>
          <div className="row">
            <input className="input num grow" inputMode="decimal" placeholder={status ? volts(status.battery.v) : '8,90 V'} value={measuredV} onChange={(e) => setMeasuredV(e.target.value)} />
            <Button
              disabled={!canCommand || !(v >= 3 && v <= 12)}
              busy={maint.busy === 'calibrate_battery'}
              onClick={async () => {
                const r = await maint.run('calibrate_battery', { measured_v: v });
                if (r) { toast(`Bateria ajustada: ${volts(r.v)}`); setMeasuredV(''); }
              }}
            >Ajustar</Button>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Rotor (manutenção)</h2>
        <div className="grid-2">
          <Button disabled={!canCommand} busy={maint.busy === 'rotor_test'} onClick={() => maintenance('rotor_test', { dir: 'fwd', ms: 1000 }, 'Rotor girou para frente')}>Girar ▶ 1 s</Button>
          <Button disabled={!canCommand} busy={maint.busy === 'rotor_test'} onClick={() => maintenance('rotor_test', { dir: 'rev', ms: 1000 }, 'Rotor girou para trás')}>◀ Voltar 1 s</Button>
        </div>
        <Button block disabled={!canCommand} busy={maint.busy === 'unjam'} onClick={() => maintenance('unjam', {}, 'Rotina de destravar concluída')}>Destravar</Button>
        <div className="field">
          <span>Ponto "parado" do servo (µs)</span>
          <div className="row">
            <input className="input num grow" type="number" min={1400} max={1600} value={neutral} onChange={(e) => setNeutral(Number(e.target.value))} />
            <Button
              disabled={!canCommand || neutral < 1400 || neutral > 1600}
              busy={maint.busy === 'servo_trim'}
              onClick={async () => { if (await maint.run('servo_trim', { neutral_us: neutral })) toast('Servo segurou 2 s no neutro: o rotor não deve ter andado'); }}
            >Testar</Button>
          </div>
          <span className="hint">Se o rotor anda devagar quando deveria estar parado, ajuste este valor de 5 em 5.</span>
        </div>
        {confirm === 'empty' ? (
          <Button variant="danger" block busy={maint.busy === 'empty_hopper'} onClick={() => maintenance('empty_hopper', {}, 'Esvaziando o reservatório…')}>
            Confirmar: tire a vasilha e ponha um pote grande
          </Button>
        ) : (
          <Button variant="ghost" block disabled={!canCommand} onClick={() => setConfirm('empty')}>Esvaziar reservatório</Button>
        )}
        {maint.error && <Banner tone="bad">{maint.error.message}</Banner>}
      </section>

      <section className="card">
        <h2>Dispositivo</h2>
        <div className="list">
          <Info label="Código" value={pairing?.deviceId ?? '—'} />
          <Info label="Firmware" value={status?.fw ?? '—'} />
          <Info label="Sinal Wi-Fi" value={status ? `${status.wifi_rssi} dBm (${rssiText(status.wifi_rssi)})` : '—'} />
          <Info label="Vazão aprendida" value={config ? `${(config.calibration.flow_g_per_ms * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} g/s de giro` : '—'} />
        </div>
        {confirm === 'reboot' ? (
          <Button variant="danger" block busy={maint.busy === 'reboot'} onClick={() => maintenance('reboot', {}, 'Reiniciando o alimentador…')}>Confirmar: reiniciar</Button>
        ) : (
          <Button block disabled={!canCommand} onClick={() => setConfirm('reboot')}>Reiniciar alimentador</Button>
        )}
        {confirm === 'unpair' ? (
          <Button variant="danger" block onClick={() => unpair()}>Confirmar: desparear e apagar histórico local</Button>
        ) : (
          <Button variant="ghost" block onClick={() => setConfirm('unpair')}>Desparear</Button>
        )}
      </section>
      <p className="hint" style={{ textAlign: 'center' }}>Alimentador de Pet IoT · app 0.1.0</p>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="list-item">
      <span className="grow small">{label}</span>
      <span className="num" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const rssiText = (r: number) => (r >= -60 ? 'bom' : r >= -72 ? 'razoável' : 'fraco');
