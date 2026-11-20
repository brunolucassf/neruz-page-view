import { openStudioFromPopup, parseWebUrl } from '@neruz/core';
import { BrandSymbol, Button } from '@neruz/ui';
import { Camera, PanelsTopLeft } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Input, TextField } from 'react-aria-components';
import { t } from '../i18n';
import { normalizeAddress } from '../shell/address';
import './popup.css';

type CurrentTab = { url: string | null; isSupported: boolean };

async function readCurrentTab(): Promise<CurrentTab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? null;
  return { url, isSupported: url !== null && parseWebUrl(url).ok };
}

async function openStudio(url?: string) {
  await openStudioFromPopup(url).catch(() => undefined);
  window.close();
}

export function PopupApp() {
  const [currentTab, setCurrentTab] = useState<CurrentTab>({ url: null, isSupported: true });
  const [address, setAddress] = useState('');

  useEffect(() => {
    readCurrentTab()
      .then(setCurrentTab)
      .catch(() => setCurrentTab({ url: null, isSupported: false }));
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const url = normalizeAddress(address);
    if (url) void openStudio(url.href);
  };

  return (
    <main className="popup">
      <header className="popup__header">
        <BrandSymbol size={20} />
        <h1 className="popup__title">
          <span className="popup__eyebrow">Neruz</span> Page View
        </h1>
      </header>

      <Button variant="primary" className="popup__hero" isDisabled>
        <Camera size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="popup__hero-text">
          <span className="popup__hero-label">{t('popup.quickShot.label')}</span>
          <span className="popup__hero-hint">{t('popup.quickShot.hint')}</span>
        </span>
      </Button>

      <Button
        variant="secondary"
        className="popup__studio"
        isDisabled={!currentTab.isSupported}
        onPress={() => void openStudio(currentTab.url ?? undefined)}
      >
        <PanelsTopLeft size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="popup__hero-text">
          <span>{t('popup.openStudio.label')}</span>
          <span className="popup__hint">{t('popup.openStudio.hint')}</span>
        </span>
      </Button>
      {!currentTab.isSupported && <p className="popup__notice">{t('popup.unsupportedPage')}</p>}

      <form className="popup__form" onSubmit={submit}>
        <TextField
          className="popup__field"
          aria-label={t('popup.openUrl.placeholder')}
          value={address}
          onChange={setAddress}
        >
          <Input
            className="pv-input popup__input"
            placeholder={t('popup.openUrl.placeholder')}
            spellCheck={false}
            autoComplete="off"
          />
        </TextField>
        <Button type="submit" variant="secondary" className="popup__go">
          {t('popup.openUrl.button')}
        </Button>
      </form>

      <footer className="popup__footer">
        <a href="https://fontedev.com" target="_blank" rel="noopener">
          {t('settings.credits')}
        </a>
      </footer>
    </main>
  );
}
