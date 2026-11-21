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
  sceneFolder: {
    stepLabel: 'Várias páginas',
    title: 'O site inteiro, numa pasta só.',
    subtitle:
      'Cole uma lista de endereços, use o sitemap ou deixe a extensão seguir os links internos. As páginas são capturadas em fila e, no fim, você baixa um ZIP organizado com um relatório do que foi feito.',
    note: 'Você vê o limite de páginas antes de começar, acompanha o progresso e pode cancelar quando quiser. O relatório traz só fatos: o que foi capturado, o que foi pulado e por quê.',
    urlListLabel: 'Lista de páginas',
    exampleTag: 'exemplo',
    counter: 'Página {n} de {total}',
    folderName: 'forno27.zip',
    reportTitle: 'Relatório',
    reportLines: [
      '4 páginas capturadas',
      '0 páginas puladas',
      'Tela: Celular · 390 px',
      'Rolagem lateral: nenhuma',
    ],
    pages: [
      {
        title: 'Forno 27',
        line: 'Pão quente, fornadas pequenas, todo dia.',
        url: 'forno27.example',
      },
      {
        title: 'Cardápio',
        line: 'Pães, folhados e bolos que saem ao longo do dia.',
        url: 'forno27.example/cardapio',
      },
      {
        title: 'Sobre',
        line: 'Uma receita de família, agora num forno maior.',
        url: 'forno27.example/sobre',
      },
      {
        title: 'Contato',
        line: 'Padaria de demonstração: sem endereço nem telefone.',
        url: 'forno27.example/contato',
      },
    ],
    visualLabel:
      'Exemplo com uma padaria fictícia: quatro páginas são capturadas uma depois da outra e vão para um ZIP, junto com o relatório.',
  },
  sceneLocal: {
    stepLabel: 'Privacidade',
    title: 'Tudo acontece no seu computador.',
    subtitle:
      'A extensão não tem servidor, não pede cadastro e não coleta dados. Seus prints e vídeos são criados no navegador e vão só para onde você salvar.',
    note: 'Prints podem mostrar o que estiver na tela, como e-mails ou painéis logados. Vale conferir antes de compartilhar.',
    privacyLink: 'Ler a política de privacidade',
    codeLink: 'Ver as permissões no código',
    whenLabel: 'Quando é pedida',
    laptopLabel:
      'Ilustração: a janela, o celular e a tira de prints das cenas anteriores ficam dentro do contorno de um notebook.',
    cards: [
      {
        permission: 'storage',
        title: 'Guardar suas preferências',
        what: 'Salva kits, favoritos e configurações no próprio navegador.',
        when: 'Na instalação',
      },
      {
        permission: 'activeTab + scripting',
        title: 'Usar a aba que você está vendo',
        what: 'Ao clicar no ícone, a extensão acessa só a aba atual para tirar o print ou acompanhar a rolagem.',
        when: 'Na instalação, usada só quando você clica',
      },
      {
        permission: 'acesso por site · opcional',
        title: 'Mostrar um site nas telas',
        what: 'Você libera site por site e pode revogar quando quiser em Configurações.',
        when: 'Na hora, só para o site que você abrir',
      },
      {
        permission: 'declarativeNetRequestWithHostAccess',
        title: 'Abrir sites que bloqueiam exibição',
        what: 'Muitos sites não aceitam aparecer dentro de outra página. A extensão ajusta isso só nas telas dela, só nos sites que você liberou, e desfaz ao fechar.',
        when: 'Na instalação, age só nos sites liberados',
      },
      {
        permission: 'offscreen',
        title: 'Montar vídeos sem travar',
        what: 'Uma página invisível da própria extensão monta vídeos e imagens enquanto você segue usando a janela.',
        when: 'Na instalação',
      },
      {
        permission: 'tabCapture · opcional',
        title: 'Gravar a aba',
        what: 'Necessária para gravar vídeo. Um indicador fica visível o tempo todo.',
        when: 'Só na primeira gravação',
      },
      {
        permission: 'clipboardWrite · opcional',
        title: 'Copiar a imagem',
        what: 'Coloca o print na área de transferência para você colar onde quiser.',
        when: 'Só quando você usa Copiar',
      },
    ],
  },
  sceneOpen: {
    stepLabel: 'Código aberto',
    title: 'Gratuito, de código aberto e aberto a quem quiser ajudar.',
    subtitle:
      'O Neruz Page View usa a licença MIT: você pode ler cada linha, relatar um problema, sugerir uma melhoria ou adaptar para o seu uso. Não existe versão paga nem plano Pro.',
    ask: 'Se a extensão te ajudar, uma estrela no GitHub faz ela chegar a mais gente.',
    umbrella: 'É a primeira extensão da Neruz Extensions. Outras estão a caminho.',
    contribute: 'Como contribuir',
    license: 'Licença MIT',
    codeLabel: 'Trecho do código SVG que desenha o símbolo do Neruz Page View',
    outlineWord: 'Neruz Extensions',
  },
  sceneFinal: {
    stepLabel: 'Instalar',
    title: 'Experimente no próximo site que você abrir.',
    subtitle:
      'Grátis, sem cadastro e sem coleta de dados. Se não servir para você, é só remover, como qualquer extensão.',
    windowTitle: 'Neruz Page View',
    widthLabel: 'Largura da janela',
  },
  ruler: {
    label: 'Ir para a seção',
    counter: 'Cena {n} de {total}',
    scenes: [
      { id: 'inicio', label: 'Veja seu site em várias telas ao mesmo tempo.' },
      { id: 'um-clique', label: 'Dois cliques e o print já sai pronto para mostrar.' },
      { id: 'role-uma-tela', label: 'Role uma tela. Todas rolam junto.' },
      { id: 'pagina-rola-sozinha', label: 'A página rola sozinha. Você só aperta Gravar.' },
      { id: 'site-numa-pasta', label: 'O site inteiro, numa pasta só.' },
      { id: 'tudo-no-computador', label: 'Tudo acontece no seu computador.' },
      { id: 'codigo-aberto', label: 'Gratuito, de código aberto e aberto a quem quiser ajudar.' },
      { id: 'instalar', label: 'Experimente no próximo site que você abrir.' },
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
    contact: {
      line: 'Padaria de demonstração: sem endereço nem telefone.',
      cards: [
        'Pão quente, fornadas pequenas, todo dia.',
        'Pães, folhados e bolos que saem ao longo do dia.',
        'Uma receita de família, agora num forno maior.',
      ],
    },
    footerNote: 'Forno 27 é uma padaria fictícia, criada para esta demonstração.',
    url: 'forno27.example',
    regionLabel: 'Site de demonstração fictício: padaria Forno 27',
  },
};
