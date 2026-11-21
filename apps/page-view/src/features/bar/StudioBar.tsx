import { BrandSymbol, Button, Hint, IconButton, MirrorIcon } from '@neruz/ui';
import { AppWindow, Keyboard, Minus, Plus, Scan } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Input, TextField, ToggleButton } from 'react-aria-components';
import { formatInteger, t } from '../i18n';
import { useLibrary } from '../library/libraryStore';
import { stepZoom } from '../screens/layout';
import { SettingsButton } from '../settings/SettingsDrawer';
import { useMaxActiveScreens } from '../settings/settingsStore';
import { findCurrentTabAddress, openPage } from '../shell/studioSession';
import { useStudio } from '../shell/studioStore';
import './studio-bar.css';

const ICON_PROPS = {
  size: 16,
  strokeWidth: 1.75,
  strokeLinejoin: 'miter',
  strokeLinecap: 'square',
} as const;

export function StudioBar() {
  const pageUrl = useStudio((state) => state.pageUrl);
  return (
    <header className="studio-bar">
      <div className="studio-bar__brand">
        <BrandSymbol size={20} />
        <span className="pv-visually-hidden">Neruz Page View</span>
      </div>
      {pageUrl ? <AddressForm pageUrl={pageUrl} /> : <div className="studio-bar__spacer" />}
      <div className="studio-bar__tools">
        <MirrorToggle />
        {pageUrl && <ActiveCounter />}
        {pageUrl && <ZoomControls />}
        <IconButton
          label={t('studio.bar.shortcuts')}
          onPress={() => useLibrary.getState().setShortcutsOpen(true)}
        >
          <Keyboard {...ICON_PROPS} aria-hidden="true" />
        </IconButton>
        <SettingsButton />
      </div>
    </header>
  );
}

function AddressForm({ pageUrl }: { pageUrl: string }) {
  const [address, setAddress] = useState(pageUrl);
  const [hasError, setHasError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAddress(pageUrl);
    setHasError(false);
  }, [pageUrl]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setHasError(!(await openPage(address)));
  };

  const openCurrentTab = async () => {
    const current = await findCurrentTabAddress().catch(() => null);
    if (current) void openPage(current);
    else inputRef.current?.focus();
  };

  const restoreAddress = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    setAddress(pageUrl);
    setHasError(false);
  };

  return (
    <form className="studio-bar__address" onSubmit={(event) => void submit(event)}>
      <TextField
        className="studio-bar__field"
        aria-label={t('studio.bar.url.placeholder')}
        value={address}
        isInvalid={hasError}
        onChange={(value) => {
          setAddress(value);
          setHasError(false);
        }}
        onKeyDown={restoreAddress}
      >
        <Input
          ref={inputRef}
          className="pv-input studio-bar__input"
          placeholder={t('studio.bar.url.placeholder')}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={hasError ? 'bar-url-error' : undefined}
        />
      </TextField>
      <Button type="submit" variant="secondary">
        {t('studio.bar.url.go')}
      </Button>
      <IconButton label={t('studio.bar.useCurrentTab')} onPress={() => void openCurrentTab()}>
        <AppWindow {...ICON_PROPS} aria-hidden="true" />
      </IconButton>
      {hasError && (
        <p id="bar-url-error" className="studio-bar__error" role="alert">
          {t('studio.bar.url.error')}
        </p>
      )}
    </form>
  );
}

function MirrorToggle() {
  const isMirrorOn = useStudio((state) => state.isMirrorOn);
  const setMirror = useStudio((state) => state.setMirror);
  return (
    <Hint text={t('studio.bar.mirror.tooltip')}>
      <ToggleButton
        className="pv-button pv-button--ghost studio-bar__mirror"
        isSelected={isMirrorOn}
        onChange={setMirror}
        aria-label={isMirrorOn ? t('studio.bar.mirror.on') : t('studio.bar.mirror.off')}
      >
        <MirrorIcon size={16} />
        <span>{t('studio.bar.mirror.label')}</span>
        <span className="studio-bar__mirror-dot" aria-hidden="true" />
      </ToggleButton>
    </Hint>
  );
}

function ActiveCounter() {
  const maxActiveScreens = useMaxActiveScreens();
  const activeCount = useStudio(
    (state) => state.screens.filter((screen) => !screen.isFrozen).length,
  );
  return (
    <Hint text={t('studio.bar.active.tooltip', { total: maxActiveScreens })}>
      <Button variant="ghost" className="studio-bar__counter pv-tnum">
        {t('studio.bar.active.count', { n: activeCount, total: maxActiveScreens })}
      </Button>
    </Hint>
  );
}

function ZoomControls() {
  const zoom = useStudio((state) => state.zoom);
  const isFitMode = useStudio((state) => state.isFitMode);
  const setZoom = useStudio((state) => state.setZoom);
  const fitToBench = useStudio((state) => state.fitToBench);

  return (
    <fieldset className="studio-bar__zoom">
      <legend className="pv-visually-hidden">Zoom</legend>
      <IconButton label={t('studio.bar.zoom.out')} onPress={() => setZoom(stepZoom(zoom, -1))}>
        <Minus {...ICON_PROPS} aria-hidden="true" />
      </IconButton>
      <output className="studio-bar__zoom-value pv-tnum" aria-live="polite">
        {formatInteger(zoom * 100)}%
      </output>
      <IconButton label={t('studio.bar.zoom.in')} onPress={() => setZoom(stepZoom(zoom, 1))}>
        <Plus {...ICON_PROPS} aria-hidden="true" />
      </IconButton>
      <Button
        variant="ghost"
        className="studio-bar__fit"
        data-on={isFitMode || undefined}
        onPress={fitToBench}
      >
        <Scan {...ICON_PROPS} aria-hidden="true" />
        {t('studio.bar.zoom.fit')}
      </Button>
    </fieldset>
  );
}
