// Navegação por abas com rota no hash (#/agenda…), o que funciona em qualquer hospedagem estática.
import { useEffect, useState } from 'react';
import { Icon } from './components/Icon';
import { Toasts } from './components/Toasts';
import { Agenda } from './screens/Agenda';
import { Ajustes } from './screens/Ajustes';
import { Calibracao } from './screens/Calibracao';
import { Historico } from './screens/Historico';
import { Inicio } from './screens/Inicio';
import { Pareamento } from './screens/Pareamento';
import { useDevice } from './store/device';

const TABS = [
  { route: '', label: 'Início', icon: 'home' },
  { route: 'agenda', label: 'Agenda', icon: 'calendar' },
  { route: 'historico', label: 'Histórico', icon: 'chart' },
  { route: 'ajustes', label: 'Ajustes', icon: 'settings' },
] as const;

const readRoute = () => window.location.hash.replace(/^#\/?/, '');

export function App() {
  const pairing = useDevice((s) => s.pairing);
  const init = useDevice((s) => s.init);
  const [route, setRoute] = useState(readRoute());

  useEffect(() => init(), [init]);
  useEffect(() => {
    const on = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = (r: string) => (window.location.hash = `/${r}`);

  if (!pairing) {
    return (
      <div className="app">
        <Toasts />
        <Pareamento />
      </div>
    );
  }

  let screen;
  switch (route) {
    case 'agenda': screen = <Agenda />; break;
    case 'historico': screen = <Historico />; break;
    case 'ajustes': screen = <Ajustes go={go} />; break;
    case 'calibracao': screen = <Calibracao back={() => go('ajustes')} />; break;
    default: screen = <Inicio />;
  }

  return (
    <div className="app">
      <Toasts />
      {screen}
      {route !== 'calibracao' && (
        <div className="tabbar">
          <nav aria-label="Navegação principal">
            {TABS.map((t) => (
              <a key={t.route} className="tab" href={`#/${t.route}`} aria-current={route === t.route ? 'page' : undefined}>
                <Icon name={t.icon} size={24} />
                {t.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}
