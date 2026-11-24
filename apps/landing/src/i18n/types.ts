export const LOCALES = ['pt-BR', 'en', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export type BrowserId = 'chrome' | 'edge' | 'firefox' | 'brave' | 'opera';

export interface FornoCopy {
  brand: string;
  nav: { home: string; menu: string; about: string; contact: string; toggle: string };
  hero: { title: string; subtitle: string; cta: string };
  menu: {
    title: string;
    more: string;
    items: { name: string; desc: string; price: string }[];
  };
  about: { title: string; body: string };
  contact: { line: string; cards: string[] };
  footerNote: string;
  url: string;
  regionLabel: string;
}

export interface LandingCopy {
  locale: Locale;
  htmlLang: string;
  path: string;
  privacyPath: string;
  meta: { title: string; description: string; ogDescription: string };
  skipLink: string;
  languageLabel: string;
  languageNames: Record<Locale, string>;
  header: { signature: string; signatureLabel: string; signatureLogoAlt: string };
  language: { current: string; short: string; selected: string };
  common: { newTab: string };
  github: string;
  brandEyebrow: string;
  cta: {
    addTo: Record<BrowserId, string>;
    chooseBrowser: string;
    alsoFor: string;
    browserNotes: Partial<Record<BrowserId, string>>;
    mobileInstall: string;
    copyLink: string;
    linkCopied: string;
    share: string;
    viewCode: string;
    support: string;
  };
  hero: {
    title: string;
    subtitle: string;
    posterAlt: string;
    windowWidthLabel: string;
    skipIntro: string;
  };
  sceneOneClick: {
    stepLabel: string;
    title: string;
    subtitle: string;
    before: string;
    after: string;
    compareLabel: string;
    backgroundLabel: string;
    backgrounds: string[];
  };
  studioArt: {
    title: string;
    captureTitle: string;
    modeLabel: string;
    modes: string[];
    framedLabel: string;
    captureLabel: string;
  };
  sceneDevices: {
    stepLabel: string;
    title: string;
    subtitle: string;
    note: string;
    names: string[];
  };
  sceneAuto: {
    stepLabel: string;
    title: string;
    subtitle: string;
    note: string;
    recording: string;
    sections: string[];
  };
  sceneFolder: {
    stepLabel: string;
    title: string;
    subtitle: string;
    note: string;
    urlListLabel: string;
    exampleTag: string;
    counter: string;
    folderName: string;
    reportTitle: string;
    reportLines: string[];
    pages: { title: string; line: string; url: string }[];
    visualLabel: string;
  };
  sceneLocal: {
    stepLabel: string;
    title: string;
    subtitle: string;
    note: string;
    privacyLink: string;
    codeLink: string;
    whenLabel: string;
    laptopLabel: string;
    cards: { permission: string; title: string; what: string; when: string }[];
  };
  sceneOpen: {
    stepLabel: string;
    title: string;
    subtitle: string;
    ask: string;
    umbrella: string;
    contribute: string;
    license: string;
    codeLabel: string;
  };
  extensions: {
    eyebrow: string;
    title: string;
    lead: string;
    hubLink: string;
    pageView: { name: string; flag: string; text: string };
    inspect: { name: string; text: string; cta: string; newTab: string };
    meta: string;
  };
  ruler: { label: string; counter: string; scenes: { id: string; label: string }[] };
  consent: {
    label: string;
    text: string;
    accept: string;
    reject: string;
    policy: string;
    preferences: string;
  };
  sitePrivacy: {
    title: string;
    description: string;
    heading: string;
    updated: string;
    back: string;
    extension: string;
    blocks: { title: string; paragraphs: string[] }[];
  };
  footer: {
    navLabel: string;
    product: { title: string; installTitle: string; comingSoon: string };
    project: { title: string; github: string; license: string; issue: string };
    privacy: string;
    umbrella: string;
    umbrellaText: string;
    studio: { title: string; text: string; cta: string; ctaLabel: string };
    credit: string;
  };
  forno: FornoCopy;
}
