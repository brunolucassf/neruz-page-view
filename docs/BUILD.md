# Build reproduzível

Como gerar, a partir do código-fonte, os pacotes da extensão (Chromium e Firefox) e a landing. Serve para a revisão da AMO (ADR-013 e ARQUITETURA §11) e para qualquer pessoa que queira conferir o que está publicado.

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Node.js | 24.x (mínimo 22.23.4) | Exigido pelo Astro 7 e pelo WXT 0.21 |
| pnpm | 12.21.0 | Fixado no campo `packageManager` do `package.json` raiz |

Com Corepack: `corepack enable` e, na raiz, `pnpm --version` deve mostrar `12.21.0`. Sem Corepack: `npm i -g pnpm@12.21.0`.

## Passo a passo

Na raiz do repositório:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm lint
pnpm typecheck
pnpm test
pnpm build:ext
pnpm build:ext:firefox
pnpm build:landing
```

- `--frozen-lockfile` falha se o `pnpm-lock.yaml` não bater com os `package.json`. Não remova esse flag na revisão.
- `--ignore-scripts` impede scripts de instalação de terceiros. O `pnpm-workspace.yaml` também bloqueia scripts de dependências (`onlyBuiltDependencies` vazio).
- Versões são exatas (sem `^` ou `~`, via `save-exact=true` no `.npmrc`).
- Dependências com menos de 7 dias de publicação são recusadas (`minimumReleaseAge: 10080`, regra de segurança 14).

## Saídas

| Comando | Saída |
|---|---|
| `pnpm build:ext` | `apps/page-view/.output/chrome-mv3/` (Chrome, Edge, Opera, Brave) |
| `pnpm build:ext:firefox` | `apps/page-view/.output/firefox-mv3/` (Firefox) |
| `pnpm build:landing` | `apps/landing/dist/` (HTML estático, sem Node em produção) |

Os manifestos gerados ficam em `manifest.json` de cada pasta. O Chromium usa `service_worker`, o Firefox usa `background.scripts` (event page).

## Pacote para revisão (AMO)

1. Gere o código-fonte limpo a partir do commit a ser enviado: `git archive --format=zip -o <caminho-fora-do-repo>/neruz-page-view-fonte.zip HEAD`.
2. Inclua na revisão este arquivo e a instrução de build acima.
3. Reviewer: descompacte em pasta nova e vazia, rode os comandos do passo a passo e compare o resultado com o pacote enviado.

O que o revisor precisa saber: o build não baixa nada em tempo de build e não depende de servidor. A única variável é `WXT_GA_API_SECRET` (chave do Measurement Protocol do GA4, em `.env`, fora do git; veja `apps/page-view/.env.example`). Sem ela, o código gerado é o mesmo, com a estatística de uso desligada.

## Limites conhecidos

- Testes e2e (Playwright) e `web-ext lint` ainda não estão instalados. Entram com as features (ADR-009).
- O `gecko.id` (`neruz-page-view@fontedev.com`) e o `strict_min_version` (128.0) são provisórios até confirmação de Bruno.
- Fontes Sora e Inter ainda não estão auto-hospedadas. Os tokens usam fallback do sistema até o kit chegar.
