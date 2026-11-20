import { Button, IconButton } from '@neruz/ui';
import { X } from 'lucide-react';
import { t } from '../i18n';
import { useLibrary } from '../library/libraryStore';
import { useStudio } from '../shell/studioStore';

export function BenchBar() {
  const open = useLibrary((state) => state.open);
  const dismissHint = useLibrary((state) => state.dismissHint);
  const isHintVisible = useLibrary((state) => state.isHintVisible);
  const hasScreens = useStudio((state) => state.screens.length > 0);

  return (
    <div className="bench-bar">
      <div className="bench-bar__add">
        <Button
          variant="secondary"
          className="bench-bar__add-button"
          data-add-screen=""
          aria-label={t('studio.bar.addScreen.a11y')}
          onPress={() => {
            dismissHint();
            open();
          }}
        >
          {t('studio.bar.addScreen')}
        </Button>
        {isHintVisible && hasScreens && (
          <div
            className="bench-hint pv-cut"
            role="status"
            onKeyDown={(event) => event.key === 'Escape' && dismissHint()}
          >
            <span>{t('welcome.firstHint')}</span>
            <IconButton label={t('welcome.firstHint.dismiss')} onPress={dismissHint}>
              <X size={14} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          </div>
        )}
      </div>
    </div>
  );
}
