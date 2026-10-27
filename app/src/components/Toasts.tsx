import { useDevice } from '../store/device';
import { Icon } from './Icon';

export function Toasts() {
  const toasts = useDevice((s) => s.toasts);
  const dismiss = useDevice((s) => s.dismissToast);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <button key={t.id} type="button" className={`toast ${t.tone}`} onClick={() => dismiss(t.id)}>
          <Icon name={t.tone === 'info' ? 'check' : 'alert'} size={20} />
          <span className="grow">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
