import type { RNPlugin, Rem } from '@remnote/plugin-sdk';

const VAULT_ID_KEY = 'balao.v1.vaultRemId';
const VAULT_NAME = '💬 Nota+ — armazenamento';
const LEGACY_VAULT_NAME = '🗨️ Balão — armazenamento';
const INDEX_NAME = '⚙️ Índice interno do Nota+';
const LEGACY_INDEX_NAME = '⚙️ Índice interno do Balão';
export const BALLOON_LINK_POWERUP_CODE = 'balaoInternalLinkV1';
export const BALLOON_LINK_POWERUP_NAME = 'Balao Internal Link V1';
export const BALLOON_PRESENCE_POWERUP_CODE = 'balaoPresenceV1';
export const BALLOON_PRESENCE_POWERUP_NAME = 'Nota+';

/**
 * Power-Up próprio do Balão. O CSS registrado no index oculta o REM que possui
 * este Power-Up apenas enquanto a resposta do cartão ainda está escondida.
 */
export const BALLOON_HIDE_CONTEXT_POWERUP_CODE = 'balaoHideContextV2';
export const BALLOON_HIDE_CONTEXT_POWERUP_NAME = 'Balao Hide Context V2';
const LEGACY_BALLOON_PRESENT_POWERUP_CODE = 'balaoHasBalloon';
const LEGACY_BALLOON_HIDE_CONTEXT_POWERUP_CODE = 'balaoHideContext';

export const BALLOON_STATE_MESSAGE = 'balao.state.changed.v1';

export type BalloonStateMessage = {
  type: typeof BALLOON_STATE_MESSAGE;
  hostRemId: string;
  balloonRootId?: string;
  count?: number;
};

export async function broadcastBalloonState(
  plugin: RNPlugin,
  hostRemId: string,
  balloonRootId?: string,
  count?: number,
): Promise<void> {
  try {
    const message: BalloonStateMessage = {
      type: BALLOON_STATE_MESSAGE,
      hostRemId,
      balloonRootId,
      count,
    };
    await plugin.messaging.broadcast(message);
  } catch (error) {
    // O broadcast é apenas a atualização instantânea do indicador. O armazenamento
    // sincronizado continua sendo a fonte de verdade e funciona como fallback.
    console.warn('[Balão] Não foi possível avisar os widgets sobre a atualização.', error);
  }
}

function balloonKey(hostRemId: string) {
  return `balao.v1.root.${hostRemId}`;
}

function hideContextKey(hostRemId: string) {
  return `balao.v3.hideContext.${hostRemId}`;
}


async function cleanupLegacyHostMarker(plugin: RNPlugin, hostRemId: string): Promise<void> {
  const host = await plugin.rem.findOne(hostRemId);
  if (!host) return;
  try {
    await host.removePowerup(LEGACY_BALLOON_PRESENT_POWERUP_CODE);
  } catch {
    // O marcador visual da v0.5.0 pode não existir neste REM ou já ter sido removido.
  }
}

export async function ensureHostPresenceMarker(plugin: RNPlugin, hostRemId: string): Promise<void> {
  const host = await plugin.rem.findOne(hostRemId);
  if (!host) return;
  try {
    await host.addPowerup(BALLOON_PRESENCE_POWERUP_CODE);
  } catch (error) {
    console.warn('[Balão] Não foi possível aplicar o marcador visual no REM.', error);
  }
}

async function existingRem(plugin: RNPlugin, remId?: string) {
  if (!remId) return undefined;
  return (await plugin.rem.findOne(remId)) ?? undefined;
}

export async function hasStoredBalloon(plugin: RNPlugin, hostRemId: string): Promise<boolean> {
  return Boolean(await plugin.storage.getSynced<string>(balloonKey(hostRemId)));
}

export async function getStoredBalloonItemCount(plugin: RNPlugin, hostRemId: string): Promise<number> {
  const rootId = await plugin.storage.getSynced<string>(balloonKey(hostRemId));
  const root = await existingRem(plugin, rootId);
  if (!root) return 0;
  try {
    const children = await root.getChildrenRem();
    return children.length;
  } catch {
    return 0;
  }
}

export async function getExistingBalloonRootId(
  plugin: RNPlugin,
  hostRemId: string,
): Promise<string | undefined> {
  const storedId = await plugin.storage.getSynced<string>(balloonKey(hostRemId));
  const root = await existingRem(plugin, storedId);
  return root?._id;
}

/**
 * Por padrão todo Balão oculta o contexto na frente da fila. Só retorna false
 * quando o usuário explicitamente desligou a opção naquele Balão.
 */
export async function getHideContextEnabled(plugin: RNPlugin, hostRemId: string): Promise<boolean> {
  const stored = await plugin.storage.getSynced<boolean>(hideContextKey(hostRemId));
  return stored !== false;
}

export async function setHideContextEnabled(
  plugin: RNPlugin,
  hostRemId: string,
  balloonRoot: Rem,
  enabled: boolean,
): Promise<void> {
  await plugin.storage.setSynced(hideContextKey(hostRemId), enabled);
  if (enabled) {
    await balloonRoot.addPowerup(BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    // Limpa o marcador usado pela v0.3.0 quando possível. O novo Power-Up tem
    // nome e código deliberadamente equivalentes em kebab-case, o que faz o
    // seletor da fila ser estável independentemente de o RemNote expor o nome
    // ou o código no atributo data-queue-rem-container-tags.
    try {
      await balloonRoot.removePowerup(LEGACY_BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    } catch {
      // A versão antiga pode já não estar registrada nesta sessão.
    }
  } else {
    await balloonRoot.removePowerup(BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    try {
      await balloonRoot.removePowerup(LEGACY_BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    } catch {
      // Sem ação.
    }
  }
}

async function ensureVault(plugin: RNPlugin) {
  const storedId = await plugin.storage.getSynced<string>(VAULT_ID_KEY);
  const storedVault = await existingRem(plugin, storedId);
  if (storedVault) {
    try {
      if (storedVault.text) {
        const currentName = (await plugin.richText.toString(storedVault.text)).trim();
        if (currentName === LEGACY_VAULT_NAME) await storedVault.setText([VAULT_NAME]);
      }
    } catch {
      // Migração apenas cosmética; o armazenamento continua válido pelo ID.
    }
    return storedVault;
  }

  let byName = await plugin.rem.findByName([VAULT_NAME], null);
  if (!byName) {
    byName = await plugin.rem.findByName([LEGACY_VAULT_NAME], null);
    if (byName) {
      try { await byName.setText([VAULT_NAME]); } catch {}
    }
  }
  if (byName) {
    await plugin.storage.setSynced(VAULT_ID_KEY, byName._id);
    return byName;
  }

  const vault = await plugin.rem.createRem();
  if (!vault) throw new Error('Não foi possível criar o armazenamento do Nota+.');

  await vault.setText([VAULT_NAME]);
  await vault.setIsDocument(true);
  await vault.setPracticeDirection('none');
  await vault.setEnablePractice(false);
  await plugin.storage.setSynced(VAULT_ID_KEY, vault._id);
  return vault;
}



async function ensureIndexContainer(plugin: RNPlugin, vault: Rem): Promise<Rem> {
  const children = await vault.getChildrenRem();
  for (const child of children) {
    if (!child.text) continue;
    const text = (await plugin.richText.toString(child.text)).trim();
    if (text === INDEX_NAME) return child;
    if (text === LEGACY_INDEX_NAME) {
      try { await child.setText([INDEX_NAME]); } catch {}
      return child;
    }
  }

  const index = await plugin.rem.createRem();
  if (!index) throw new Error('Não foi possível criar o índice interno do Nota+.');
  await index.setText([INDEX_NAME]);
  await index.setParent(vault._id, 0);
  await index.setPracticeDirection('none');
  await index.setEnablePractice(false);
  return index;
}

function parseInternalIndexText(text: string): { hostRemId: string; rootId: string } | undefined {
  const host = text.match(/\[balao-host:([^\]]+)\]/)?.[1];
  const root = text.match(/\[balao-root:([^\]]+)\]/)?.[1];
  if (!host || !root) return undefined;
  return { hostRemId: host, rootId: root };
}

async function findExistingIndexContainer(plugin: RNPlugin): Promise<Rem | undefined> {
  let vault = await plugin.rem.findByName([VAULT_NAME], null);
  if (!vault) vault = await plugin.rem.findByName([LEGACY_VAULT_NAME], null);
  if (!vault) return undefined;
  const children = await vault.getChildrenRem();
  for (const child of children) {
    if (!child.text) continue;
    const text = (await plugin.richText.toString(child.text)).trim();
    if (text === INDEX_NAME || text === LEGACY_INDEX_NAME) return child;
  }
  return undefined;
}

/**
 * Cria/atualiza um registro interno no banco do RemNote ligando o REM original
 * ao Balão. Os IDs são armazenados como texto simples, sem referências reais,
 * para evitar backlinks visíveis.
 */
async function ensureDatabaseLink(
  plugin: RNPlugin,
  hostRemId: string,
  balloonRoot: Rem,
): Promise<void> {
  const vault = await ensureVault(plugin);
  const index = await ensureIndexContainer(plugin, vault);
  const children = await index.getChildrenRem();

  for (const candidate of children) {
    try {
      if (!candidate.text) continue;

      // v0.5.7: o texto do índice é a fonte de verdade. Não dependemos mais de
      // candidate.hasPowerup(...), porque esse estado não se mostrou confiável
      // dentro do iframe do RightSideOfEditor.
      const plain = await plugin.richText.toString(candidate.text);
      const parsed = parseInternalIndexText(plain);

      // Registro já no formato novo.
      if (parsed?.hostRemId === hostRemId) {
        if (parsed.rootId !== balloonRoot._id) {
          await candidate.setText([
            `BalãoIndex [balao-host:${hostRemId}] [balao-root:${balloonRoot._id}]`,
          ]);
        }
        return;
      }

      // Migração da v0.5.5: somente os registros antigos continham referências
      // reais. Se houver duas referências correspondentes ao host e ao Balão,
      // reescrevemos como texto técnico e eliminamos os backlinks visíveis.
      const ids = await plugin.richText.getRemIdsFromRichText(candidate.text);
      if (ids.includes(hostRemId) && ids.includes(balloonRoot._id)) {
        await candidate.setText([
          `BalãoIndex [balao-host:${hostRemId}] [balao-root:${balloonRoot._id}]`,
        ]);
        return;
      }
    } catch {
      // Continua procurando outro registro interno.
    }
  }

  const link = await plugin.rem.createRem();
  if (!link) throw new Error('Não foi possível registrar o vínculo interno do Nota+.');

  // Importante: não usamos referências reais aqui. Os IDs são texto simples,
  // para que o índice não produza backlinks nem apareça como "Referência" no
  // REM original ou dentro do editor do Balão.
  await link.setText([
    `BalãoIndex [balao-host:${hostRemId}] [balao-root:${balloonRoot._id}]`,
  ]);
  await link.setParent(index._id);
  await link.setPracticeDirection('none');
  await link.setEnablePractice(false);
  await link.setIsCardItem(false);
  // Sem Power-Up: o próprio texto técnico identifica o registro do índice.
}

/**
 * Fonte de verdade do indicador lateral. O índice fica no banco do RemNote,
 * mas usa IDs como texto simples (sem referências/backlinks). Isso evita
 * poluição visual tanto no documento quanto no editor nativo do Balão.
 */
export async function getBalloonFromDatabaseLink(
  plugin: RNPlugin,
  hostRemId: string,
): Promise<{ rootId: string; count: number } | undefined> {
  try {
    const index = await findExistingIndexContainer(plugin);
    if (!index) return undefined;
    const children = await index.getChildrenRem();

    for (const candidate of children) {
      try {
        if (!candidate.text) continue;

        // v0.5.7: primeiro lemos diretamente o texto técnico do índice. Isso é
        // independente de Power-Ups e funciona de forma consistente entre o
        // popup e o widget lateral.
        const plain = await plugin.richText.toString(candidate.text);
        const parsed = parseInternalIndexText(plain);
        if (parsed?.hostRemId === hostRemId) {
          const root = await plugin.rem.findOne(parsed.rootId);
          if (!root) continue;
          const rootChildren = await root.getChildrenRem();
          return { rootId: parsed.rootId, count: rootChildren.length };
        }

        // Compatibilidade temporária com v0.5.5, antes de o Balão antigo ser
        // aberto e migrado para o formato sem referências.
        const ids = await plugin.richText.getRemIdsFromRichText(candidate.text);
        if (!ids.includes(hostRemId)) continue;
        const rootId = ids.find((id) => id !== hostRemId);
        if (!rootId) continue;
        const root = await plugin.rem.findOne(rootId);
        if (!root) continue;
        const rootChildren = await root.getChildrenRem();
        return { rootId, count: rootChildren.length };
      } catch {
        // Continua procurando outro registro válido.
      }
    }
  } catch (error) {
    console.warn('[Balão] Não foi possível consultar o índice interno.', error);
  }

  return undefined;
}

/**
 * Reaplica o pequeno Power-Up nativo "Balão" nos REMs que já possuem índice.
 * Esse marcador tem duas funções: indicar de forma persistente que o REM já foi
 * trabalhado e, no RemNote atual, garantir que a faixa nativa da direita seja
 * montada, permitindo que o widget de contagem apareça de modo estável.
 */
export async function repairPresenceMarkers(plugin: RNPlugin): Promise<void> {
  try {
    const index = await findExistingIndexContainer(plugin);
    if (!index) return;
    const children = await index.getChildrenRem();
    for (const candidate of children) {
      try {
        if (!candidate.text) continue;
        const plain = await plugin.richText.toString(candidate.text);
        const parsed = parseInternalIndexText(plain);
        if (parsed?.hostRemId) {
          await ensureHostPresenceMarker(plugin, parsed.hostRemId);
        }
      } catch {
        // Continua reparando os demais registros.
      }
    }
  } catch (error) {
    console.warn('[Balão] Não foi possível reparar os marcadores visuais.', error);
  }
}

async function hostLabel(plugin: RNPlugin, hostRemId: string) {
  const host = await plugin.rem.findOne(hostRemId);
  if (!host?.text) return 'REM';

  const plain = (await plugin.richText.toString(host.text)).replace(/\s+/g, ' ').trim();
  if (!plain) return 'REM sem texto';
  return plain.length > 90 ? `${plain.slice(0, 87)}…` : plain;
}

/**
 * Mantém o REM interno de contexto sincronizado com o REM original. Isso é
 * importante porque ele será mostrado DEPOIS que a resposta for revelada.
 * Copiamos o RichText completo (inclusive formatação/referências), sem truncar.
 */
async function syncBalloonContextFromHost(
  plugin: RNPlugin,
  hostRemId: string,
  balloonRoot: Rem,
): Promise<void> {
  const host = await plugin.rem.findOne(hostRemId);
  if (host?.text) {
    await balloonRoot.setText(host.text);
  } else {
    const label = await hostLabel(plugin, hostRemId);
    await balloonRoot.setText([label]);
  }

  await balloonRoot.setPracticeDirection('none');
  await balloonRoot.setEnablePractice(false);
  await balloonRoot.setIsCardItem(false);

  const hideContext = await getHideContextEnabled(plugin, hostRemId);
  if (hideContext) {
    await balloonRoot.addPowerup(BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    try {
      await balloonRoot.removePowerup(LEGACY_BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    } catch {
      // Migração silenciosa da v0.3.0.
    }
  } else {
    await balloonRoot.removePowerup(BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    try {
      await balloonRoot.removePowerup(LEGACY_BALLOON_HIDE_CONTEXT_POWERUP_CODE);
    } catch {
      // Sem ação.
    }
  }
}

/**
 * Retorna o documento mais próximo que contém o REM de origem.
 * Se o REM não estiver dentro de um documento formal, usa o ancestral mais alto
 * como fallback. O RemNote inclui na fila de um documento os cartões das Sources.
 */
export async function findOwningDocument(plugin: RNPlugin, hostRemId: string): Promise<Rem | undefined> {
  let current = await plugin.rem.findOne(hostRemId);
  if (!current) return undefined;

  let topmost: Rem = current;
  for (let i = 0; i < 100 && current; i += 1) {
    topmost = current;
    try {
      if (await current.isDocument()) return current;
    } catch {
      // Continua a subida mesmo se a checagem de tipo falhar em algum REM especial.
    }

    const parent = await current.getParentRem();
    if (!parent) break;
    current = parent;
  }

  return topmost;
}

/**
 * Faz o Balão participar da fila do documento original sem mover fisicamente
 * seus REMs para o documento. O próprio RemNote suporta Sources.
 */
export async function linkBalloonToOwningDocument(
  plugin: RNPlugin,
  hostRemId: string,
  balloonRoot: Rem,
): Promise<string | undefined> {
  const document = await findOwningDocument(plugin, hostRemId);
  if (!document || document._id === balloonRoot._id) return undefined;

  try {
    const sources = await document.getSources();
    const alreadyLinked = sources.some((source) => source._id === balloonRoot._id);
    if (!alreadyLinked) {
      await document.addSource(balloonRoot);
    }
    return document._id;
  } catch (error) {
    console.warn('[Balão] Não foi possível vincular o Balão como fonte do documento.', error);
    return undefined;
  }
}

export async function ensureBalloonRoot(
  plugin: RNPlugin,
  hostRemId: string,
): Promise<{ balloonRootId: string; owningDocumentId?: string; hideContext: boolean }> {
  let existingId = await getExistingBalloonRootId(plugin, hostRemId);

  // Nota+ 1.0: se o plugin for reinstalado e o plugin.storage não trouxer o
  // vínculo antigo, recuperamos o Balão pelo índice persistente salvo no próprio
  // banco do RemNote. Isso torna a migração localhost -> plugin permanente mais
  // segura e também protege futuras reinstalações.
  if (!existingId) {
    const indexed = await getBalloonFromDatabaseLink(plugin, hostRemId);
    if (indexed?.rootId) {
      existingId = indexed.rootId;
      await plugin.storage.setSynced(balloonKey(hostRemId), indexed.rootId);
    }
  }

  if (existingId) {
    const existingRoot = await plugin.rem.findOne(existingId);
    if (existingRoot) {
      await cleanupLegacyHostMarker(plugin, hostRemId);
      await ensureHostPresenceMarker(plugin, hostRemId);
      await ensureDatabaseLink(plugin, hostRemId, existingRoot);
      await syncBalloonContextFromHost(plugin, hostRemId, existingRoot);
      const owningDocumentId = await linkBalloonToOwningDocument(plugin, hostRemId, existingRoot);
      const hideContext = await getHideContextEnabled(plugin, hostRemId);
      const existingCount = (await existingRoot.getChildrenRem()).length;
      await broadcastBalloonState(plugin, hostRemId, existingId, existingCount);
      return { balloonRootId: existingId, owningDocumentId, hideContext };
    }
  }

  const vault = await ensureVault(plugin);
  const root = await plugin.rem.createRem();
  if (!root) throw new Error('Não foi possível criar o Nota+.');

  await root.setParent(vault._id);
  await cleanupLegacyHostMarker(plugin, hostRemId);
  await ensureHostPresenceMarker(plugin, hostRemId);
  await ensureDatabaseLink(plugin, hostRemId, root);
  await syncBalloonContextFromHost(plugin, hostRemId, root);
  await plugin.storage.setSynced(balloonKey(hostRemId), root._id);

  const owningDocumentId = await linkBalloonToOwningDocument(plugin, hostRemId, root);
  const hideContext = await getHideContextEnabled(plugin, hostRemId);
  // Este aviso é o que faz o indicador surgir imediatamente em um REM que ganhou
  // seu primeiro Balão durante a sessão, sem depender de F5/recarregamento.
  await broadcastBalloonState(plugin, hostRemId, root._id, 0);
  return { balloonRootId: root._id, owningDocumentId, hideContext };
}

export async function openBalloonForRem(plugin: RNPlugin, hostRemId: string) {
  try {
    const { balloonRootId, owningDocumentId, hideContext } = await ensureBalloonRoot(plugin, hostRemId);
    await plugin.widget.openPopup(
      'balloon_popup',
      { hostRemId, balloonRootId, owningDocumentId, hideContext },
      true,
    );
  } catch (error) {
    console.error('[Balão]', error);
    const message = error instanceof Error ? error.message : String(error);
    await plugin.app.toast(`Nota+: ${message.slice(0, 140) || 'não foi possível abrir esta nota.'}`);
  }
}
