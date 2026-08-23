import {
  declareIndexPlugin,
  type ReactRNPlugin,
  WidgetLocation,
} from '@remnote/plugin-sdk';
import '../style.css';
import {
  BALLOON_HIDE_CONTEXT_POWERUP_CODE,
  BALLOON_HIDE_CONTEXT_POWERUP_NAME,
  BALLOON_LINK_POWERUP_CODE,
  BALLOON_LINK_POWERUP_NAME,
  BALLOON_PRESENCE_POWERUP_CODE,
  BALLOON_PRESENCE_POWERUP_NAME,
  openBalloonForRem,
  repairPresenceMarkers,
} from '../lib/balloon';

const BALLOON_HIDE_CONTEXT_CSS = `
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .RichTextViewer,
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .rn-flashcard-delimiter,
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .rn-queue-rem > .RichTextViewer,
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .rn-queue-rem > .rn-bullet-container,
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .rn-queue-rem > .rem-bullet__document,
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) > .rem-bullet__document {
  display: none !important;
}
.rn-queue__content--answer-hidden [data-queue-rem-container-tags~="balao-hide-context-v2"]:not(.rn-question-rem) {
  margin-left: 0 !important;
}
`;

async function getFocusedRemId(plugin: ReactRNPlugin): Promise<string | undefined> {
  const focusedRem = await plugin.focus.getFocusedRem();
  return focusedRem?._id;
}

async function onActivate(plugin: ReactRNPlugin) {
  await plugin.app.registerPowerup({
    name: BALLOON_HIDE_CONTEXT_POWERUP_NAME,
    code: BALLOON_HIDE_CONTEXT_POWERUP_CODE,
    description: 'Oculta o REM de contexto do Nota+ na frente do flashcard e o mostra após revelar a resposta.',
    options: { slots: [] },
  });

  await plugin.app.registerPowerup({
    name: BALLOON_LINK_POWERUP_NAME,
    code: BALLOON_LINK_POWERUP_CODE,
    description: 'Registro interno invisível que liga um REM ao seu Nota+.',
    options: { slots: [] },
  });

  await plugin.app.registerPowerup({
    name: BALLOON_PRESENCE_POWERUP_NAME,
    code: BALLOON_PRESENCE_POWERUP_CODE,
    description: 'Indica que este REM possui Nota+. O número ao lado abre a nota e mostra a quantidade de itens.',
    options: { slots: [] },
  });


  await plugin.app.registerCSS('balao-hide-context', BALLOON_HIDE_CONTEXT_CSS);

  await plugin.app.registerWidget('balloon_popup', WidgetLocation.Popup, {
    dimensions: { height: 760, width: 920 },
  });

  // Indicador visual puro. O widget é montado ao lado de cada editor, mas o
  // componente só renderiza conteúdo quando aquele REM já possui um Balão.
  await plugin.app.registerWidget('balloon_indicator', WidgetLocation.RightSideOfEditor, {
    dimensions: { height: 24, width: 30 },
  });

  const openFocusedBalloon = async () => {
    const remId = await getFocusedRemId(plugin);
    if (!remId) {
      await plugin.app.toast('Nota+: coloque o cursor em um REM.');
      return;
    }
    await openBalloonForRem(plugin, remId);
  };

  // Sem atalho global: Alt+B conflitou com o notebook do usuário. /Balão é o
  // acionamento principal e não disputa teclas do sistema ou do editor.
  await plugin.app.registerCommand({
    id: 'balao-open-command',
    name: 'Nota+',
    description: 'Abre ou cria o Nota+ no REM atual.',
    keywords: 'nota nota+ balão balao abrir comentário comentario flashcard',
    action: openFocusedBalloon,
  });

  try {
    await plugin.app.registerRemMenuItem({
      id: 'balao-open-rem-menu',
      name: 'Abrir Nota+',
      description: 'Abrir ou criar o Nota+ vinculado a este REM.',
      action: openFocusedBalloon,
    });
  } catch (error) {
    console.warn('[Balão] Menu contextual indisponível nesta plataforma.', error);
  }

  // Repara silenciosamente Balões já existentes para que o marcador nativo
  // "Balão" apareça também após reiniciar/recarregar o RemNote.
  void repairPresenceMarkers(plugin);
}

async function onDeactivate(_: ReactRNPlugin) {}

declareIndexPlugin(onActivate, onDeactivate);
