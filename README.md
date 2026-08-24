# Nota+ — RemNote Plugin

Nota+ adiciona uma camada contextual a qualquer REM para criar notas, flashcards e conteúdo complementar sem poluir o documento principal.

## Versão atual
**1.0.2**

## Recursos
- Editor nativo do RemNote dentro do Nota+
- Flashcards no fluxo normal do RemNote (`pergunta >> resposta`)
- Integração dos flashcards com a fila do documento de origem
- Ocultação do REM de origem antes de revelar a resposta
- Reexibição do contexto após mostrar a resposta
- Modo de criação de pegadinhas
- Marcador Nota+ no REM com contador de itens
- Suporte ao Rich Text do RemNote
- Rolagem para conteúdos longos

## Estrutura
- `src/` — código-fonte TypeScript/React
- `public/manifest.json` — manifesto 1.0.2
- `dist/` — build 1.0.2
- `release/NotaPlus-PluginZip-v1.0.2.zip` — artefato enviado para revisão
- `package.json` — dependências e scripts

## Desenvolvimento
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Privacidade
O Nota+ não envia conteúdo do usuário para serviços, APIs ou servidores de terceiros.

## Identidade
- Nome: **Nota+**
- ID técnico: `balao`
- Versão: **1.0.2**
- Repositório: https://github.com/ThiigoOlivr/nota-plus-remnote


## Correção 1.0.2

- Corrige o carregamento do CSS dos widgets na versão publicada/Marketplace.
- O build de produção usa `MiniCssExtractPlugin`, que gera CSS separado do JavaScript.
- `index.html` agora carrega explicitamente `<widget>-sandbox.css` antes do JavaScript do widget.
- Atualiza o selo visual do popup para 1.0.2.
