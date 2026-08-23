# Nota+ — RemNote Plugin

**Nota+** adiciona uma camada contextual a qualquer REM para criar notas, flashcards e conteúdo complementar sem poluir o documento principal.

## Recursos

- Editor nativo do RemNote dentro do Nota+
- Flashcards no fluxo normal do RemNote (`pergunta >> resposta`)
- Integração dos flashcards com a fila do documento de origem
- Ocultação do REM de origem antes de revelar a resposta
- Reexibição do contexto após mostrar a resposta
- Modo de criação de pegadinhas
- Marcador `Nota+` no REM com contador de itens
- Suporte ao conteúdo Rich Text do editor do RemNote
- Rolagem para conteúdos longos

## Estrutura do repositório

- `src/` — código-fonte TypeScript/React do plugin
- `public/manifest.json` — manifesto do plugin
- `dist/` — build compilado correspondente à versão 1.0.0
- `release/NotaPlus-PluginZip-v1.0.0.zip` — artefato de distribuição
- `webpack.config.js`, `tsconfig.json`, `postcss.config.js`, `tailwind.config.js` — configuração de compilação
- `package.json` — dependências e scripts do projeto

## Desenvolvimento

```bash
npm install
npm run dev
```

O projeto foi desenvolvido com o SDK oficial de plugins do RemNote.

## Build

O script padrão do projeto é:

```bash
npm run build
```

A pasta `dist/` e o arquivo em `release/` correspondem ao artefato da versão 1.0.0 enviado para revisão no RemNote.

## Privacidade

O Nota+ **não envia conteúdo do usuário para serviços, APIs ou servidores de terceiros**.  
O plugin opera dentro do ambiente do RemNote usando o SDK do RemNote e seu armazenamento sincronizado.

## Permissões

O plugin solicita acesso de leitura/criação/modificação/exclusão porque precisa:

- criar e manter os REMs internos usados pelos Nota+;
- vincular os flashcards ao documento de origem;
- aplicar/remover o marcador do Nota+;
- gerenciar a ocultação do contexto na fila;
- manter o índice interno que relaciona o REM de origem ao conteúdo do Nota+.

## Identidade

- Nome visível: **Nota+**
- ID técnico: `balao` (mantido por compatibilidade)
- Versão: **1.0.0**
- Repositório: https://github.com/ThiigoOlivr/nota-plus-remnote
