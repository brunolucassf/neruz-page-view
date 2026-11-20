import type { LandingCopy } from './types';

export const pt: LandingCopy = {
  locale: 'pt-BR',
  htmlLang: 'pt-BR',
  path: '/',
  meta: {
    title: 'Neruz Page View: veja seu site em várias telas e capture',
    description:
      'Teste seu site em várias telas ao mesmo tempo e capture prints, vídeos e mockups. Extensão gratuita, de código aberto e 100% local: sem conta, sem coleta.',
    ogDescription:
      'Veja seu site em várias telas e capture prints, vídeos e mockups. Grátis, aberto e 100% local.',
  },
  skipLink: 'Pular para o conteúdo',
  languageLabel: 'Mudar idioma',
  languageNames: { 'pt-BR': 'Português', en: 'English', es: 'Español' },
  header: {
    signature: 'por Fonte Dev',
    signatureLabel: 'Site da Fonte Dev (abre em nova aba)',
    signatureLogoAlt: 'Fonte Dev',
  },
  language: { current: 'Idioma atual: {idioma}', short: 'PT', selected: 'selecionado' },
  common: { newTab: '(abre em nova aba)' },
  github: 'GitHub',
  brandEyebrow: 'Neruz / Page View',
  cta: {
    addTo: {
      chrome: 'Adicionar ao Chrome',
      edge: 'Adicionar ao Edge',
      firefox: 'Adicionar ao Firefox',
      brave: 'Adicionar ao Brave',
      opera: 'Adicionar ao Opera',
    },
    chooseBrowser: 'Escolha seu navegador',
    alsoFor: 'Também para:',
    browserNotes: {
      brave: 'O Brave instala direto pela Chrome Web Store.',
      opera: 'No Opera, ative antes o complemento oficial Install Chrome Extensions.',
    },
    mobileInstall: 'Abra no computador para instalar',
    copyLink: 'Copiar link',
    linkCopied: 'Link copiado',
    share: 'Compartilhar',
    viewCode: 'Ver o código no GitHub',
    support: 'Grátis, código aberto (MIT) e sem criar conta.',
  },
  hero: {
    title: 'Veja seu site em várias telas ao mesmo tempo.',
    subtitle:
      'Teste o responsivo, tire prints com moldura de aparelho e grave vídeos que rolam a página sozinhos. Uma extensão gratuita e de código aberto que roda só no seu computador.',
    posterAlt: 'Um site exibido ao mesmo tempo em celular, tablet e notebook',
    windowWidthLabel: 'Largura da janela',
    skipIntro: 'Pular entrada',
  },
  sceneOneClick: {
    stepLabel: 'Print',
    title: 'Dois cliques e o print já sai pronto para mostrar.',
    subtitle:
      'Clique no ícone e o Estúdio abre na página que você está vendo; com "Print com moldura" ligado, Capturar entrega a página inteira dentro de uma moldura de aparelho. O modo Experiência espera as animações aparecerem antes de capturar, para nada sair pela metade.',
    before: 'Antes: print comum',
    after: 'Depois: página inteira, com moldura',
    compareLabel: 'Comparar antes e depois',
    backgroundLabel: 'Cor do fundo do print',
    backgrounds: ['Fundo grafite', 'Fundo claro', 'Fundo terracota'],
  },
  studioArt: {
    title: 'Estúdio',
    captureTitle: 'Captura',
    modeLabel: 'Modo',
    modes: ['Rápido', 'Experiência', 'Momentos'],
    framedLabel: 'Print com moldura',
    captureLabel: 'Capturar',
  },
  sceneDevices: {
    stepLabel: 'Telas',
    title: 'Role uma tela. Todas rolam junto.',
    subtitle:
      'Rolagem, cliques, navegação e digitação se repetem em todas as telas. Comece pelo kit Essenciais, com 12 tamanhos, ou monte o seu entre cerca de 45 aparelhos. Gire, redimensione arrastando e confira as larguras na régua. Funciona com localhost.',
    note: 'As telas são simuladas pelo tamanho no seu navegador: o iPhone aqui é o seu navegador no tamanho do iPhone, não o Safari.',
    names: ['Celular', 'Dobrável', 'Tablet', 'Notebook', 'Monitor'],
  },
  sceneAuto: {
    stepLabel: 'Vídeo',
    title: 'A página rola sozinha. Você só aperta Gravar.',
    subtitle:
      'A extensão encontra as seções da página e faz uma pausa em cada uma. Escolha a tela, ajuste a velocidade e salve em vertical 1080×1920, o formato de Reels e Shorts, ou em 16:9.',
    note: 'MP4, WebM ou GIF · Cursor opcional · No Firefox, o navegador pergunta qual aba gravar antes de começar.',
    recording: 'Gravando {time}',
    sections: ['Início', 'Cardápio', 'Sobre', 'Rodapé'],
  },
  ruler: {
    label: 'Ir para a seção',
    counter: 'Cena {n} de {total}',
    scenes: [
      { id: 'inicio', label: 'Veja seu site em várias telas ao mesmo tempo.' },
      { id: 'um-clique', label: 'Dois cliques e o print já sai pronto para mostrar.' },
      { id: 'role-uma-tela', label: 'Role uma tela. Todas rolam junto.' },
      { id: 'pagina-rola-sozinha', label: 'A página rola sozinha. Você só aperta Gravar.' },
    ],
  },
  footer: {
    navLabel: 'Rodapé',
    product: {
      title: 'Produto',
      installTitle: 'Instalar no navegador',
      comingSoon: 'Chegando às lojas',
    },
    project: {
      title: 'Projeto',
      github: 'Código no GitHub',
      license: 'Licença MIT',
      issue: 'Reportar um problema',
    },
    privacy: 'Política de privacidade',
    umbrella: 'Neruz Extensions',
    umbrellaText:
      'Extensões de navegador feitas por Bruno Lucas para quem cria e mostra sites. A Page View é a primeira.',
    studio: {
      title: 'Fonte Dev',
      text: 'A Fonte Dev, de Bruno Lucas, cria sites e experiências digitais sob medida, do primeiro movimento ao último detalhe.',
      cta: 'Conheça a Fonte Dev',
      ctaLabel: 'Conheça a Fonte Dev (abre em nova aba)',
    },
    credit: 'Desenvolvido por Fonte Dev · Bruno Lucas',
  },
  forno: {
    brand: 'Forno 27',
    nav: {
      home: 'Início',
      menu: 'Cardápio',
      about: 'Sobre',
      contact: 'Contato',
      toggle: 'Abrir menu',
    },
    hero: {
      title: 'Pão quente desde cedo',
      subtitle: 'Fermentação lenta, forno de pedra e fornadas pequenas ao longo do dia.',
      cta: 'Ver o cardápio',
    },
    menu: {
      title: 'Do forno hoje',
      more: 'Ver tudo',
      items: [
        {
          name: 'Pão de fermentação natural',
          desc: 'Casca crocante, miolo aberto.',
          price: 'R$ 1,23',
        },
        { name: 'Croissant de manteiga', desc: 'Folhado em camadas finas.', price: 'R$ 4,56' },
        { name: 'Pão de queijo', desc: 'Receita mineira, direto do forno.', price: 'R$ 7,89' },
        { name: 'Bolo de laranja', desc: 'Calda fina, fatia generosa.', price: 'R$ 9,87' },
      ],
    },
    about: {
      title: 'Sobre a casa',
      body: 'O Forno 27 começou com uma receita de família e um forno pequeno demais. Hoje o forno é maior, a receita é a mesma.',
    },
    footerNote: 'Forno 27 é uma padaria fictícia, criada para esta demonstração.',
    url: 'forno27.example',
    regionLabel: 'Site de demonstração fictício: padaria Forno 27',
  },
};
