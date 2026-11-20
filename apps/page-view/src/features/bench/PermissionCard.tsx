import { animateEnter, Button } from '@neruz/ui';
import { LockKeyhole } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import { isLocalAddress } from '../shell/address';
import { allowPageOrigin, declinePageOrigin } from '../shell/studioSession';
import { useStudio } from '../shell/studioStore';

export function PermissionCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const pageUrl = useStudio((state) => state.pageUrl);
  const access = useStudio((state) => state.access);

  useEffect(() => {
    if (cardRef.current) animateEnter(cardRef.current);
  }, []);

  if (!pageUrl) return null;
  const url = new URL(pageUrl);
  const domain = url.hostname;
  const isRequesting = access === 'requesting';
  const isDenied = access === 'denied';

  return (
    <div className="bench__overlay">
      <section
        ref={cardRef}
        className="state-card state-card--permission pv-cut"
        aria-labelledby="permission-title"
      >
        <LockKeyhole className="state-card__icon" size={24} strokeWidth={1.75} aria-hidden="true" />
        <h2 id="permission-title" className="state-card__title">
          {t('perm.site.title', { domain })}
        </h2>
        <p className="state-card__body">
          {isLocalAddress(url)
            ? t('perm.localhost.body', { domain })
            : t('perm.site.body', { domain })}
        </p>
        {isDenied && (
          <p className="state-card__note" aria-live="polite">
            {t('perm.site.denied')}
          </p>
        )}
        <div className="state-card__actions">
          <Button
            variant="primary"
            isLarge
            isDisabled={isRequesting}
            onPress={() => void allowPageOrigin()}
          >
            {t('perm.site.allow')}
          </Button>
          {!isDenied && (
            <Button variant="ghost" onPress={declinePageOrigin}>
              {t('perm.site.later')}
            </Button>
          )}
        </div>
        {isDenied && (
          <div className="state-card__alt">
            <Button variant="secondary" isDisabled>
              {t('perm.site.captureTabOnly')}
            </Button>
            <p className="state-card__note">{t('perm.site.captureTabOnly.hint')}</p>
          </div>
        )}
      </section>
    </div>
  );
}
