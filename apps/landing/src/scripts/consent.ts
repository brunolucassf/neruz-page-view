type ConsentChoice = 'granted' | 'denied';
type StoreId = 'chrome' | 'edge' | 'firefox';

interface FbqFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: FbqFunction;
  loaded: boolean;
  version: string;
}

interface TrackingWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  fbq?: FbqFunction;
  _fbq?: FbqFunction;
}

const CONSENT_KEY = 'neruz.consent';
const GA_MEASUREMENT_ID = 'G-E6JX7NQZ9V';
const META_PIXEL_ID = '2724664818047962';
const TRACKING_COOKIES = /^(_ga|_gid|_gat|_gcl_|_fbp|_fbc)/;
const STORE_ALIASES: Record<string, StoreId> = {
  chrome: 'chrome',
  brave: 'chrome',
  opera: 'chrome',
  edge: 'edge',
  firefox: 'firefox',
};

const trackingWindow = window as TrackingWindow;
let hasLoadedTrackers = false;
let currentChoice: ConsentChoice | null = null;

function readChoice(): ConsentChoice | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === 'granted' || stored === 'denied' ? stored : null;
  } catch {
    return null;
  }
}

function writeChoice(choice: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {}
}

function injectScript(src: string): void {
  const script = document.createElement('script');
  script.async = true;
  script.src = src;
  document.head.append(script);
}

function setupGtag(): void {
  trackingWindow.dataLayer = trackingWindow.dataLayer ?? [];
  trackingWindow.gtag = function gtag() {
    // biome-ignore lint/style/noArguments: gtag.js só entende o objeto arguments
    trackingWindow.dataLayer?.push(arguments);
  };
  const gtag = trackingWindow.gtag;
  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  gtag('consent', 'update', {
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
    analytics_storage: 'granted',
  });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`);
}

function setupPixel(): void {
  const fbq = Object.assign(
    (...args: unknown[]) => {
      if (fbq.callMethod) fbq.callMethod(...args);
      else fbq.queue.push(args);
    },
    { queue: [] as unknown[], loaded: true, version: '2.0' },
  ) as FbqFunction;
  fbq.push = fbq;
  trackingWindow.fbq = fbq;
  trackingWindow._fbq = fbq;
  fbq('init', META_PIXEL_ID);
  fbq('track', 'PageView');
  injectScript('https://connect.facebook.net/en_US/fbevents.js');
}

function loadTrackers(): void {
  if (hasLoadedTrackers) return;
  hasLoadedTrackers = true;
  setupGtag();
  setupPixel();
}

function clearTrackingCookies(): void {
  const hostParts = location.hostname.split('.');
  const domains = [''];
  for (let start = 0; start < hostParts.length - 1; start += 1) {
    domains.push(`; domain=.${hostParts.slice(start).join('.')}`);
  }
  for (const entry of document.cookie.split(';')) {
    const name = entry.split('=')[0].trim();
    if (!TRACKING_COOKIES.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
    }
  }
}

function revokeTrackers(): void {
  if (hasLoadedTrackers) {
    trackingWindow.gtag?.('consent', 'update', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'denied',
    });
    trackingWindow.fbq?.('consent', 'revoke');
  }
  clearTrackingCookies();
}

function applyChoice(choice: ConsentChoice): void {
  currentChoice = choice;
  if (choice === 'granted') loadTrackers();
  else revokeTrackers();
}

function trackInstallClick(link: HTMLElement): void {
  if (currentChoice !== 'granted') return;
  const store = STORE_ALIASES[link.dataset.installStore ?? ''];
  if (!store) return;
  const product = link.dataset.installProduct ?? document.documentElement.dataset.product ?? '';
  trackingWindow.gtag?.('event', 'click_install', { store, product, transport_type: 'beacon' });
  trackingWindow.fbq?.('trackCustom', 'ClickInstall', { product, store });
}

function setupBanner(banner: HTMLElement): void {
  const show = () => {
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  };
  const hide = () => {
    banner.classList.remove('is-visible');
    banner.hidden = true;
  };
  const choose = (choice: ConsentChoice) => {
    writeChoice(choice);
    applyChoice(choice);
    hide();
    document.querySelector<HTMLElement>('[data-consent-open]')?.focus();
  };
  banner.querySelector('[data-consent-accept]')?.addEventListener('click', () => choose('granted'));
  banner.querySelector('[data-consent-reject]')?.addEventListener('click', () => choose('denied'));
  banner.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && currentChoice) hide();
  });
  for (const opener of document.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    opener.addEventListener('click', () => {
      show();
      banner.querySelector<HTMLElement>('[data-consent-accept]')?.focus();
    });
  }
  if (currentChoice === null) show();
}

function initConsent(): void {
  currentChoice = readChoice();
  if (currentChoice) applyChoice(currentChoice);
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  if (banner) setupBanner(banner);
  document.addEventListener('click', (event) => {
    const link = (event.target as Element | null)?.closest<HTMLElement>('[data-install-store]');
    if (link) trackInstallClick(link);
  });
}

initConsent();
