// Peças básicas da interface.
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { Tone } from '../protocol/messages';

export function Button({
  children, onClick, variant = 'secondary', size, block, disabled, busy, type = 'button', label,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'lg';
  block?: boolean;
  disabled?: boolean;
  busy?: boolean;
  type?: 'button' | 'submit';
  label?: string;
}) {
  const cls = ['btn', variant, size, block && 'block'].filter(Boolean).join(' ');
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled || busy} aria-busy={busy} aria-label={label}>
      {busy && <span className="spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Pill({ tone, children, dot }: { tone: Tone | 'info'; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`pill ${tone}`}>
      {dot && <span className="dot" aria-hidden />}
      {children}
    </span>
  );
}

export function Bar({ value, max, tone, large, label }: { value: number; max: number; tone?: 'food' | 'warn' | 'bad'; large?: boolean; label: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (100 * value) / max)) : 0;
  return (
    <div
      className={['bar', tone, large && 'lg'].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Stepper({ value, onChange, min, max, step, unit = 'g', label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step: number; unit?: string; label: string;
}) {
  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn" onClick={() => onChange(clamp(value - step))} disabled={value <= min} aria-label={`Diminuir ${step} ${unit}`}>
        <Icon name="minus" />
      </button>
      <output className="value" aria-live="polite">
        {value} <small>{unit}</small>
      </output>
      <button type="button" className="icon-btn" onClick={() => onChange(clamp(value + step))} disabled={value >= max} aria-label={`Aumentar ${step} ${unit}`}>
        <Icon name="plus" />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="grabber" aria-hidden />
        <div className="row between">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Banner({ tone, children, action }: { tone: 'warn' | 'bad' | 'info'; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={`banner ${tone}`} role={tone === 'info' ? 'status' : 'alert'}>
      <Icon name={tone === 'info' ? 'check' : 'alert'} size={20} />
      <div className="grow">{children}</div>
      {action}
    </div>
  );
}

export function ScreenHead({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="screen-head">
      <div className="grow">
        <h1>{title}</h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
