// Primeiro uso: liga o celular a um alimentador pelo device_id (specs/06-app-mobile.md §3).
import { useEffect, useRef, useState } from 'react';
import { Banner, Button, ScreenHead } from '../components/ui';
import { Icon } from '../components/Icon';
import { parsePairCode } from '../protocol/topics';
import { defaultBroker, useDevice } from '../store/device';

type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };
const hasBarcode = typeof window !== 'undefined' && 'BarcodeDetector' in window;
// QR do app na etiqueta: .../app/#codigo=pf-xxxxxx-segredo. Depois do # o código não vai para o servidor do site.
const LINK_RE = /[#&]codigo=([^&]+)/;
const codeFromLink = () => {
  const m = typeof window !== 'undefined' ? LINK_RE.exec(window.location.hash) : null;
  return m ? decodeURIComponent(m[1]) : '';
};

export function Pareamento() {
  const pair = useDevice((s) => s.pair);
  const startDemo = useDevice((s) => s.startDemo);
  const tutorName = useDevice((s) => s.tutorName);
  const setTutorName = useDevice((s) => s.setTutorName);
  const url = defaultBroker().url; // só o endereço do broker; usuário e senha vêm do código (D24)
  const [input, setInput] = useState(codeFromLink);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const autoTried = useRef(false);

  const code = parsePairCode(input);
  const codeOk = !!code?.secret;

  async function connect(value: string) {
    const c = parsePairCode(value);
    if (!c?.secret || !url) return;
    setBusy(true);
    setError('');
    try {
      await pair({ deviceId: c.deviceId, url, username: c.deviceId, password: c.secret });
      if (LINK_RE.test(window.location.hash)) history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  // Aberto pelo QR "Abrir o app" da etiqueta: conecta sozinho, sem tocar em nada.
  useEffect(() => {
    if (autoTried.current) return;
    autoTried.current = true;
    const fromLink = codeFromLink();
    if (parsePairCode(fromLink)?.secret) void connect(fromLink);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (codeOk) void connect(input);
  }

  return (
    <main className="screen no-tabs">
      <ScreenHead title="Alimentador de Pet" subtitle="Vamos conectar o seu alimentador" />

      <form className="card" onSubmit={submit} noValidate>
        <label className="field">
          <span>Código do alimentador</span>
          <input
            className="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="pf-a1b2c3-k7m2q9xd"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            inputMode="text"
            aria-invalid={input !== '' && !codeOk}
          />
          {input !== '' && !codeOk ? (
            <span className="error-text">Digite o código completo da etiqueta, ex.: pf-a1b2c3-k7m2q9xd</span>
          ) : (
            <span className="hint">Está na etiqueta do alimentador e na página de configuração do Wi-Fi.</span>
          )}
        </label>
        {hasBarcode && (
          <Button onClick={() => setScanning(true)}>
            <Icon name="qr" /> Ler o QR da etiqueta
          </Button>
        )}
        {!url && <Banner tone="bad">Endereço do servidor não configurado (VITE_MQTT_URL).</Banner>}
        {error && <Banner tone="bad">{error}</Banner>}
        <Button type="submit" variant="primary" size="lg" block busy={busy} disabled={!codeOk || !url}>
          {busy ? 'Procurando o alimentador…' : 'Conectar'}
        </Button>
      </form>

      <section className="card" aria-labelledby="passos">
        <h2 id="passos">Primeira vez? Use a etiqueta</h2>
        <ol style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
          <li>Ligue o alimentador na tomada e na chave.</li>
          <li>Aponte a câmera do celular para o QR <b>1. Configurar o Wi-Fi</b> e entre na rede do alimentador.</li>
          <li>Na página que abrir, toque em <b>Configurar Wi-Fi</b>, escolha o Wi-Fi da sua casa e digite a senha dele.</li>
          <li>Volte ao Wi-Fi de casa e aponte a câmera para o QR <b>2. Abrir o app</b>. Ele conecta sozinho.</li>
        </ol>
      </section>

      <section className="card">
        <label className="field">
          <span>Como podemos chamar você? (opcional)</span>
          <input className="input" value={tutorName} maxLength={32} autoComplete="given-name" onChange={(e) => setTutorName(e.target.value)} placeholder="Seu nome" />
        </label>
      </section>

      <section className="card">
        <h2>Ainda não tem o alimentador?</h2>
        <p className="small" style={{ margin: 0 }}>Conheça todas as telas com um alimentador simulado no próprio celular. Não precisa de servidor nem de cadastro.</p>
        <Button block onClick={() => void startDemo()}>Ver demonstração</Button>
      </section>
      {scanning && <QrScanner onResult={(v) => { setInput(v); setScanning(false); void connect(v); }} onClose={() => setScanning(false)} />}
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
          const hit = codes.map((c) => c.rawValue.trim().toLowerCase()).map((v) => LINK_RE.exec(v)?.[1] ?? v).find((v) => parsePairCode(v)?.secret);
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
