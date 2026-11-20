import type { ScreenId } from '@neruz/core';
import { IconButton } from '@neruz/ui';
import { Ellipsis } from 'lucide-react';
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { t } from '../i18n';
import { useLibrary } from '../library/libraryStore';
import { removeScreenWithUndo } from '../shell/studioSession';
import { useStudio } from '../shell/studioStore';

type ScreenMenuProps = { screenId: ScreenId; index: number; total: number };

export function ScreenMenu({ screenId, index, total }: ScreenMenuProps) {
  const isFull = useStudio((state) => state.screens.length >= 16);
  const onAction = (key: string | number) => {
    const studio = useStudio.getState();
    if (key === 'swap') useLibrary.getState().open(screenId);
    else if (key === 'rotate') studio.rotateScreen(screenId);
    else if (key === 'dark') studio.toggleScreenDark(screenId);
    else if (key === 'duplicate') studio.duplicateScreen(screenId);
    else if (key === 'remove') removeScreenWithUndo(screenId);
    else if (key === 'before') studio.moveScreen(screenId, -1);
    else if (key === 'after') studio.moveScreen(screenId, 1);
  };

  return (
    <MenuTrigger>
      <IconButton label={t('studio.screen.menu')} className="screen__menu-trigger">
        <Ellipsis size={16} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>
      <Popover className="pv-menu-popover" placement="bottom end" offset={4}>
        <Menu className="pv-menu" onAction={onAction}>
          <MenuItem id="swap" className="pv-menu__item">
            {t('studio.screen.menu.swap')}
          </MenuItem>
          <MenuItem id="rotate" className="pv-menu__item">
            {t('studio.screen.rotate')}
          </MenuItem>
          <MenuItem id="dark" className="pv-menu__item">
            {t('studio.screen.dark')}
          </MenuItem>
          <MenuItem id="duplicate" className="pv-menu__item" isDisabled={isFull}>
            {t('studio.screen.menu.duplicate')}
          </MenuItem>
          <MenuItem id="before" className="pv-menu__item" isDisabled={index === 0}>
            {t('studio.screen.menu.moveBefore')}
          </MenuItem>
          <MenuItem id="after" className="pv-menu__item" isDisabled={index === total - 1}>
            {t('studio.screen.menu.moveAfter')}
          </MenuItem>
          <MenuItem id="remove" className="pv-menu__item pv-menu__item--danger">
            {t('studio.screen.menu.remove')}
          </MenuItem>
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}
