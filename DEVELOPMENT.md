# Desenvolvimento do Nota+

Este arquivo reúne informações técnicas destinadas ao desenvolvimento e à manutenção do plugin.

## Identidade técnica

- Nome visível: `Nota+`
- ID técnico persistente: `balao`
- Repositório: https://github.com/ThiigoOlivr/nota-plus-remnote

O ID `balao` deve ser preservado em futuras versões para manter compatibilidade com instalações e dados existentes.

## Estrutura

- `src/` — código-fonte TypeScript/React
- `public/manifest.json` — manifesto do plugin
- `public/logo.png` — identidade visual do Marketplace
- `dist/` — build de produção
- `release/` — ZIPs das versões publicadas

## Desenvolvimento local

```bash
npm install
npm run dev
```

Durante o desenvolvimento, mantenha o terminal aberto enquanto o RemNote utiliza o localhost.

## Build

```bash
npm run build
```

## Publicação

Antes de cada nova submissão:

1. aumentar a versão no `manifest.json` e no `package.json`;
2. preservar o ID `balao`;
3. conferir o `repoUrl`;
4. validar o manifesto em UTF-8 sem BOM;
5. gerar e testar o build;
6. publicar código-fonte e build no GitHub;
7. enviar o ZIP da nova versão ao RemNote.
