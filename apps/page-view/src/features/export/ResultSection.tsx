import { Button } from '@neruz/ui';
import { Copy, Download } from 'lucide-react';
import { Menu, MenuItem, MenuTrigger, Popover } from 'react-aria-components';
import { type MessageKey, t } from '../i18n';
import type { ExportFormat } from './exportService';
import { copyOutput, exportOutput } from './outputActions';
import { useResult } from './resultStore';
import './export.css';

const ICON_PROPS = {
  size: 16,
  strokeWidth: 1.75,
  strokeLinejoin: 'miter',
  strokeLinecap: 'square',
} as const;

const FORMAT_OPTIONS: { value: ExportFormat; label: MessageKey }[] = [
  { value: 'png', label: 'export.format.png' },
  { value: 'jpeg', label: 'export.format.jpg' },
  { value: 'webp', label: 'export.format.webp' },
  { value: 'pdf', label: 'export.format.pdf' },
  { value: 'zip', label: 'export.format.zip' },
];

function countImages(shots: ReturnType<typeof useResult.getState>['shots']) {
  return shots.reduce((total, shot) => total + shot.result.parts.length, 0);
}

export function ResultSection() {
  const shots = useResult((state) => state.shots);
  const isPreparing = useResult((state) => state.isPreparing);
  if (shots.length === 0) return null;

  return (
    <section className="result" aria-labelledby="result-title">
      <div className="result__head">
        <h3 id="result-title" className="capture-panel__label">
          {t('studio.result.title')}
        </h3>
        <span className="result__count pv-tnum">
          {t('studio.result.count', { n: countImages(shots) })}
        </span>
      </div>
      <div className="result__actions">
        <MenuTrigger>
          <Button variant="secondary" className="result__export" isDisabled={isPreparing}>
            <Download {...ICON_PROPS} aria-hidden="true" />
            {t('export.cta')}
          </Button>
          <Popover className="pv-menu-popover" placement="top start" offset={4}>
            <Menu
              className="pv-menu"
              aria-label={t('export.title')}
              onAction={(key) => void exportOutput(key as ExportFormat)}
            >
              {FORMAT_OPTIONS.map((option) => (
                <MenuItem key={option.value} id={option.value} className="pv-menu__item">
                  {t(option.label)}
                </MenuItem>
              ))}
            </Menu>
          </Popover>
        </MenuTrigger>
        <Button variant="ghost" isDisabled={isPreparing} onPress={() => void copyOutput()}>
          <Copy {...ICON_PROPS} aria-hidden="true" />
          {t('state.success.copy')}
        </Button>
      </div>
    </section>
  );
}
