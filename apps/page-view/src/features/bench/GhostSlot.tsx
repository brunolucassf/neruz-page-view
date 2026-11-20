import { CutMarks } from '@neruz/ui';
import { t } from '../i18n';
import { useLibrary } from '../library/libraryStore';
import type { SlotBox } from '../screens/layout';

export function GhostSlot({ slot, isEmpty }: { slot: SlotBox; isEmpty: boolean }) {
  const open = useLibrary((state) => state.open);
  const dismissHint = useLibrary((state) => state.dismissHint);
  return (
    <div
      className="ghost-slot"
      data-large={isEmpty || undefined}
      style={{ left: slot.x, top: slot.viewportTop, width: slot.width, height: slot.height }}
    >
      <button
        type="button"
        className="ghost-slot__button"
        aria-label={t('studio.bar.addScreen.a11y')}
        onClick={() => {
          dismissHint();
          open();
        }}
      >
        <svg className="ghost-slot__border" aria-hidden="true" focusable="false">
          <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" />
        </svg>
        <CutMarks className="ghost-slot__marks" />
        <span className="ghost-slot__label">{t('studio.grid.ghostSlot')}</span>
        {isEmpty && <span className="ghost-slot__empty">{t('studio.grid.empty')}</span>}
      </button>
    </div>
  );
}
