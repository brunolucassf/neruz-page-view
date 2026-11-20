import { BrandSymbol, Button } from '@neruz/ui';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { t } from '../i18n';
import { useLibrary } from '../library/libraryStore';

const SHORTCUTS = [
  { label: 'shortcuts.capture', keys: ['C'] },
  { label: 'shortcuts.mirror', keys: ['M'] },
  { label: 'shortcuts.zoom', keys: ['+', '-'] },
  { label: 'shortcuts.fit', keys: ['0'] },
  { label: 'shortcuts.focus', keys: ['1', '9'] },
  { label: 'shortcuts.remove', keys: ['Delete'] },
  { label: 'shortcuts.undo', keys: ['Ctrl', 'Z'] },
  { label: 'shortcuts.cancel', keys: ['Esc'] },
] as const;

export function WelcomeDialog() {
  const isOpen = useLibrary((state) => state.isWelcomeOpen);
  const finishWelcome = useLibrary((state) => state.finishWelcome);
  return (
    <ModalOverlay
      className="welcome__overlay"
      isOpen={isOpen}
      onOpenChange={(open) => !open && finishWelcome()}
    >
      <Modal>
        <Dialog className="welcome__dialog pv-cut" aria-labelledby="welcome-title">
          <BrandSymbol size={48} className="welcome__symbol" />
          <Heading slot="title" id="welcome-title" className="welcome__title">
            {t('welcome.title')}
          </Heading>
          <ul className="welcome__benefits">
            <li>{t('welcome.benefit1')}</li>
            <li>{t('welcome.benefit2')}</li>
            <li>{t('welcome.benefit3')}</li>
          </ul>
          <div className="welcome__actions">
            <Button variant="primary" isLarge autoFocus onPress={finishWelcome}>
              {t('welcome.start')}
            </Button>
            <Button variant="ghost" onPress={finishWelcome}>
              {t('welcome.skip')}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export function ShortcutsDialog() {
  const isOpen = useLibrary((state) => state.isShortcutsOpen);
  const setShortcutsOpen = useLibrary((state) => state.setShortcutsOpen);
  return (
    <ModalOverlay
      className="welcome__overlay"
      isOpen={isOpen}
      onOpenChange={setShortcutsOpen}
      isDismissable
    >
      <Modal>
        <Dialog className="welcome__dialog pv-cut" aria-labelledby="shortcuts-title">
          <Heading slot="title" id="shortcuts-title" className="shortcuts__title">
            {t('shortcuts.title')}
          </Heading>
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
          <p className="shortcuts__note">{t('shortcuts.typingNote')}</p>
          <Button variant="secondary" autoFocus onPress={() => setShortcutsOpen(false)}>
            {t('common.close')}
          </Button>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
