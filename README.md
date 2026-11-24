<p align="center">
  <b>🇧🇷 Português</b> · <a href="README.en.md">🇺🇸 English</a> · <a href="README.es.md">🇪🇸 Español</a>
</p>

<p align="center">
  <img src="docs/assets/banner.svg" alt="Neruz Page View: seu site em várias telas ao mesmo tempo" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img src="docs/assets/badges.svg" alt="Licença MIT · Manifest V3 · Chrome, Edge, Opera, Brave e Firefox · Estatística anônima de uso" width="640"></a>
</p>

<p align="center">
  <a href="https://pageview.neruz.tech"><b>Site</b></a> ·
  <a href="#instalar">Instalar</a> ·
  <a href="#como-funciona">Como funciona</a> ·
  <a href="#para-quem-é">Cenários</a> ·
  <a href="#privacidade-e-permissões">Privacidade</a> ·
  <a href="#desenvolvimento">Desenvolvimento</a>
</p>

---

**Neruz Page View** junta numa extensão só o que hoje pede três ou quatro: ver um site em vários tamanhos de tela lado a lado, navegar em todos ao mesmo tempo e sair com print, vídeo ou mockup pronto para mostrar ao cliente ou postar.

É **gratuita para sempre**, **código aberto (MIT)** e roda **100% no seu computador**. Sem conta, sem servidor e sem versão paga escondida.

<p align="center">
  <img src="docs/assets/estudio.png" alt="Estúdio do Neruz Page View com um site aberto em celular, tablet e notebook" width="100%">
</p>

## Instalar

| Navegador            | Onde                                         |
| -------------------- | -------------------------------------------- |
| Chrome, Brave, Opera | Chrome Web Store (em análise, link em breve) |
| Edge                 | Edge Add-ons (em breve)                      |
| Firefox 128+         | Firefox Add-ons (em breve)                   |

### Versão de teste, já disponível

1. Baixe o arquivo: **[Chrome, Edge, Brave e Opera](../../releases/download/v1.0.0-beta.1/neruz-page-view-1.0.0-chrome.zip)** ou **[Firefox](../../releases/download/v1.0.0-beta.1/neruz-page-view-1.0.0-firefox.zip)**.
2. Descompacte o `.zip` numa pasta que você não vá apagar.
3. **Chrome/Edge/Brave/Opera:** abra `chrome://extensions` (no Edge, `edge://extensions`), ligue o **Modo do desenvolvedor** e clique em **Carregar sem compactação**, escolhendo a pasta.
   **Firefox:** abra `about:debugging#/runtime/this-firefox`, clique em **Carregar extensão temporária** e escolha o `manifest.json` da pasta.
4. Fixe o ícone pela peça de quebra-cabeça ao lado da barra de endereço e clique nele (ou `Alt+Shift+P`) em qualquer site para abrir o **Estúdio**.

Todas as versões: [Releases](../../releases).

## Como funciona

1. **Abra o Estúdio** a partir de qualquer aba. A página aparece em um kit inicial de telas.
2. **Monte suas telas**: 46 aparelhos na biblioteca (celular, dobrável, tablet, notebook, desktop, TV), favoritos, kits salvos e telas com o tamanho que você quiser. Gire, redimensione arrastando, ajuste o zoom ou use **Caber**.
3. **Navegue em todas de uma vez**: com **Espelhar** ligado, rolagem, cliques, navegação e digitação feitos numa tela se repetem nas outras.
4. **Capture**:
   - **Print**: _Rápido_ (como está), _Experiência_ (espera as animações de scroll terminarem) ou _Momentos_ (um print por seção). Da tela ativa, de todas ou de várias páginas.
   - **Print com moldura**: o print sai dentro de uma moldura de aparelho com fundo escolhido. A moldura aparece ao vivo na tela ativa antes de capturar.
   - **Vídeo**: a página rola sozinha, pausa em cada seção e sai em vertical 1080×1920, quadrado, 16:9 ou no tamanho da tela. Uma mini barra controla pausa e velocidade durante a gravação.
   - **Várias páginas**: lista de URLs, sitemap ou links internos, em fila, com ZIP organizado e relatório HTML.
5. **Exporte** em PNG, JPEG, WebP, PDF, MP4, WebM, GIF ou ZIP.

## Para quem é

- **Dev front-end**: conferir o responsivo de uma vez, achar rolagem lateral (a extensão avisa) e testar `localhost`.
- **Designer**: revisar a hierarquia em vários tamanhos e gerar mockups sem abrir outro programa.
- **Agência e freelancer**: entregar ao cliente prints com moldura e um relatório de capturas de todas as páginas.
- **Social media e quem não é técnico**: transformar um site em vídeo vertical para Reels e Stories em dois cliques.

## Privacidade e permissões

Prints, vídeos e páginas visualizadas não saem do seu computador. A extensão não tem servidor próprio e não pede conta. Ela envia estatística anônima de uso ao Google Analytics 4: um identificador aleatório, a versão e quais ferramentas foram usadas, sem endereço de página, conteúdo nem capturas. Dá para desligar nas opções (no Firefox, só envia se você aceitar a permissão opcional). Configurações ficam no armazenamento local do navegador. Política completa: [pt-BR](docs/PRIVACIDADE.md) · [en](docs/PRIVACIDADE.en.md) · [es](docs/PRIVACIDADE.es.md).

| Permissão                                  | Para quê                                                                                                        |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `activeTab`, `scripting`                   | Ler a página que você abriu no Estúdio e espelhar as ações entre as telas                                       |
| `declarativeNetRequestWithHostAccess`      | Permitir que sites apareçam dentro das telas do Estúdio. Vale só para as abas do Estúdio e é desfeito ao fechar |
| `storage`                                  | Guardar suas telas, kits e preferências localmente                                                              |
| `offscreen`                                | Gravar o vídeo em segundo plano (Chromium)                                                                      |
| Acesso a sites (opcional)                  | Pedido site a site, só quando você abre aquele site no Estúdio                                                  |
| `tabCapture`, `clipboardWrite` (opcionais) | Gravar vídeo e copiar o print, pedidos só no primeiro uso                                                       |

## Desenvolvimento

Requisitos: Node 22.23+ e pnpm 12.

```bash
pnpm install
pnpm dev:ext            # extensão em modo desenvolvimento (Chrome)
pnpm dev:landing        # site em http://localhost:4321
pnpm build:ext          # apps/page-view/.output/chrome-mv3
pnpm build:ext:firefox  # apps/page-view/.output/firefox-mv3
pnpm lint && pnpm typecheck && pnpm test
```

| Pasta              | Conteúdo                                               |
| ------------------ | ------------------------------------------------------ |
| `apps/page-view`   | Extensão (WXT, React, TypeScript)                      |
| `apps/landing`     | Site de apresentação (Astro)                           |
| `packages/core`    | Mensageria, armazenamento, fila de páginas e relatório |
| `packages/capture` | Captura de imagem e gravação de vídeo                  |
| `packages/devices` | Biblioteca de aparelhos                                |
| `packages/i18n`    | Traduções pt-BR, en, es                                |
| `packages/ui`      | Design tokens, molduras e componentes                  |

Arquitetura, contratos internos e decisões: [ARQUITETURA](docs/ARQUITETURA.md) · [API](docs/API.md) · [DECISÕES](docs/DECISOES.md) · [DESIGN SYSTEM](docs/DESIGN-SYSTEM.md).

## Contribuir

Issues e pull requests são bem-vindos. Antes de abrir um PR, rode `pnpm lint && pnpm typecheck && pnpm test`. Para mudanças grandes, abra uma issue primeiro para conversarmos.

## Licença

[MIT](LICENSE). Use, estude, modifique e distribua à vontade, inclusive em projetos comerciais, mantendo o aviso de copyright.

## Família Neruz

O Page View é a primeira extensão da **Neruz Extensions**, uma família de ferramentas para quem constrói na web. Mais em breve em [neruz.tech](https://neruz.tech).

---

<p align="center">
  <a href="https://fontedev.com/links/"><img src="docs/assets/fonte-dev.svg" alt="Desenvolvido por Fonte Dev · Bruno Lucas. Conheça em fontedev.com/links" width="100%"></a>
</p>
