import { renderWidget, usePlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { useEffect, useRef, useState } from 'react';
import {
  getBalloonFromDatabaseLink,
  getExistingBalloonRootId,
  getStoredBalloonItemCount,
  openBalloonForRem,
} from '../lib/balloon';
import '../style.css';
import './balloon_indicator.css';

function BalloonIndicator() {
  const plugin = usePlugin();
  const [remId, setRemId] = useState<string>();
  const remIdRef = useRef<string>();
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(0);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const context = await plugin.widget.getWidgetContext<WidgetLocation.RightSideOfEditor>();
        const currentRemId = context.remId;
        if (!currentRemId || cancelled) return;

        remIdRef.current = currentRemId;
        setRemId(currentRemId);

        // v0.5.5: primeiro consulta o vínculo registrado no próprio banco do
        // RemNote. Isso atravessa iframes e recarregamentos sem depender do cache
        // de plugin.storage.
        const dbLink = await getBalloonFromDatabaseLink(plugin, currentRemId);
        if (cancelled) return;
        if (dbLink) {
          setVisible(true);
          setCount(dbLink.count);
          return;
        }

        // Compatibilidade com Balões antigos ainda não migrados: se o storage
        // responder, o indicador continua funcionando. Abrir o Balão uma vez
        // cria automaticamente o novo vínculo de banco.
        const legacyRootId = await getExistingBalloonRootId(plugin, currentRemId);
        if (cancelled) return;
        if (legacyRootId) {
          const nextCount = await getStoredBalloonItemCount(plugin, currentRemId);
          if (cancelled) return;
          setVisible(true);
          setCount(nextCount);
          return;
        }

        setVisible(false);
        setCount(0);
      } catch (error) {
        console.warn('[Balão indicador] atualização', error);
      }
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 1500);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [plugin]);

  const open = async () => {
    const currentRemId = remIdRef.current ?? remId;
    if (!currentRemId || !visible || opening) return;
    setOpening(true);
    try {
      await openBalloonForRem(plugin, currentRemId);
    } finally {
      setOpening(false);
    }
  };

  return (
    <button
      type="button"
      className={`balao-indicator ${visible ? 'balao-indicator--visible' : 'balao-indicator--hidden'}`}
      onClick={() => void open()}
      disabled={!visible || opening}
      tabIndex={visible ? 0 : -1}
      title={visible ? (count > 0 ? `Abrir Nota+ (${count} item${count === 1 ? '' : 's'})` : 'Abrir Nota+') : undefined}
      aria-hidden={!visible}
      aria-label={visible ? (count > 0 ? `Abrir Nota+ com ${count} itens` : 'Abrir Nota+') : undefined}
    >
      <span className="balao-indicator__count">{count > 0 ? count : '↗'}</span>
    </button>
  );
}

renderWidget(BalloonIndicator);
