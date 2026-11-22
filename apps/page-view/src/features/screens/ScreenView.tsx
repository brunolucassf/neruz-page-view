import { buildScreenName } from '@neruz/core';
import {
  animateEnter,
  Button,
  CutMarks,
  Hint,
  IconButton,
  OctagonLoader,
  RotateIcon,
  STAGGER_MS,
} from '@neruz/ui';
import { Moon, ShieldAlert } from 'lucide-react';
import { type CSSProperties, useEffect, useRef } from 'react';
import { ToggleButton } from 'react-aria-components';
import { FramePreview, measureFramePreview } from '../capture/FramePreview';
import { useFramed } from '../capture/framedStore';
import { formatSize, t } from '../i18n';
import { useMaxActiveScreens } from '../settings/settingsStore';
import { loadScreen } from '../shell/studioSession';
import { type Screen, useStudio } from '../shell/studioStore';
import type { ScreenBox } from './layout';
import { ResizeHandles } from './ResizeHandles';
import { ScreenMenu } from './ScreenMenu';
import './screen.css';

const IFRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock';
const IFRAME_ALLOW = 'fullscreen; clipboard-write; autoplay';

type ScreenViewProps = {
  screen: Screen;
  index: number;
  box: ScreenBox;
  zoom: number;
};

export function ScreenView({ screen, index, box, zoom }: ScreenViewProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const access = useStudio((state) => state.access);
  const pageUrl = useStudio((state) => state.pageUrl);
  const isActive = useStudio((state) => state.activeScreenId === screen.id);
  const isCaptureTarget = useStudio((state) => state.captureStageScreenId === screen.id);
  const isJustAdded = useStudio((state) => state.justAddedScreenId === screen.id);
  const total = useStudio((state) => state.screens.length);
  const unfreezeScreen = useStudio((state) => state.unfreezeScreen);
  const activateScreen = useStudio((state) => state.activateScreen);
  const rotateScreen = useStudio((state) => state.rotateScreen);
  const toggleScreenDark = useStudio((state) => state.toggleScreenDark);
  const reloadScreen = useStudio((state) => state.reloadScreen);
  const maxActiveScreens = useMaxActiveScreens();
  const isFramedOn = useFramed((state) => state.isEnabled);
  const chosenFrame = useFramed((state) => state.frameDeviceId);

  const label = screen.name;
  const accessibleName = t('studio.screen.a11yName', {
    n: index + 1,
    device: label,
    w: screen.width,
    h: screen.height,
  });
  const effectiveZoom = isCaptureTarget ? 1 : zoom;
  const viewportWidth = isCaptureTarget ? screen.width : box.scaledWidth;
  const viewportHeight = isCaptureTarget ? screen.height : box.scaledHeight;
  const isFramePreviewOn = isFramedOn && isActive && !isCaptureTarget;
  const frameTopInset = isFramePreviewOn
    ? -measureFramePreview(
        { screenKind: screen.kind, isLandscape: screen.width > screen.height, viewportWidth },
        chosenFrame,
      ).top
    : 0;

  useEffect(() => {
    if (sectionRef.current) animateEnter(sectionRef.current, index * STAGGER_MS, 260);
  }, [index]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || access !== 'granted' || !pageUrl || screen.loadKey === 0 || screen.isFrozen)
      return;
    const controller = new AbortController();
    void loadScreen(iframe, screen.id, screen.presetId, controller.signal);
    return () => controller.abort();
  }, [access, pageUrl, screen.id, screen.presetId, screen.loadKey, screen.isFrozen]);

  useEffect(() => {
    if (!isJustAdded) return;
    const section = sectionRef.current;
    section?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    section?.querySelector<HTMLElement>('[data-screen-key]')?.focus({ preventScroll: true });
    const timer = setTimeout(() => useStudio.getState().clearJustAdded(), 1000);
    return () => clearTimeout(timer);
  }, [isJustAdded]);

  const sectionStyle: CSSProperties = {
    left: isCaptureTarget ? 0 : box.x,
    top: isCaptureTarget ? 0 : box.viewportTop - 28,
    width: viewportWidth,
  };

  return (
    <section
      ref={sectionRef}
      className="screen"
      style={sectionStyle}
      aria-label={accessibleName}
      data-screen-id={screen.id}
      data-status={screen.status}
      data-active={isActive || undefined}
      data-frozen={screen.isFrozen || undefined}
      data-added={isJustAdded || undefined}
      data-capture-target={isCaptureTarget || undefined}
      onPointerDownCapture={() => activateScreen(screen.id)}
      onFocusCapture={() => activateScreen(screen.id)}
    >
      <header
        className="screen__header"
        style={frameTopInset ? { transform: `translateY(${-frameTopInset}px)` } : undefined}
      >
        <Button
          variant="ghost"
          className="screen__name"
          aria-label={accessibleName}
          data-screen-key={index + 1}
        >
          {label}
        </Button>
        <span className="screen__size pv-tnum" aria-hidden="true">
          {formatSize(screen.width, screen.height)}
        </span>
        {isJustAdded && <span className="screen__badge">{t('studio.screen.added.badge')}</span>}
        <div className="screen__actions">
          <div className="screen__inline-actions">
            <IconButton label={t('studio.screen.rotate')} onPress={() => rotateScreen(screen.id)}>
              <RotateIcon size={16} />
            </IconButton>
            <Hint text={t('studio.screen.dark')}>
              <ToggleButton
                className="pv-button pv-button--icon screen__dark"
                aria-label={t('studio.screen.dark')}
                isSelected={screen.isDark}
                onChange={() => toggleScreenDark(screen.id)}
              >
                <Moon size={16} strokeWidth={1.75} aria-hidden="true" />
              </ToggleButton>
            </Hint>
          </div>
          <ScreenMenu screenId={screen.id} index={index} total={total} />
        </div>
      </header>
      <div
        className="screen__viewport"
        style={{ width: viewportWidth, height: viewportHeight }}
        data-framed={isFramePreviewOn || undefined}
      >
        {isFramePreviewOn && (
          <FramePreview
            screenKind={screen.kind}
            isDark={screen.isDark}
            isLandscape={screen.width > screen.height}
            viewportWidth={viewportWidth}
          />
        )}
        <div
          className="screen__scale"
          style={{
            width: screen.width,
            height: screen.height,
            transform: effectiveZoom === 1 ? undefined : `scale(${effectiveZoom})`,
          }}
        >
          {!screen.isFrozen && (
            <iframe
              key={screen.loadKey}
              ref={iframeRef}
              className="screen__frame"
              name={buildScreenName(screen.id, screen.presetId)}
              title={accessibleName}
              sandbox={IFRAME_SANDBOX}
              allow={IFRAME_ALLOW}
              width={screen.width}
              height={screen.height}
              style={{ colorScheme: screen.isDark ? 'dark' : 'light' }}
            />
          )}
        </div>
        {screen.isFrozen && (
          <FrozenCard total={maxActiveScreens} onActivate={() => unfreezeScreen(screen.id)} />
        )}
        {!screen.isFrozen && screen.status !== 'blocked' && (
          <ScreenCurtain status={screen.status} label={label} />
        )}
        {!screen.isFrozen && screen.status === 'blocked' && (
          <BlockedCard onRetry={() => reloadScreen(screen.id)} />
        )}
        <CutMarks className="screen__marks" />
        <ResizeHandles screen={screen} label={label} />
      </div>
    </section>
  );
}

function FrozenCard({ total, onActivate }: { total: number; onActivate: () => void }) {
  return (
    <div className="screen__frozen">
      <div className="screen__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="screen__frozen-card pv-cut">
        <span className="pv-chip screen__frozen-chip">{t('studio.screen.paused')}</span>
        <p className="screen__frozen-body">{t('studio.screen.limit.frozen.body', { total })}</p>
        <Button variant="secondary" onPress={onActivate}>
          {t('studio.screen.limit.frozen.action')}
        </Button>
      </div>
    </div>
  );
}

function ScreenCurtain({ status, label }: { status: Screen['status']; label: string }) {
  return (
    <div className="screen__curtain" aria-hidden={status === 'ready'}>
      <div className="screen__skeleton" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      {status === 'loading' && (
        <OctagonLoader
          className="screen__loader"
          label={t('state.loading.screen', { device: label })}
        />
      )}
    </div>
  );
}

function BlockedCard({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="screen__blocked">
      <div className="state-card pv-cut" role="alert">
        <ShieldAlert className="state-card__icon" size={24} strokeWidth={1.75} aria-hidden="true" />
        <h3 className="state-card__title">{t('block.frame.title')}</h3>
        <p className="state-card__body">{t('block.frame.body')}</p>
        <div className="state-card__actions">
          <Button variant="primary" isLarge onPress={onRetry}>
            {t('block.action.retry')}
          </Button>
        </div>
      </div>
    </div>
  );
}
