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
    title: 'One click, and your screenshot is ready to share.',
    subtitle:
      'Click the icon, choose "Quick mockup" and get the whole page inside a device frame. Experience mode waits for scroll animations to show up before capturing, so nothing comes out half-loaded.',
    before: 'Before: plain screenshot',
    after: 'After: full page, framed',
    compareLabel: 'Compare before and after',
    backgroundLabel: 'Screenshot background color',
    backgrounds: ['Graphite background', 'Light background', 'Terracotta background'],
  },
  popup: {
    title: 'Neruz Page View',
    quickShotLabel: 'Quick mockup',
    quickShotHint: 'This page in a device frame, ready to download.',
    openStudioLabel: 'Open in Studio',
    openStudioHint: 'See it on many screens at once.',
    urlPlaceholder: 'Or paste a URL (e.g. localhost:3000)',
    urlButton: 'Open',
    deviceLabel: 'Device',
    deviceChange: 'Change',
  },
  ruler: {
    label: 'Go to section',
    counter: 'Scene {n} of {total}',
    scenes: [
      { id: 'inicio', label: 'Your site on many screens, all at once.' },
      { id: 'um-clique', label: 'One click, and your screenshot is ready to share.' },
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
    footerNote: 'Forno 27 is a fictional bakery, made for this demo.',
    url: 'forno27.example',
    regionLabel: 'Fictional demo site: Forno 27 bakery',
  },
};
