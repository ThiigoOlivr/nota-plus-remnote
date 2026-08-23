import { renderWidget, usePlugin, WidgetLocation } from '@remnote/plugin-sdk';
import { useEffect, useState } from 'react';
import '../style.css';
import './balloon_popup.css';
import { broadcastBalloonState, setHideContextEnabled } from '../lib/balloon';
import {
  NativeBalloonEditor,
  NativeEditorBoundary,
  nativeHierarchyEditorAvailable,
} from './native_balloon_editor';

type PopupData = {
  hostRemId: string;
  balloonRootId: string;
  owningDocumentId?: string;
  hideContext?: boolean;
};

function BalloonPopup() {
  const plugin = usePlugin();
  const [data, setData] = useState<PopupData>();
  const [origin, setOrigin] = useState('REM');
  const [documentName, setDocumentName] = useState('documento de origem');
  const [itemCount, setItemCount] = useState(0);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [hideContext, setHideContext] = useState(true);
  const [hideContextBusy, setHideContextBusy] = useState(false);
  const [nativeFailed, setNativeFailed] = useState(false);

  async function refreshCount(balloonRootId: string, hostRemId?: string) {
    const root = await plugin.rem.findOne(balloonRootId);
    if (!root) return;
    const children = await root.getChildrenRem();
    const nextCount = children.length;
    setItemCount(nextCount);
    if (hostRemId) {
      await broadcastBalloonState(plugin, hostRemId, balloonRootId, nextCount);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const context = await plugin.widget.getWidgetContext<WidgetLocation.Popup>();
        const incoming = context.contextData as PopupData | undefined;
        if (!incoming?.hostRemId || !incoming?.balloonRootId) {
          setError('O Nota+ foi aberto sem um REM de origem.');
          return;
        }

        setData(incoming);
        setHideContext(incoming.hideContext !== false);

        const host = await plugin.rem.findOne(incoming.hostRemId);
        if (host?.text) {
          const plain = (await plugin.richText.toString(host.text)).trim();
          if (plain) setOrigin(plain);
        }

        if (incoming.owningDocumentId) {
          const doc = await plugin.rem.findOne(incoming.owningDocumentId);
          if (doc?.text) {
            const plainDoc = (await plugin.richText.toString(doc.text)).replace(/\s+/g, ' ').trim();
            if (plainDoc) setDocumentName(plainDoc.length > 85 ? `${plainDoc.slice(0, 82)}…` : plainDoc);
          }
        }

        await refreshCount(incoming.balloonRootId, incoming.hostRemId);
      } catch (e) {
        console.error('[Balão popup]', e);
        setError(e instanceof Error ? e.message : 'Não foi possível carregar este Nota+.');
      }
    })();
  }, [plugin]);

  // Conteúdo criado pelo editor nativo não passa pelo React do plugin. O contador
  // é atualizado em segundo plano apenas para dar feedback visual.
  useEffect(() => {
    if (!data || nativeFailed) return;
    const timer = window.setInterval(() => {
      void refreshCount(data.balloonRootId, data.hostRemId).catch((e) => console.warn('[Balão] contador', e));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [data, nativeFailed]);

  async function toggleHideContext() {
    if (!data || hideContextBusy) return;
    const next = !hideContext;
    setHideContextBusy(true);
    try {
      const root = await plugin.rem.findOne(data.balloonRootId);
      if (!root) throw new Error('REM interno do Nota+ não encontrado.');
      await setHideContextEnabled(plugin, data.hostRemId, root, next);
      setHideContext(next);
      await plugin.app.toast(
        next
          ? 'Nota+: REM de origem oculto até revelar a resposta.'
          : 'Nota+: REM de origem será mostrado também na frente do cartão.',
      );
    } catch (e) {
      console.error('[Balão ocultar contexto]', e);
      await plugin.app.toast('Nota+: não foi possível alterar a ocultação do contexto.');
    } finally {
      setHideContextBusy(false);
    }
  }

  async function addTrapDraft() {
    if (!data || busy) return;
    setBusy(true);
    try {
      const host = await plugin.rem.findOne(data.hostRemId);
      const card = await plugin.rem.createRem();
      if (!card) throw new Error('createRem retornou vazio.');

      if (host?.text) await card.setText(host.text);
      else await card.setText([origin]);
      await card.setBackText(['Errado.']);
      await card.setParent(data.balloonRootId);
      await card.setIsCardItem(false);
      await card.setPracticeDirection('forward');
      await card.setEnablePractice(true);
      await refreshCount(data.balloonRootId, data.hostRemId);
      await plugin.app.toast('Pegadinha criada. Altere a expressão na frente e ajuste a resposta.');
    } catch (e) {
      console.error('[Balão pegadinha]', e);
      await plugin.app.toast('Nota+: não foi possível criar a pegadinha.');
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="balao-shell balao-shell--center">
        <div className="balao-error">{error}</div>
        <button className="balao-btn" onClick={() => plugin.widget.closePopup()}>Fechar</button>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="balao-shell balao-shell--center">
        <div className="balao-loading">Abrindo Nota+…</div>
      </main>
    );
  }

  const nativeFallback = (
    <div className="balao-native-fallback">
      <strong>O editor nativo do RemNote não carregou nesta sessão.</strong>
      <span>Feche e reabra o Nota+. Se persistir, reinicie o plugin e informe o erro.</span>
    </div>
  );

  return (
    <main className="balao-shell">
      <header className="balao-header">
        <div className="balao-title-wrap">
          <div className="balao-mark">💬</div>
          <div className="balao-header-copy">
            <h1>Nota+ <span className="balao-version">1.0</span></h1>
            <div className="balao-subtitle">Notas e flashcards vinculados ao REM de origem.</div>
          </div>
        </div>
        <button className="balao-close" onClick={() => plugin.widget.closePopup()} title="Fechar">×</button>
      </header>

      <section className="balao-origin-card" aria-label="REM de origem">
        <div className="balao-origin-card-label">REM de origem</div>
        <div className="balao-origin-card-text">{origin}</div>
      </section>

      <section className="balao-toolbar balao-toolbar--simple" aria-label="Ações do Nota+">
        <button
          className="balao-btn balao-btn--trap"
          onClick={() => void addTrapDraft()}
          disabled={busy}
          title="Copia o REM de origem para você alterar uma expressão e criar uma pegadinha"
        >
          ⚡ Criar pegadinha
        </button>
        <span className="balao-counts">{itemCount} item(ns) neste Nota+</span>
      </section>

      <section className={`balao-integration ${data.owningDocumentId ? 'balao-integration--ok' : 'balao-integration--warn'}`}>
        {data.owningDocumentId
          ? <>✓ Os flashcards deste Nota+ entram na fila de <strong>{documentName}</strong>.</>
          : <>⚠ Não foi possível identificar um documento de origem; os cartões continuam disponíveis na fila global.</>}
      </section>

      <section className="balao-context-setting">
        <div className="balao-context-copy">
          <strong>Ocultar REM de origem até revelar a resposta</strong>
          <span>Evita que o dispositivo correto entregue a resposta. Ao virar o cartão, o REM reaparece para comparação.</span>
        </div>
        <button
          type="button"
          className={`balao-switch ${hideContext ? 'balao-switch--on' : ''}`}
          role="switch"
          aria-checked={hideContext}
          aria-label="Ocultar REM de origem até revelar a resposta"
          onClick={() => void toggleHideContext()}
          disabled={hideContextBusy}
          title={hideContext ? 'Ativado' : 'Desativado'}
        >
          <span className="balao-switch-knob" />
        </button>
      </section>

      <section className="balao-native-editor-wrap balao-native-editor-wrap--primary">
        <div className="balao-native-tip">
          <strong>Editor do RemNote.</strong> Escreva uma linha normal para criar uma nota/comentário. Para flashcard, use o fluxo habitual do RemNote, por exemplo <strong>pergunta &gt;&gt; resposta</strong>. Formatação, referências e imagens podem ser usadas diretamente aqui.
        </div>

        {!nativeHierarchyEditorAvailable() ? nativeFallback : (
          <NativeEditorBoundary fallback={nativeFallback} onFailure={() => setNativeFailed(true)}>
            <NativeBalloonEditor remId={data.balloonRootId} />
          </NativeEditorBoundary>
        )}
      </section>
    </main>
  );
}

renderWidget(BalloonPopup);
