import { Button } from '@neruz/ui';
import {
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Radio,
  RadioGroup,
  Switch,
} from 'react-aria-components';
import { type MessageKey, t } from '../i18n';
import { FRAME_BACKGROUNDS, type FrameBackground } from '../library/persistence';
import { KIND_LABEL } from '../screens/presets';
import { selectActiveScreen, useStudio } from '../shell/studioStore';
import { useFramed } from './framedStore';
import { BACKGROUND_FILL, FRAME_KINDS, type FrameKind, getFrameAsset, toFrameKind } from './frames';
import './framed.css';

const BACKGROUND_LABEL: Record<FrameBackground, MessageKey> = {
  ice: 'studio.capture.background.ice',
  night: 'studio.capture.background.night',
  petrol: 'studio.capture.background.petrol',
  transparent: 'studio.capture.background.none',
};

function useFrameKind(): FrameKind {
  const activeKind = useStudio((state) => selectActiveScreen(state)?.kind ?? 'phone');
  const chosen = useFramed((state) => state.frameDeviceId);
  return FRAME_KINDS.find((kind) => kind === chosen) ?? toFrameKind(activeKind);
}

export function FramedSwitch() {
  const isEnabled = useFramed((state) => state.isEnabled);
  const patch = useFramed((state) => state.patch);

  return (
    <section className="framed" data-on={isEnabled || undefined}>
      <div className="framed__row">
        <Switch
          className="framed__switch"
          isSelected={isEnabled}
          onChange={(isOn) => patch({ isEnabled: isOn })}
        >
          <span className="framed__track" aria-hidden="true">
            <span className="framed__thumb" />
          </span>
          <span className="framed__label">{t('studio.capture.framed.label')}</span>
          {isEnabled && <span className="framed__state">{t('studio.capture.framed.on')}</span>}
        </Switch>
        <FrameThumbnail />
      </div>
      <div className="framed__more">
        <div className="framed__more-inner">
          {!isEnabled && <p className="framed__hint">{t('studio.capture.framed.hint')}</p>}
          {isEnabled && (
            <>
              <FramePicker />
              <BackgroundPicker />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FrameThumbnail() {
  const kind = useFrameKind();
  const background = useFramed((state) => state.background);
  const isDark = useStudio((state) => selectActiveScreen(state)?.isDark ?? false);
  const asset = getFrameAsset(kind, isDark);
  const isLandscape = asset.width > asset.height;
  return (
    <span
      className="framed__thumb-box pv-cut pv-cut--tooth"
      style={{ background: BACKGROUND_FILL[background] }}
    >
      <img
        key={`${kind}-${background}-${isDark}`}
        className="framed__thumb-img"
        src={asset.url}
        alt={t('studio.capture.framed.previewAlt')}
        width={isLandscape ? 44 : Math.round((44 * asset.width) / asset.height)}
        height={isLandscape ? Math.round((44 * asset.height) / asset.width) : 44}
      />
    </span>
  );
}

function FramePicker() {
  const kind = useFrameKind();
  const patch = useFramed((state) => state.patch);
  return (
    <div className="framed__control">
      <span className="framed__control-name">
        {t('studio.capture.framed.device', { device: t(KIND_LABEL[kind]) })}
      </span>
      <MenuTrigger>
        <Button variant="ghost">{t('studio.capture.framed.change')}</Button>
        <Popover className="pv-menu-popover" placement="bottom end" offset={4}>
          <Menu
            className="pv-menu"
            selectionMode="single"
            selectedKeys={[kind]}
            onAction={(key) => patch({ frameDeviceId: String(key) })}
          >
            {FRAME_KINDS.map((item) => (
              <MenuItem key={item} id={item} className="pv-menu__item">
                {t(KIND_LABEL[item])}
              </MenuItem>
            ))}
          </Menu>
        </Popover>
      </MenuTrigger>
    </div>
  );
}

function BackgroundPicker() {
  const background = useFramed((state) => state.background);
  const patch = useFramed((state) => state.patch);
  return (
    <RadioGroup
      className="framed__control framed__backgrounds"
      aria-label={t('studio.capture.background.label')}
      orientation="horizontal"
      value={background}
      onChange={(value) => patch({ background: value as FrameBackground })}
    >
      {FRAME_BACKGROUNDS.map((item) => (
        <Radio
          key={item}
          value={item}
          aria-label={t(BACKGROUND_LABEL[item])}
          className="framed__swatch"
          data-kind={item}
          style={{ '--swatch': BACKGROUND_FILL[item] } as React.CSSProperties}
        />
      ))}
    </RadioGroup>
  );
}
