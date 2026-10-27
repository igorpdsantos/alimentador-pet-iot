// Primeiro uso: liga o celular a um alimentador pelo device_id (specs/06-app-mobile.md §3).
import { useEffect, useRef, useState } from 'react';
import { Banner, Button, ScreenHead } from '../components/ui';
import { Icon } from '../components/Icon';
import { DEVICE_ID_RE } from '../protocol/topics';
import { defaultBroker, useDevice } from '../store/device';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const hasBarcode = typeof window !== 'undefined' && 'BarcodeDetector' in window;

export function Pareamento() {
  const pair = useDevice((s) => s.pair);
  const broker = defaultBroker();
  const [deviceId, setDeviceId] = useState('');
  const [url, setUrl] = useState(broker.url);
  const [username, setUsername] = useState(broker.username ?? '');
  const [password, setPassword] = useState(broker.password ?? '');
  const [advanced, setAdvanced] = useState(!broker.url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  const id = deviceId.trim().toLowerCase();
  const idOk = DEVICE_ID_RE.test(id);
  const urlOk = /^wss?:\/\/.+/.test(url.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idOk || !urlOk) return;
    setBusy(true);
    setError('');
    try {
      await pair({ deviceId: id, url: url.trim(), username: username.trim(), password });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen no-tabs">
      <ScreenHead title="Alimentador de Pet" subtitle="Vamos conectar o seu alimentador" />

      <section className="card" aria-labelledby="passos">
        <h2 id="passos">Antes de começar</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          <li>Ligue o alimentador na tomada e na chave.</li>
          <li>No celular, conecte-se à rede Wi-Fi <b>Alimentador-xxxxxx</b> com a <b>senha da etiqueta</b> do alimentador.</li>
          <li>Na página que abrir, escolha o Wi-Fi da sua casa e anote o <b>código do alimentador</b> (pf-…).</li>
          <li>Volte ao Wi-Fi de casa e digite o código abaixo.</li>
        </ol>
      </section>

      <form className="card" onSubmit={submit} noValidate>
        <label className="field">
          <span>Código do alimentador</span>
          <input
            className="input"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="pf-a1b2c3"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-invalid={deviceId !== '' && !idOk}
          />
          {deviceId !== '' && !idOk && <span className="error-text">O código começa com "pf-", ex.: pf-a1b2c3</span>}
        </label>
        {hasBarcode && (
          <Button onClick={() => setScanning(true)}>
            <Icon name="qr" /> Ler o QR da etiqueta
          </Button>
        )}

        <button type="button" className="btn ghost" onClick={() => setAdvanced(!advanced)} aria-expanded={advanced}>
          {advanced ? 'Ocultar servidor MQTT' : 'Servidor MQTT (avançado)'}
        </button>
        {advanced && (
          <>
            <label className="field">
              <span>Endereço do broker</span>
              <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="wss://…:8884/mqtt" autoCapitalize="none" spellCheck={false} />
              <span className="hint">WebSocket seguro do HiveMQ Cloud. Para testar com o simulador: ws://localhost:9001/mqtt</span>
            </label>
            <div className="grid-2">
              <label className="field">
                <span>Usuário</span>
                <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" />
              </label>
              <label className="field">
                <span>Senha</span>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </label>
            </div>
          </>
        )}

        {error && <Banner tone="bad">{error}</Banner>}
        <Button type="submit" variant="primary" size="lg" block busy={busy} disabled={!idOk || !urlOk}>
          {busy ? 'Procurando o alimentador…' : 'Conectar'}
        </Button>
      </form>
      {scanning && <QrScanner onResult={(v) => { setDeviceId(v); setScanning(false); }} onClose={() => setScanning(false)} />}
    </main>
  );
}

function QrScanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: object) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ['qr_code'] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current);
          const hit = codes.map((c) => c.rawValue.trim().toLowerCase()).find((v) => DEVICE_ID_RE.test(v));
          if (hit) return onResult(hit);
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch {
        setErr('Não foi possível usar a câmera. Digite o código.');
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label="Ler QR" onClick={(e) => e.stopPropagation()}>
        <h2>Aponte para o QR da etiqueta</h2>
        <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 16, background: '#000' }} />
        {err && <Banner tone="bad">{err}</Banner>}
        <Button onClick={onClose} block>Cancelar</Button>
      </div>
    </div>
  );
}
