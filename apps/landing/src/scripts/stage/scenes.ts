import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { clamp, lerp, rampProgress } from '../env';

gsap.registerPlugin(CustomEase);
const cutEase = CustomEase.create('cut', 'M0,0 C0.7,0 0.2,1 1,1');
const easeInOut = gsap.parseEase('power2.inOut');
const easeOut = gsap.parseEase('expo.out');

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DeviceSpec {
  virtualWidth: number;
  virtualHeight: number;
  heightShare: number;
  rotation: number;
}

interface DeviceView {
  spec: DeviceSpec;
  isActive: boolean;
  root: HTMLElement;
  screen: HTMLElement;
  host: HTMLElement;
  dot: HTMLElement;
  rect: Rect;
  scale: number;
  maxScroll: number;
  currentRect: Rect;
  opacity: number;
}

interface AutoSite {
  host: HTMLElement;
  virtualWidth: number;
  naturalHeight: number;
}

const DEVICE_SPECS: DeviceSpec[] = [
  { virtualWidth: 390, virtualHeight: 844, heightShare: 1, rotation: -2.5 },
  { virtualWidth: 672, virtualHeight: 841, heightShare: 0.96, rotation: -1.2 },
  { virtualWidth: 820, virtualHeight: 1180, heightShare: 0.88, rotation: 0 },
  { virtualWidth: 1280, virtualHeight: 800, heightShare: 0.66, rotation: 1.2 },
  { virtualWidth: 1920, virtualHeight: 1080, heightShare: 0.6, rotation: 2.5 },
];
const COMPACT_INDEXES = [0, 2, 3];
const COTA_HEIGHT = 30;
const DEVICE_GAP = 0.06;
const COMPACT_OVERLAP = -0.12;
const PHONE_WIDTH = 390;
const WIDE_WIDTH = 1280;
const FRAME_GAP = 18;
const RECORDING_SECONDS = 12;
const SECTION_SELECTORS = ['.forno__hero', '.forno__menu', '.forno__about', '.forno__footer'];
const PAUSE_SHARE = 0.38;
const COMPACT_WIDTH = 768;

function query<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`scenes: ${selector}`);
  return element;
}

function setStyleIfChanged(element: HTMLElement, property: string, value: string): void {
  if (element.style.getPropertyValue(property) !== value)
    element.style.setProperty(property, value);
}

function relativeRect(element: Element, origin: DOMRect): Rect {
  const rect = element.getBoundingClientRect();
  return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
}

function lerpRect(from: Rect, to: Rect, amount: number): Rect {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
    w: lerp(from.w, to.w, amount),
    h: lerp(from.h, to.h, amount),
  };
}

function createSiteHost(template: HTMLElement, virtualWidth: number): HTMLElement {
  const host = document.createElement('div');
  host.className = 'sim-host';
  host.style.width = `${virtualWidth}px`;
  host.append(template.cloneNode(true));
  return host;
}

function measureNaturalHeight(host: HTMLElement): number {
  host.style.height = 'auto';
  const content = host.firstElementChild as HTMLElement;
  return content.offsetHeight;
}

function wipeClip(enter: number, exit: number): string {
  if (exit > 0) {
    const edge = exit * 140;
    return `polygon(${edge.toFixed(1)}% 0, 100% 0, 100% 100%, ${(edge - 40).toFixed(1)}% 100%)`;
  }
  if (enter >= 1) return 'none';
  const edge = enter * 140;
  return `polygon(0 0, ${edge.toFixed(1)}% 0, ${(edge - 40).toFixed(1)}% 100%, 0 100%)`;
}

function formatClock(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function buildSectionTimes(markCount: number): number[] {
  return Array.from({ length: markCount }, (_, index) => index / Math.max(1, markCount - 1));
}

export interface CrossReading {
  label: string;
}

export interface ScenesStage {
  measure(source: Rect): void;
  renderDevices(devicesProgress: number, autoProgress: number): void;
  renderAuto(autoProgress: number): void;
  readCross(clientX: number, clientY: number): CrossReading | null;
  setEchoEnabled(isEnabled: boolean): void;
}

export function createScenes(journey: HTMLElement, template: HTMLElement): ScenesStage {
  const devicesSection = query<HTMLElement>(journey, '[data-scene-devices]');
  const autoSection = query<HTMLElement>(journey, '[data-scene-auto]');
  const devicesText = query<HTMLElement>(devicesSection, '[data-devices-text]');
  const devicesNote = query<HTMLElement>(devicesSection, '[data-devices-note]');
  const devicesSlot = query<HTMLElement>(devicesSection, '[data-devices-slot]');
  const autoText = query<HTMLElement>(autoSection, '[data-auto-text]');
  const autoNote = query<HTMLElement>(autoSection, '[data-auto-note]');
  const autoSlot = query<HTMLElement>(autoSection, '[data-auto-slot]');
  const frame = query<HTMLElement>(autoSection, '[data-afr]');
  const frameInner = query<HTMLElement>(frame, '[data-afr-inner]');
  const frameTag = query<HTMLElement>(frame, '[data-afr-tag]');
  const frameBar = query<HTMLElement>(frame, '[data-afr-bar]');
  const frameTime = query<HTMLElement>(frame, '[data-afr-time]');
  const timeline = query<HTMLElement>(frame, '[data-atl]');
  const timelineFill = query<HTMLElement>(frame, '[data-atl-fill]');
  const timelineMarks = [...frame.querySelectorAll<HTMLElement>('[data-atl-mark]')];
  const recordingTemplate = frame.dataset.recording ?? '{time}';

  const devices: DeviceView[] = [
    ...devicesSection.querySelectorAll<HTMLElement>('[data-sdev]'),
  ].map((root, index) => {
    const spec = DEVICE_SPECS[index];
    const inner = query<HTMLElement>(root, '[data-sdev-inner]');
    const host = createSiteHost(template, spec.virtualWidth);
    inner.prepend(host);
    return {
      spec,
      isActive: true,
      root,
      screen: query<HTMLElement>(root, '[data-sdev-screen]'),
      host,
      dot: query<HTMLElement>(root, '[data-sdev-dot]'),
      rect: { x: 0, y: 0, w: 0, h: 0 },
      scale: 1,
      maxScroll: 0,
      currentRect: { x: 0, y: 0, w: 0, h: 0 },
      opacity: 0,
    };
  });

  const phoneSite: AutoSite = {
    host: createSiteHost(template, PHONE_WIDTH),
    virtualWidth: PHONE_WIDTH,
    naturalHeight: 0,
  };
  const wideSite: AutoSite = {
    host: createSiteHost(template, WIDE_WIDTH),
    virtualWidth: WIDE_WIDTH,
    naturalHeight: 0,
  };
  frameInner.append(phoneSite.host, wideSite.host);

  const sectionTimes = buildSectionTimes(timelineMarks.length);
  const sectionOffsets: number[] = sectionTimes.map(() => 0);
  const numberFormat = new Intl.NumberFormat(document.documentElement.dataset.locale ?? 'pt-BR');

  let isCompact = false;
  let portraitRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let landscapeRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let firstDeviceRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let flightSource: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let timelineWidth = 100;
  let echo: { index: number; nx: number; ny: number } | null = null;
  let isEchoEnabled = false;
  let previewTime: number | null = null;
  let displayedTime = 0;
  let isTimelineLive = false;
  let lastClock = '';
  let lastTag = '';

  function layoutDevices(slot: Rect): void {
    const indexes = isCompact ? COMPACT_INDEXES : DEVICE_SPECS.map((_, index) => index);
    const gap = isCompact ? COMPACT_OVERLAP : DEVICE_GAP;
    const widthUnits = indexes.map(
      (index) =>
        (DEVICE_SPECS[index].virtualWidth / DEVICE_SPECS[index].virtualHeight) *
        DEVICE_SPECS[index].heightShare,
    );
    const totalUnits = widthUnits.reduce((sum, unit) => sum + unit, 0) + gap * (indexes.length - 1);
    const height = Math.min((slot.h - COTA_HEIGHT) * 0.94, slot.w / totalUnits);
    const startX = slot.x + (slot.w - totalUnits * height) / 2;
    const baseline = slot.y + slot.h - COTA_HEIGHT;
    let cursor = startX;
    devices.forEach((device) => {
      device.isActive = false;
    });
    indexes.forEach((deviceIndex, position) => {
      const device = devices[deviceIndex];
      const screenHeight = DEVICE_SPECS[deviceIndex].heightShare * height;
      const screenWidth = widthUnits[position] * height;
      device.isActive = true;
      device.rect = { x: cursor, y: baseline - screenHeight, w: screenWidth, h: screenHeight };
      cursor += (widthUnits[position] + gap) * height;
    });
    firstDeviceRect = devices[0].rect;
  }

  function sizeDevices(): void {
    devices.forEach((device) => {
      if (!device.isActive) {
        device.root.setAttribute('data-off', '');
        return;
      }
      device.root.removeAttribute('data-off');
      const { spec, rect } = device;
      const naturalHeight = measureNaturalHeight(device.host);
      device.scale = Math.max(rect.w - 2, 1) / spec.virtualWidth;
      const virtualHeight = Math.max(rect.h - 2, 1) / device.scale;
      device.host.style.height = `${virtualHeight.toFixed(1)}px`;
      device.maxScroll = Math.max(0, naturalHeight - virtualHeight);
      device.root.style.width = `${rect.w.toFixed(1)}px`;
      device.root.style.height = `${(rect.h + COTA_HEIGHT).toFixed(1)}px`;
      const rotation = isCompact ? spec.rotation * 0.6 : spec.rotation;
      device.screen.style.setProperty('--rotation', `${rotation}deg`);
      const widthLabel = device.root.querySelector<HTMLElement>('[data-sdev-width]');
      if (widthLabel) widthLabel.textContent = numberFormat.format(spec.virtualWidth);
      device.currentRect = { ...rect };
    });
  }

  function measureSections(): void {
    const content = phoneSite.host.firstElementChild as HTMLElement;
    const phoneScale = Math.max(portraitRect.w - 2, 1) / PHONE_WIDTH;
    const portraitVirtualHeight = (portraitRect.h - 2) / phoneScale;
    const maxScroll = Math.max(1, phoneSite.naturalHeight - portraitVirtualHeight);
    SECTION_SELECTORS.slice(0, timelineMarks.length).forEach((selector, index) => {
      const section = content.querySelector<HTMLElement>(selector);
      sectionOffsets[index] = section ? clamp(section.offsetTop / maxScroll, 0, 1) : index / 3;
    });
  }

  function measureAuto(slot: Rect): void {
    const slotHeight = slot.h * 0.92;
    timelineWidth = isCompact ? 30 : 100;
    let portraitWidth = Math.min((slotHeight * 9) / 16, slot.w - FRAME_GAP - timelineWidth);
    portraitWidth = Math.max(portraitWidth, 120);
    const portraitHeight = (portraitWidth * 16) / 9;
    const landscapeWidth = Math.min(slot.w - FRAME_GAP - timelineWidth, (slotHeight * 16) / 9);
    const landscapeHeight = (landscapeWidth * 9) / 16;
    const groupWidth = (width: number) => width + FRAME_GAP + timelineWidth;
    portraitRect = {
      x: slot.x + (slot.w - groupWidth(portraitWidth)) / 2,
      y: slot.y + (slot.h - portraitHeight) / 2,
      w: portraitWidth,
      h: portraitHeight,
    };
    landscapeRect = {
      x: slot.x + (slot.w - groupWidth(landscapeWidth)) / 2,
      y: slot.y + (slot.h - landscapeHeight) / 2,
      w: landscapeWidth,
      h: landscapeHeight,
    };
    timeline.style.setProperty('--atl-width', `${timelineWidth}px`);
    phoneSite.naturalHeight = measureNaturalHeight(phoneSite.host);
    wideSite.naturalHeight = measureNaturalHeight(wideSite.host);
    measureSections();
  }

  function autoScroll(time: number): number {
    const last = sectionTimes.length - 1;
    if (time >= 1) return sectionOffsets[last];
    let segment = 0;
    while (segment < last - 1 && time >= sectionTimes[segment + 1]) segment += 1;
    const start = sectionTimes[segment];
    const end = sectionTimes[segment + 1];
    const local = (time - start) / (end - start);
    const glide = easeInOut(clamp((local - PAUSE_SHARE) / (1 - PAUSE_SHARE), 0, 1));
    return lerp(sectionOffsets[segment], sectionOffsets[segment + 1], glide);
  }

  function placeAutoSite(
    site: AutoSite,
    innerWidth: number,
    innerHeight: number,
    scale: number,
    scrollShare: number,
    opacity: number,
  ): void {
    const virtualHeight = innerHeight / scale;
    const maxScroll = Math.max(0, site.naturalHeight - virtualHeight);
    const offsetX = (innerWidth - site.virtualWidth * scale) / 2;
    setStyleIfChanged(site.host, 'height', `${virtualHeight.toFixed(1)}px`);
    setStyleIfChanged(
      site.host,
      'transform',
      `translate3d(${offsetX.toFixed(1)}px, ${(-scrollShare * maxScroll * scale).toFixed(1)}px, 0) scale(${scale.toFixed(4)})`,
    );
    setStyleIfChanged(site.host, 'opacity', opacity.toFixed(3));
    setStyleIfChanged(site.host, 'visibility', opacity > 0.001 ? 'visible' : 'hidden');
  }

  function setupPointers(): void {
    window.addEventListener(
      'pointermove',
      (event) => {
        if (event.pointerType !== 'mouse' || !isEchoEnabled) return;
        const hit = hitDevice(event.clientX, event.clientY);
        echo = hit ? { index: hit.index, nx: hit.nx, ny: hit.ny } : null;
      },
      { passive: true },
    );
    timeline.addEventListener('pointermove', (event) => {
      if (!isTimelineLive) return;
      const rect = timeline.getBoundingClientRect();
      previewTime = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    });
    timeline.addEventListener('pointerleave', () => {
      previewTime = null;
    });
    timeline.addEventListener('pointerdown', (event) => {
      if (!isTimelineLive) return;
      const rect = timeline.getBoundingClientRect();
      previewTime = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    });
    timeline.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') previewTime = null;
    });
  }

  function hitDevice(
    clientX: number,
    clientY: number,
  ): { index: number; nx: number; ny: number } | null {
    for (let index = devices.length - 1; index >= 0; index -= 1) {
      const device = devices[index];
      if (!device.isActive || device.opacity < 0.6) continue;
      const rect = device.screen.getBoundingClientRect();
      const inside =
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom;
      if (inside) {
        return {
          index,
          nx: (clientX - rect.left) / rect.width,
          ny: (clientY - rect.top) / rect.height,
        };
      }
    }
    return null;
  }

  function renderEcho(): void {
    devices.forEach((device, index) => {
      const isTarget = Boolean(echo) && echo?.index !== index && device.opacity >= 0.6;
      device.dot.classList.toggle('is-on', isTarget);
      if (!isTarget || !echo) return;
      const x = echo.nx * (device.rect.w - 2);
      const y = echo.ny * (device.rect.h - 2);
      setStyleIfChanged(
        device.dot,
        'transform',
        `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(45deg)`,
      );
    });
  }

  setupPointers();

  return {
    measure(source) {
      isCompact = window.innerWidth < COMPACT_WIDTH;
      flightSource = source;
      const devicesOrigin = devicesSection.getBoundingClientRect();
      layoutDevices(relativeRect(devicesSlot, devicesOrigin));
      sizeDevices();
      const autoOrigin = autoSection.getBoundingClientRect();
      measureAuto(relativeRect(autoSlot, autoOrigin));
    },

    setEchoEnabled(isEnabled) {
      isEchoEnabled = isEnabled;
      if (!isEnabled) echo = null;
    },

    readCross(clientX, clientY) {
      if (!isEchoEnabled) return null;
      const hit = hitDevice(clientX, clientY);
      if (!hit) return null;
      const device = devices[hit.index];
      return { label: `x ${Math.round(hit.nx * device.spec.virtualWidth)}` };
    },

    renderDevices(devicesProgress, autoProgress) {
      const isVisible = devicesProgress > 0 && autoProgress < 1;
      setStyleIfChanged(devicesSection, 'visibility', isVisible ? 'visible' : 'hidden');
      if (!isVisible) {
        for (const device of devices) {
          device.opacity = 0;
          setStyleIfChanged(device.root, 'visibility', 'hidden');
        }
        return;
      }
      const textEnter = cutEase(rampProgress(devicesProgress, 0.06, 0.18));
      const textExit = cutEase(rampProgress(autoProgress, 0, 0.1));
      setStyleIfChanged(devicesText, 'clip-path', wipeClip(textEnter, textExit));
      setStyleIfChanged(
        devicesNote,
        'opacity',
        (rampProgress(devicesProgress, 0.3, 0.42) * (1 - textExit)).toFixed(3),
      );
      const scrollShare =
        easeInOut(rampProgress(devicesProgress, 0.36, 0.68)) *
        (1 - easeInOut(rampProgress(devicesProgress, 0.72, 0.96)));
      const sourceCenterX = flightSource.x + flightSource.w / 2;
      const sourceCenterY = flightSource.y + flightSource.h / 2;
      let position = 0;
      devices.forEach((device, index) => {
        if (!device.isActive) return;
        const start = 0.02 + position * 0.035;
        const fly = easeOut(rampProgress(devicesProgress, start, start + 0.22));
        const enter = rampProgress(devicesProgress, start, start + 0.1);
        const exit =
          index === 0
            ? rampProgress(autoProgress, 0.02, 0.05)
            : easeInOut(
                rampProgress(autoProgress, 0.01 + position * 0.025, 0.12 + position * 0.025),
              );
        position += 1;
        const opacity = enter * (1 - exit);
        device.opacity = opacity;
        setStyleIfChanged(device.root, 'visibility', opacity > 0.001 ? 'visible' : 'hidden');
        setStyleIfChanged(device.root, 'opacity', opacity.toFixed(3));
        if (opacity <= 0.001) return;
        const sizeScale = lerp(0.95, 1, fly) * lerp(1, 0.95, exit);
        const totalHeight = device.rect.h + COTA_HEIGHT;
        const centerX = lerp(sourceCenterX, device.rect.x + device.rect.w / 2, fly);
        const centerY = lerp(sourceCenterY, device.rect.y + totalHeight / 2, fly) + exit * 12;
        setStyleIfChanged(
          device.root,
          'transform',
          `translate3d(${(centerX - (device.rect.w * sizeScale) / 2).toFixed(1)}px, ${(centerY - (totalHeight * sizeScale) / 2).toFixed(1)}px, 0) scale(${sizeScale.toFixed(4)})`,
        );
        setStyleIfChanged(
          device.host,
          'transform',
          `translate3d(0, ${(-scrollShare * device.maxScroll * device.scale).toFixed(1)}px, 0) scale(${device.scale.toFixed(4)})`,
        );
        device.currentRect = device.rect;
      });
      if (isEchoEnabled) renderEcho();
    },

    renderAuto(autoProgress) {
      const isVisible = autoProgress > 0;
      setStyleIfChanged(autoSection, 'visibility', isVisible ? 'visible' : 'hidden');
      setStyleIfChanged(frame, 'visibility', isVisible ? 'visible' : 'hidden');
      setStyleIfChanged(timeline, 'visibility', isVisible ? 'visible' : 'hidden');
      if (!isVisible) {
        isTimelineLive = false;
        return;
      }
      const textEnter = cutEase(rampProgress(autoProgress, 0.04, 0.18));
      setStyleIfChanged(autoText, 'clip-path', wipeClip(textEnter, 0));
      setStyleIfChanged(autoNote, 'opacity', rampProgress(autoProgress, 0.2, 0.3).toFixed(3));

      const move = easeInOut(rampProgress(autoProgress, 0.05, 0.22));
      const morph = easeInOut(rampProgress(autoProgress, 0.78, 0.94));
      const startRect = firstDeviceRect;
      const rect =
        morph > 0
          ? lerpRect(portraitRect, landscapeRect, morph)
          : lerpRect(startRect, portraitRect, move);
      const startRotation =
        (isCompact ? DEVICE_SPECS[0].rotation * 0.6 : DEVICE_SPECS[0].rotation) * (1 - move);
      setStyleIfChanged(frame, 'opacity', rampProgress(autoProgress, 0, 0.03).toFixed(3));
      setStyleIfChanged(frame, 'width', `${rect.w.toFixed(1)}px`);
      setStyleIfChanged(frame, 'height', `${rect.h.toFixed(1)}px`);
      setStyleIfChanged(
        frame,
        'transform',
        `translate3d(${rect.x.toFixed(1)}px, ${rect.y.toFixed(1)}px, 0) rotate(${startRotation.toFixed(2)}deg)`,
      );

      const targetTime = previewTime ?? clamp(rampProgress(autoProgress, 0.26, 0.74), 0, 1);
      displayedTime = previewTime === null ? targetTime : lerp(displayedTime, targetTime, 0.3);
      const scrollShare = autoScroll(displayedTime);
      const innerWidth = Math.max(rect.w - 2, 1);
      const innerHeight = Math.max(rect.h - 2, 1);
      const crossfade = rampProgress(morph, 0.35, 0.6);
      const phoneScale = Math.max(portraitRect.w - 2, 1) / PHONE_WIDTH;
      placeAutoSite(phoneSite, innerWidth, innerHeight, phoneScale, scrollShare, 1 - crossfade);
      placeAutoSite(
        wideSite,
        innerWidth,
        innerHeight,
        innerWidth / WIDE_WIDTH,
        scrollShare,
        crossfade,
      );

      const tag = crossfade > 0.5 ? '16:9' : '9:16 · 1080×1920';
      if (tag !== lastTag) {
        frameTag.textContent = tag;
        lastTag = tag;
      }
      const barOpacity = rampProgress(autoProgress, 0.18, 0.26);
      setStyleIfChanged(frameBar, 'opacity', barOpacity.toFixed(3));
      const clock = formatClock(displayedTime * RECORDING_SECONDS);
      if (clock !== lastClock) {
        frameTime.textContent = recordingTemplate.replace('{time}', clock);
        lastClock = clock;
      }

      const timelineOpacity = rampProgress(autoProgress, 0.2, 0.28);
      setStyleIfChanged(timeline, 'opacity', timelineOpacity.toFixed(3));
      setStyleIfChanged(
        timeline,
        'transform',
        `translate3d(${(rect.w + FRAME_GAP).toFixed(1)}px, 0, 0)`,
      );
      setStyleIfChanged(timeline, 'height', `${rect.h.toFixed(1)}px`);
      setStyleIfChanged(timelineFill, 'transform', `scaleY(${displayedTime.toFixed(4)})`);
      timelineMarks.forEach((mark, index) => {
        mark.classList.toggle('is-passed', displayedTime >= sectionTimes[index] - 0.001);
      });
      isTimelineLive = timelineOpacity > 0.9;
      setStyleIfChanged(timeline, 'pointer-events', isTimelineLive ? 'auto' : 'none');
    },
  };
}
