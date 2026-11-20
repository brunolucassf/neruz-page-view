import { Button } from '@neruz/ui';
import { AppWindow, ArrowLeft } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Input, TextField } from 'react-aria-components';
import { t } from '../i18n';
import { findCurrentTabAddress, openExtensionsPage, openPage } from '../shell/studioSession';
import { type EmptyReason, useStudio } from '../shell/studioStore';
import './empty.css';

const EXAMPLE_ADDRESSES = ['localhost:3000', 'localhost:5173', 'localhost:4321'];

export function EmptyState() {
  const emptyReason = useStudio((state) => state.emptyReason);
  const lastPageUrl = useStudio((state) => state.lastPageUrl);
  const [address, setAddress] = useState('');
  const [isFieldFocused, setIsFieldFocused] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [backUrl, setBackUrl] = useState<string | null>(lastPageUrl);
  const isUnsupported = emptyReason !== 'none';

  useEffect(() => {
    if (!isUnsupported || lastPageUrl) return;
    let isCurrent = true;
    void findCurrentTabAddress()
      .catch(() => null)
      .then((found) => isCurrent && setBackUrl(found));
    return () => {
      isCurrent = false;
    };
  }, [isUnsupported, lastPageUrl]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setHasError(!(await openPage(address)));
  };

  const openCurrentTab = async () => {
    const current = await findCurrentTabAddress().catch(() => null);
    if (current) void openPage(current);
  };

  return (
    <div className="empty" data-field-focused={isFieldFocused || undefined}>
      <EmptyIllustration />
      <EmptyHeading reason={emptyReason} />
      {emptyReason === 'file-access' && (
        <Button variant="primary" isLarge onPress={openExtensionsPage}>
          {t('state.file.cta')}
        </Button>
      )}
      <form className="empty__form" onSubmit={(event) => void submit(event)}>
        <TextField
          className="empty__field"
          aria-label={t('studio.bar.url.placeholder')}
          value={address}
          isInvalid={hasError}
          autoFocus={isUnsupported}
          onChange={(value) => {
            setAddress(value);
            setHasError(false);
          }}
        >
          <Input
            className="pv-input empty__input"
            placeholder={t('studio.bar.url.placeholder')}
            spellCheck={false}
            autoComplete="off"
            aria-describedby={hasError ? 'empty-url-error' : undefined}
            onFocus={() => setIsFieldFocused(true)}
            onBlur={() => setIsFieldFocused(false)}
          />
        </TextField>
        <Button type="submit" variant="primary" isLarge>
          {t('studio.bar.url.go')}
        </Button>
      </form>
      {hasError && (
        <p id="empty-url-error" className="empty__error" role="alert">
          {t('studio.bar.url.error')}
        </p>
      )}
      <div className="empty__extras">
        {isUnsupported && backUrl && (
          <Button variant="secondary" onPress={() => void openPage(backUrl)}>
            <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('state.unsupported.back', { domain: safeHostname(backUrl) })}
          </Button>
        )}
        <Button variant="ghost" onPress={() => void openCurrentTab()}>
          <AppWindow size={16} strokeWidth={1.75} aria-hidden="true" />
          {t('studio.bar.useCurrentTab')}
        </Button>
        <span className="empty__examples-label">{t('state.empty.examples')}</span>
        <ul className="empty__examples">
          {EXAMPLE_ADDRESSES.map((example) => (
            <li key={example}>
              <Button
                variant="ghost"
                className="pv-chip pv-cut empty__chip pv-tnum"
                onPress={() => void openPage(example)}
              >
                {example}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function safeHostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function EmptyHeading({ reason }: { reason: EmptyReason }) {
  if (reason === 'none') {
    return (
      <>
        <h1 className="empty__title">{t('state.empty.title')}</h1>
        <p className="empty__body">{t('state.empty.body')}</p>
      </>
    );
  }
  if (reason === 'file-access') {
    return <h1 className="empty__title empty__title--calm">{t('state.file.body')}</h1>;
  }
  return (
    <>
      <h1 className="empty__title empty__title--calm">
        {t(reason === 'store-page' ? 'state.unsupported.store' : 'state.unsupported.title')}
      </h1>
      <p className="empty__body">{t('state.unsupported.body')}</p>
    </>
  );
}

function EmptyIllustration() {
  return (
    <svg className="empty__art" viewBox="0 0 224 140" aria-hidden="true" focusable="false">
      <path className="empty__window" d="M104 122H22L12 112V22L22 12H170L180 22V54" />
      <path className="empty__lines" d="M30 34H86M30 46H128M30 58H110" />
      <path className="empty__viewport" d="M140 66H194L202 74V122L194 130H140L132 122V74Z" />
      <path className="empty__lines empty__viewport" d="M144 84H176M144 94H186" />
    </svg>
  );
}
