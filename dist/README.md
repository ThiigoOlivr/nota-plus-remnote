# Nota+ 1.0 — RemNote Plugin

Plugin contextual para criar notas, flashcards, imagens e pegadinhas vinculados a qualquer REM sem poluir o documento principal.

## Identidade
- Nome visível: **Nota+**
- ID técnico preservado: `balao`
- Comando: `/nota` (procure por **Nota+**)
- Marcador no REM: **⚡ Nota+** + contador de itens

## Recursos estáveis
- Editor nativo do RemNote dentro do popup
- Flashcards no formato normal do RemNote (`pergunta >> resposta`)
- Flashcards do Nota+ entram na fila do documento de origem
- Ocultação do REM de origem antes de revelar a resposta
- REM de origem reaparece após revelar a resposta
- Modo **Criar pegadinha**
- Rolagem para conteúdos longos
- Marcador persistente **⚡ Nota+** com contador

## Instalação permanente
Use o arquivo `NotaPlus-PluginZip.zip` gerado pelo comando `npm run build` e, no RemNote, vá em **Settings > Plugins > Criar > Fazer upload de plugin**.

## Desenvolvimento futuro
Para testar alterações futuras, mantenha esta versão estável instalada e use uma cópia separada do código em modo de desenvolvimento.
