import type { LandingCopy } from './types';

export const en: LandingCopy = {
  locale: 'en',
  htmlLang: 'en',
  path: '/en/',
  meta: {
    title: 'Neruz Page View: free responsive viewer and screenshots',
    description:
      'Preview your site on many screen sizes at once. Capture screenshots, scroll videos and mockups. Free, open source extension: 100% local, no tracking.',
    ogDescription:
      'See your site on many screens and capture screenshots, videos and mockups. Free, open and 100% local.',
  },
  skipLink: 'Skip to content',
  languageLabel: 'Change language',
  languageNames: { 'pt-BR': 'Português', en: 'English', es: 'Español' },
  header: {
    signature: 'by Fonte Dev',
    signatureLabel: 'Fonte Dev website (opens in a new tab)',
    signatureLogoAlt: 'Fonte Dev',
  },
  language: { current: 'Current language: {idioma}', short: 'EN', selected: 'selected' },
  common: { newTab: '(opens in a new tab)' },
  github: 'GitHub',
  brandEyebrow: 'Neruz / Page View',
  cta: {
    addTo: {
      chrome: 'Add to Chrome',
      edge: 'Add to Edge',
      firefox: 'Add to Firefox',
      brave: 'Add to Brave',
      opera: 'Add to Opera',
    },
    chooseBrowser: 'Choose your browser',
    alsoFor: 'Also for:',
    browserNotes: {
      brave: 'Brave installs straight from the Chrome Web Store.',
      opera: 'In Opera, first turn on the official Install Chrome Extensions add-on.',
    },
    mobileInstall: 'Open this on your computer to install',
    copyLink: 'Copy link',
    linkCopied: 'Link copied',
    share: 'Share',
    viewCode: 'View the code on GitHub',
    support: 'Free, open source (MIT), no account needed.',
  },
  hero: {
    title: 'Your site on many screens, all at once.',
    subtitle:
      'Test responsive layouts, grab screenshots in device frames and record videos that scroll the page for you. One free, open source extension that runs entirely on your computer.',
    posterAlt: 'A website shown at once on phone, tablet and laptop',
    windowWidthLabel: 'Window width',
    skipIntro: 'Skip intro',
  },
  sceneOneClick: {
    stepLabel: 'Screenshot',
    title: 'Two clicks, and your screenshot is ready to share.',
    subtitle:
      'Click the icon and the Studio opens on the page you\'re viewing; with "Framed screenshot" on, Capture gives you the whole page inside a device frame. Experience mode waits for scroll animations to show up before capturing, so nothing comes out half-loaded.',
    before: 'Before: plain screenshot',
    after: 'After: full page, framed',
    compareLabel: 'Compare before and after',
    backgroundLabel: 'Screenshot background color',
    backgrounds: ['Graphite background', 'Light background', 'Terracotta background'],
  },
  studioArt: {
    title: 'Studio',
    captureTitle: 'Capture',
    modeLabel: 'Mode',
    modes: ['Quick', 'Experience', 'Moments'],
    framedLabel: 'Framed screenshot',
    captureLabel: 'Capture',
  },
  sceneDevices: {
    stepLabel: 'Screens',
    title: 'Scroll one screen. They all follow.',
    subtitle:
      'Scrolling, clicks, navigation and typing are mirrored on every screen. Start with the Essentials kit of 12 sizes, or build your own from about 45 devices. Rotate, drag to resize and check widths on the ruler. Works with localhost.',
    note: 'Screens are simulated by size in your browser: the iPhone here is your browser at iPhone size, not Safari.',
    names: ['Phone', 'Foldable', 'Tablet', 'Laptop', 'Monitor'],
  },
  sceneAuto: {
    stepLabel: 'Video',
    title: 'The page scrolls itself. You just hit Record.',
    subtitle:
      'The extension finds the sections on the page and pauses on each one. Pick a screen, set the speed and export in vertical 1080×1920, the Reels and Shorts format, or in 16:9.',
    note: 'MP4, WebM or GIF · Optional cursor · In Firefox, the browser asks which tab to record before you start.',
    recording: 'Recording {time}',
    sections: ['Home', 'Menu', 'About', 'Footer'],
  },
  sceneFolder: {
    stepLabel: 'Multiple pages',
    title: 'The whole site, in one folder.',
    subtitle:
      'Paste a list of URLs, use the sitemap or let the extension follow internal links. Pages are captured one by one, and at the end you download a tidy ZIP with a report of what was done.',
    note: 'You see the page limit before starting, follow the progress and can cancel anytime. The report sticks to facts: what was captured, what was skipped and why.',
    urlListLabel: 'Page list',
    exampleTag: 'example',
    counter: 'Page {n} of {total}',
    folderName: 'forno27.zip',
    reportTitle: 'Report',
    reportLines: [
      '4 pages captured',
      '0 pages skipped',
      'Screen: Phone · 390 px',
      'Horizontal scroll: none',
    ],
    pages: [
      { title: 'Forno 27', line: 'Warm bread, small batches, every day.', url: 'forno27.example' },
      {
        title: 'Menu',
        line: 'Breads, pastries and cakes, baked through the day.',
        url: 'forno27.example/menu',
      },
      {
        title: 'About',
        line: 'A family recipe, now in a bigger oven.',
        url: 'forno27.example/about',
      },
      {
        title: 'Contact',
        line: 'A demo bakery: no address, no phone.',
        url: 'forno27.example/contact',
      },
    ],
    visualLabel:
      'Example with a fictional bakery: four pages are captured one after another and go into a ZIP, along with the report.',
  },
  sceneLocal: {
    stepLabel: 'Privacy',
    title: 'Everything happens on your computer.',
    subtitle:
      'The extension has no server, asks for no sign-up and collects no data. Your screenshots and videos are made in the browser and go only where you save them.',
    note: 'Screenshots can show whatever is on screen, like emails or logged-in dashboards. Worth a quick check before sharing.',
    privacyLink: 'Read the privacy policy',
    codeLink: 'See the permissions in the code',
    whenLabel: "When it's requested",
    laptopLabel:
      'Illustration: the window, the phone and the screenshot strip from the earlier scenes sit inside the outline of a laptop.',
    cards: [
      {
        permission: 'storage',
        title: 'Remember your settings',
        what: 'Saves kits, favorites and preferences in your own browser.',
        when: 'On install',
      },
      {
        permission: 'activeTab + scripting',
        title: "Work with the tab you're on",
        what: 'When you click the icon, the extension reaches only the current tab to take the screenshot or follow the scroll.',
        when: 'On install, used only when you click',
      },
      {
        permission: 'per-site access · optional',
        title: 'Show a site on the screens',
        what: 'You allow one site at a time and can revoke it anytime in Settings.',
        when: 'When needed, only for the site you open',
      },
      {
        permission: 'declarativeNetRequestWithHostAccess',
        title: 'Open sites that block embedding',
        what: 'Many sites refuse to appear inside another page. The extension adjusts this only in its own screens, only on sites you allowed, and undoes it when you close them.',
        when: 'On install, acts only on allowed sites',
      },
      {
        permission: 'offscreen',
        title: 'Build videos without freezing',
        what: 'A hidden page inside the extension puts videos and images together while you keep working.',
        when: 'On install',
      },
      {
        permission: 'tabCapture · optional',
        title: 'Record the tab',
        what: 'Needed to record video. A recording indicator stays visible the whole time.',
        when: 'Only on your first recording',
      },
      {
        permission: 'clipboardWrite · optional',
        title: 'Copy the image',
        what: 'Puts the screenshot on your clipboard so you can paste it anywhere.',
        when: 'Only when you use Copy',
      },
    ],
  },
  sceneOpen: {
    stepLabel: 'Open source',
    title: 'Free, open source and open to anyone who wants to help.',
    subtitle:
      "Neruz Page View is MIT licensed: read every line, report a bug, suggest an improvement or adapt it to your needs. There's no paid version and no Pro plan.",
    ask: 'If it helps you, a star on GitHub helps other people find it.',
    umbrella: 'This is the first extension from Neruz Extensions. More are on the way.',
    contribute: 'How to contribute',
    license: 'MIT license',
    codeLabel: 'A snippet of the SVG code that draws the Neruz Page View symbol',
    outlineWord: 'Neruz Extensions',
  },
  sceneFinal: {
    stepLabel: 'Install',
    title: 'Try it on the next site you open.',
    subtitle:
      "Free, no sign-up, no data collected. If it's not for you, just remove it like any other extension.",
    windowTitle: 'Neruz Page View',
    widthLabel: 'Window width',
  },
  ruler: {
    label: 'Go to section',
    counter: 'Scene {n} of {total}',
    scenes: [
      { id: 'inicio', label: 'Your site on many screens, all at once.' },
      { id: 'um-clique', label: 'Two clicks, and your screenshot is ready to share.' },
      { id: 'role-uma-tela', label: 'Scroll one screen. They all follow.' },
      { id: 'pagina-rola-sozinha', label: 'The page scrolls itself. You just hit Record.' },
      { id: 'site-numa-pasta', label: 'The whole site, in one folder.' },
      { id: 'tudo-no-computador', label: 'Everything happens on your computer.' },
      { id: 'codigo-aberto', label: 'Free, open source and open to anyone who wants to help.' },
      { id: 'instalar', label: 'Try it on the next site you open.' },
    ],
  },
  footer: {
    navLabel: 'Footer',
    product: {
      title: 'Product',
      installTitle: 'Install in your browser',
      comingSoon: 'Coming to the stores',
    },
    project: {
      title: 'Project',
      github: 'Code on GitHub',
      license: 'MIT License',
      issue: 'Report an issue',
    },
    privacy: 'Privacy policy',
    umbrella: 'Neruz Extensions',
    umbrellaText:
      'Browser extensions made by Bruno Lucas for people who build and show websites. Page View is the first one.',
    studio: {
      title: 'Fonte Dev',
      text: "Fonte Dev is Bruno Lucas's studio for custom websites and digital experiences, crafted from the first movement to the last detail.",
      cta: 'Meet Fonte Dev',
      ctaLabel: 'Meet Fonte Dev (opens in a new tab)',
    },
    credit: 'Desenvolvido por Fonte Dev · Bruno Lucas',
  },
  forno: {
    brand: 'Forno 27',
    nav: { home: 'Home', menu: 'Menu', about: 'About', contact: 'Contact', toggle: 'Open menu' },
    hero: {
      title: 'Warm bread from early on',
      subtitle: 'Slow rise, a stone oven and small batches all day long.',
      cta: 'See the menu',
    },
    menu: {
      title: 'Fresh today',
      more: 'See all',
      items: [
        { name: 'Sourdough loaf', desc: 'Crisp crust, open crumb.', price: '$1.23' },
        { name: 'Butter croissant', desc: 'Flaky, thin layers.', price: '$4.56' },
        { name: 'Cheese bread', desc: 'Brazilian classic, fresh from the oven.', price: '$7.89' },
        { name: 'Orange loaf cake', desc: 'Light glaze, generous slice.', price: '$9.87' },
      ],
    },
    about: {
      title: 'About us',
      body: 'Forno 27 started with a family recipe and an oven that was too small. The oven got bigger; the recipe stayed the same.',
    },
    contact: {
      line: 'A demo bakery: no address, no phone.',
      cards: [
        'Warm bread, small batches, every day.',
        'Breads, pastries and cakes, baked through the day.',
        'A family recipe, now in a bigger oven.',
      ],
    },
    footerNote: 'Forno 27 is a fictional bakery, made for this demo.',
    url: 'forno27.example',
    regionLabel: 'Fictional demo site: Forno 27 bakery',
  },
};
