# Neruz Page View

Veja seu site em várias telas ao mesmo tempo e capture prints, vídeos e mockups. Grátis, código aberto e 100% local.

Extensão de navegador (Manifest V3) da família **Neruz**, para Chrome, Edge, Opera, Brave e Firefox. Interface em português, inglês e espanhol.

## O que faz

- **Várias telas lado a lado**: celulares, tablets, notebooks, desktops, TVs e dobráveis, com biblioteca de aparelhos, favoritos, kits e telas personalizadas.
- **Espelhamento**: rolagem, clique, navegação e digitação replicados em todas as telas.
- **Print**: modos Rápido, Experiência (espera as animações) e Momentos (um por seção), com ou sem moldura de aparelho.
- **Vídeo**: rolagem automática com pausas por seção, velocidade ao vivo, saída vertical 1080×1920 ou 16:9.
- **Várias páginas**: lista de URLs, sitemap ou links internos, com fila, ZIP organizado e relatório.
- **Exportação**: PNG, JPEG, WebP, PDF, MP4, WebM, GIF e ZIP.

Nada sai do seu computador: sem servidor, sem conta, sem coleta de dados. Veja a [política de privacidade](docs/PRIVACIDADE.md).

## Desenvolvimento

Requisitos: Node 22.23+ e pnpm 12.

```bash
pnpm install
pnpm dev:ext          # extensão em modo desenvolvimento (Chrome)
pnpm dev:landing      # landing em http://localhost:4321
pnpm build:ext        # gera apps/page-view/.output/chrome-mv3
pnpm build:ext:firefox
pnpm lint && pnpm typecheck && pnpm test
```

Para testar no navegador: `chrome://extensions` → modo do desenvolvedor → **Carregar sem compactação** → `apps/page-view/.output/chrome-mv3`.

## Estrutura

| Pasta              | Conteúdo                                    |
| ------------------ | ------------------------------------------- |
| `apps/page-view`   | Extensão (WXT + React + TypeScript)         |
| `apps/landing`     | Página de apresentação (Astro)              |
| `packages/core`    | Mensageria, armazenamento, lote e relatório |
| `packages/capture` | Captura de imagem e vídeo                   |
| `packages/devices` | Biblioteca de aparelhos                     |
| `packages/i18n`    | Traduções pt-BR, en, es                     |
| `packages/ui`      | Tokens e estilos compartilhados             |

Arquitetura, contratos e decisões: [docs/ARQUITETURA.md](docs/ARQUITETURA.md), [docs/API.md](docs/API.md), [docs/DECISOES.md](docs/DECISOES.md).

## Licença

[MIT](LICENSE).

---

Desenvolvido por [Fonte Dev · Bruno Lucas](https://fontedev.com).
