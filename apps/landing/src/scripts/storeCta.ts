type BrowserId = 'chrome' | 'edge' | 'firefox' | 'brave' | 'opera';

interface StoreData {
  addTo: Record<BrowserId, string>;
  notes: Partial<Record<BrowserId, string>>;
  links: Record<BrowserId, string>;
}

interface NavigatorWithBrave extends Navigator {
  brave?: unknown;
}

function detectBrowser(): BrowserId | null {
  const agent = navigator.userAgent;
  if (/Edg\//.test(agent)) return 'edge';
  if (/OPR\/|Opera/.test(agent)) return 'opera';
  if (/Firefox\//.test(agent)) return 'firefox';
  if ((navigator as NavigatorWithBrave).brave) return 'brave';
  if (/Chrome\//.test(agent)) return 'chrome';
  return null;
}

export function isHandheld(): boolean {
  const isTouchOnly =
    matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;
  return isTouchOnly || /Android|iPhone|iPad|Mobi/.test(navigator.userAgent);
}

function setupDesktopCta(container: HTMLElement, browser: BrowserId | null): void {
  const data = JSON.parse(container.dataset.store ?? '{}') as StoreData;
  const primary = container.querySelector<HTMLAnchorElement>('[data-store-primary]');
  const picker = container.querySelector<HTMLDetailsElement>('[data-store-picker]');
  const label = container.querySelector<HTMLElement>('[data-store-label]');
  const note = container.querySelector<HTMLElement>('[data-store-note]');
  if (!primary || !label) return;

  if (!browser) {
    primary.hidden = true;
    if (picker) picker.hidden = false;
    return;
  }

  label.textContent = data.addTo[browser];
  primary.href = data.links[browser];
  primary.dataset.installStore = browser;
  const browserNote = data.notes[browser];
  if (note && browserNote) {
    note.textContent = browserNote;
    note.hidden = false;
  }
  for (const link of container.querySelectorAll<HTMLElement>('[data-also-browser]')) {
    link.hidden = link.dataset.alsoBrowser === browser;
  }
}

function setupMobileCta(container: HTMLElement): void {
  const desktop = container.querySelector<HTMLElement>('[data-store-desktop]');
  const mobile = container.querySelector<HTMLElement>('[data-store-mobile]');
  if (!desktop || !mobile) return;
  desktop.hidden = true;
  mobile.hidden = false;
}

async function shareOrCopyLink(
  button: HTMLButtonElement,
  status: HTMLElement | null,
): Promise<void> {
  const url = window.location.href.split('#')[0];
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title: document.title });
      return;
    } catch {
      return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    if (status) status.textContent = status.dataset.labelDone ?? '';
    button.dataset.state = 'done';
  } catch {
    if (status) status.textContent = url;
  }
}

function setupCopyButtons(): void {
  const canShare = typeof navigator.share === 'function';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-copy-link]')) {
    if (canShare && button.dataset.labelShare) button.textContent = button.dataset.labelShare;
    const status = button.parentElement?.querySelector<HTMLElement>('[data-copy-status]') ?? null;
    button.addEventListener('click', () => {
      void shareOrCopyLink(button, status);
    });
  }
}

function setupMobileBar(): void {
  const bar = document.querySelector<HTMLElement>('[data-mobile-cta]');
  const heroCta = document.querySelector<HTMLElement>('[data-hero-cta]');
  const hidingZones = document.querySelectorAll<HTMLElement>('[data-family], .site-footer');
  if (!bar || !heroCta) return;
  bar.hidden = false;
  bar.inert = true;
  const state = { isPastHero: false };
  const visibleZones = new Set<Element>();
  const update = () => {
    const shouldShow = state.isPastHero && visibleZones.size === 0;
    bar.classList.toggle('is-visible', shouldShow);
    bar.inert = !shouldShow;
  };
  new IntersectionObserver(([entry]) => {
    state.isPastHero = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    update();
  }).observe(heroCta);
  const zoneObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visibleZones.add(entry.target);
      else visibleZones.delete(entry.target);
    }
    update();
  });
  for (const zone of hidingZones) zoneObserver.observe(zone);
}

export function initStoreCta(): void {
  const browser = detectBrowser();
  const handheld = isHandheld();
  for (const container of document.querySelectorAll<HTMLElement>('[data-store-cta]')) {
    if (handheld) setupMobileCta(container);
    else setupDesktopCta(container, browser);
  }
  setupCopyButtons();
  if (handheld) setupMobileBar();
}
