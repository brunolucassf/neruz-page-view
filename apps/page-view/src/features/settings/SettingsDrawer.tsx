import {
  MAX_IMAGE_QUALITY,
  MAX_MAX_SCREENS,
  MIN_IMAGE_QUALITY,
  MIN_MAX_SCREENS,
  type ThemePreference,
} from '@neruz/core';
import { LOCALE_NATIVE_NAMES, LOCALE_PREFERENCES, type LocalePreference } from '@neruz/i18n';
import { Button, IconButton } from '@neruz/ui';
import { Download, Settings as SettingsIcon, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  Dialog,
  Heading,
  Label,
  Modal,
  ModalOverlay,
  Radio,
  RadioGroup,
  Slider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from 'react-aria-components';
import type { CaptureModeChoice } from '../capture/captureStore';
import { type MessageKey, t } from '../i18n';
import { SHORTCUTS } from '../shell/Dialogs';
import { showToast } from '../toasts/toastStore';
import { exportSettingsFile, importSettingsFile } from './dataTransfer';
import { useSettings } from './settingsStore';
import './settings.css';

const ICON_PROPS = {
  size: 16,
  strokeWidth: 1.75,
  strokeLinejoin: 'miter',
  strokeLinecap: 'square',
} as const;

const THEME_OPTIONS: { value: ThemePreference; label: MessageKey }[] = [
  { value: 'system', label: 'settings.theme.system' },
  { value: 'dark', label: 'settings.theme.dark' },
  { value: 'light', label: 'settings.theme.light' },
];

const MODE_OPTIONS: { value: CaptureModeChoice; label: MessageKey }[] = [
  { value: 'fast', label: 'studio.capture.mode.quick.label' },
  { value: 'experience', label: 'studio.capture.mode.experience.label' },
  { value: 'moments', label: 'studio.capture.mode.moments.label' },
];

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;

const SHORTCUTS_PAGE_URL = 'chrome://extensions/shortcuts';

export function SettingsButton() {
  const setOpen = useSettings((state) => state.setOpen);
  return (
    <IconButton label={t('studio.bar.settings')} onPress={() => setOpen(true)}>
      <SettingsIcon {...ICON_PROPS} aria-hidden="true" />
    </IconButton>
  );
}

export function SettingsDrawer() {
  const isOpen = useSettings((state) => state.isOpen);
  const setOpen = useSettings((state) => state.setOpen);
  return (
    <ModalOverlay
      className="settings__overlay"
      isOpen={isOpen}
      onOpenChange={setOpen}
      isDismissable
    >
      <Modal className="settings__modal">
        <Dialog className="settings" aria-labelledby="settings-title">
          <header className="settings__header">
            <Heading slot="title" id="settings-title" className="settings__title">
              {t('settings.title')}
            </Heading>
            <IconButton label={t('common.close')} onPress={() => setOpen(false)}>
              <X {...ICON_PROPS} aria-hidden="true" />
            </IconButton>
          </header>
          <div className="settings__body">
            <LanguageSection />
            <ThemeSection />
            <ScreensSection />
            <CaptureDefaultsSection />
            <ShortcutsSection />
            <DataSection />
          </div>
          <a
            className="settings__credit"
            href="https://fontedev.com"
            target="_blank"
            rel="noopener"
          >
            {t('settings.credits')}
          </a>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

function LanguageSection() {
  const locale = useSettings((state) => state.settings.locale);
  const patchSettings = useSettings((state) => state.patchSettings);
  return (
    <RadioGroup
      className="settings__group"
      value={locale}
      onChange={(value) => patchSettings({ locale: value as LocalePreference })}
    >
      <Label className="settings__label">{t('settings.language.label')}</Label>
      <div className="settings__choices">
        {LOCALE_PREFERENCES.map((option) => (
          <Radio key={option} value={option} className="settings__choice">
            {option === 'auto' ? t('settings.language.auto') : LOCALE_NATIVE_NAMES[option]}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function ThemeSection() {
  const theme = useSettings((state) => state.settings.theme);
  const patchSettings = useSettings((state) => state.patchSettings);
  return (
    <RadioGroup
      className="settings__group"
      value={theme}
      orientation="horizontal"
      onChange={(value) => patchSettings({ theme: value as ThemePreference })}
    >
      <Label className="settings__label">{t('settings.theme.label')}</Label>
      <div className="segmented">
        {THEME_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="segmented__option">
            {t(option.label)}
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

function ScreensSection() {
  const maxScreens = useSettings((state) => state.settings.maxScreens);
  const patchSettings = useSettings((state) => state.patchSettings);
  return (
    <Slider
      className="settings__group range"
      minValue={MIN_MAX_SCREENS}
      maxValue={MAX_MAX_SCREENS}
      step={1}
      value={maxScreens}
      onChange={(value) => patchSettings({ maxScreens: value })}
    >
      <div className="range__head">
        <Label className="settings__label">{t('settings.maxScreens.label')}</Label>
        <SliderOutput className="pv-tnum settings__value" />
      </div>
      <SliderTrack className="range__track">
        <div className="range__rail" />
        <SliderThumb className="range__thumb" />
      </SliderTrack>
      <p className="settings__hint">{t('settings.maxScreens.hint')}</p>
    </Slider>
  );
}

function CaptureDefaultsSection() {
  const defaults = useSettings((state) => state.captureDefaults);
  const patchCaptureDefaults = useSettings((state) => state.patchCaptureDefaults);
  return (
    <section className="settings__group" aria-labelledby="settings-capture-title">
      <h3 id="settings-capture-title" className="settings__label">
        {t('settings.capture.title')}
      </h3>
      <RadioGroup
        value={defaults.printMode}
        orientation="horizontal"
        aria-label={t('studio.capture.mode.label')}
        onChange={(value) => patchCaptureDefaults({ printMode: value as CaptureModeChoice })}
      >
        <div className="segmented">
          {MODE_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value} className="segmented__option">
              {t(option.label)}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <RadioGroup
        value={defaults.imageFormat}
        orientation="horizontal"
        aria-label={t('studio.capture.advanced.format')}
        onChange={(value) =>
          patchCaptureDefaults({ imageFormat: value as (typeof FORMAT_OPTIONS)[number]['value'] })
        }
      >
        <div className="segmented">
          {FORMAT_OPTIONS.map((option) => (
            <Radio key={option.value} value={option.value} className="segmented__option">
              {option.label}
            </Radio>
          ))}
        </div>
      </RadioGroup>
      <Slider
        className="range"
        minValue={MIN_IMAGE_QUALITY}
        maxValue={MAX_IMAGE_QUALITY}
        step={0.01}
        value={defaults.imageQuality}
        onChange={(value) => patchCaptureDefaults({ imageQuality: value })}
        formatOptions={{ style: 'percent', maximumFractionDigits: 0 }}
      >
        <div className="range__head">
          <Label className="settings__hint">{t('settings.capture.quality')}</Label>
          <SliderOutput className="pv-tnum settings__value" />
        </div>
        <SliderTrack className="range__track">
          <div className="range__rail" />
          <SliderThumb className="range__thumb" />
        </SliderTrack>
      </Slider>
    </section>
  );
}

function ShortcutsSection() {
  return (
    <section className="settings__group" aria-labelledby="settings-shortcuts-title">
      <h3 id="settings-shortcuts-title" className="settings__label">
        {t('settings.shortcuts.title')}
      </h3>
      <dl className="shortcuts__list">
        {SHORTCUTS.map((item) => (
          <div key={item.label} className="shortcuts__row">
            <dt>{t(item.label)}</dt>
            <dd>
              {item.keys.map((key) => (
                <kbd key={key} className="shortcuts__key">
                  {key}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <Button
        variant="secondary"
        onPress={() => void chrome.tabs.create({ url: SHORTCUTS_PAGE_URL })}
      >
        {t('shortcuts.remap')}
      </Button>
    </section>
  );
}

function DataSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorKey, setErrorKey] = useState<MessageKey | null>(null);

  const handleExport = async () => {
    await exportSettingsFile();
    showToast({ tone: 'neutral', title: t('settings.data.exported') });
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const outcome = await importSettingsFile(file);
    if (outcome === 'ok') {
      setErrorKey(null);
      showToast({ tone: 'success', title: t('settings.data.imported') });
    } else {
      setErrorKey(
        outcome === 'tooBig' ? 'settings.data.import.tooBig' : 'settings.data.import.error',
      );
    }
  };

  return (
    <section className="settings__group" aria-labelledby="settings-data-title">
      <h3 id="settings-data-title" className="settings__label">
        {t('settings.data.title')}
      </h3>
      <p className="settings__hint">{t('settings.data.hint')}</p>
      <div className="settings__actions">
        <Button variant="secondary" onPress={() => void handleExport()}>
          <Download {...ICON_PROPS} aria-hidden="true" />
          {t('settings.data.export')}
        </Button>
        <Button variant="secondary" onPress={() => fileInputRef.current?.click()}>
          <Upload {...ICON_PROPS} aria-hidden="true" />
          {t('settings.data.import')}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        className="pv-visually-hidden"
        type="file"
        accept="application/json,.json"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      {errorKey && (
        <p className="settings__error" role="alert">
          {t(errorKey)}
        </p>
      )}
    </section>
  );
}
