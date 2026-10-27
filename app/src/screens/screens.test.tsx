import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from '../test/fixtures';
import * as S from '../protocol/schemas';
import { useDevice } from '../store/device';
import { Agenda } from './Agenda';
import { Inicio } from './Inicio';

const status = S.status.parse(fixture('status.json'));
const config = S.config.parse(fixture('config.json'));

beforeEach(() => {
  useDevice.setState({
    pairing: { deviceId: 'pf-a1b2c3', url: 'ws://x' }, conn: 'connected', online: true,
    status, statusAt: Date.now(), config, feed: null, lastResult: null, toasts: [],
  });
});

describe('Início', () => {
  it('mostra vasilha, reservatório, bateria e próxima refeição', () => {
    render(<Inicio />);
    expect(screen.getByText('Olá, Thor')).toBeInTheDocument();
    expect(screen.getByText('43 g')).toBeInTheDocument(); // 42,5 g arredondado no cartão
    expect(screen.getByText('76%')).toBeInTheDocument();
    expect(screen.getByText('18:00')).toBeInTheDocument();
    expect(screen.getByText(/Pilhas de reserva 78%/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alimentar agora/ })).toBeEnabled();
  });

  it('offline desabilita os comandos', () => {
    useDevice.setState({ online: false });
    render(<Inicio />);
    expect(screen.getByText(/Alimentador offline/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alimentar agora/ })).toBeDisabled();
  });

  it('mostra o progresso da refeição', () => {
    useDevice.setState({ feed: { feedId: 57, targetG: 50, servedG: 31.4, source: 'app' } });
    render(<Inicio />);
    expect(screen.getByText('31,4 g')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da refeição' })).toHaveAttribute('aria-valuenow', '31');
  });

  it('resultado com erro usa mensagem amigável', () => {
    const rec = S.event.parse(fixture('event_feed_result_no_flow.json'));
    if (rec.type !== 'feed_result') throw new Error();
    useDevice.setState({ lastResult: rec });
    render(<Inicio />);
    expect(screen.getByText(/confira a ração/)).toBeInTheDocument();
  });
});

describe('Agenda', () => {
  it('lista as refeições do config', () => {
    render(<Agenda />);
    expect(screen.getByText('07:30')).toBeInTheDocument();
    expect(screen.getByText('Todos os dias')).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /07:30/ })).toHaveAttribute('aria-checked', 'true');
  });
});
