import { FRAME_BACKGROUNDS, type FrameBackground } from '@neruz/core';
import { Button } from '@neruz/ui';
import { useEffect, useState } from 'react';
import {
  Button as AriaButton,
  Dialog,
  DialogTrigger,
  Label,
  Menu,
  MenuItem,
  MenuTrigger,
  Popover,
  Radio,
  RadioGroup,
  Switch,
} from 'react-aria-components';
import { track } from '../analytics/analytics';
import { type MessageKey, t } from '../i18n';
import { KIND_LABEL } from '../screens/presets';
import { selectActiveScreen, useStudio } from '../shell/studioStore';
import { composeLargePreview, usePreview } from './framedPreview';
import { useFramed } from './framedStore';
import { BACKGROUND_FILL, FRAME_KINDS, type FrameKind, getFrameAsset, toFrameKind } from './frames';
import type { FramedScope } from './framing/layout';
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
          onChange={(isOn) => {
            patch({ isEnabled: isOn });
            void track('mockup_toggle', { state: isOn ? 'on' : 'off' });
          }}
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
              <ScopePicker />
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
  const backgroundColor = useFramed((state) => state.backgroundColor);
  const isCustomColor = background === 'custom';
  const isDark = useStudio((state) => selectActiveScreen(state)?.isDark ?? false);
  const previewUrl = usePreview((state) => state.url);
  const asset = getFrameAsset(kind, isDark);
  const isLandscape = asset.width > asset.height;
  const fill = isCustomColor ? backgroundColor : BACKGROUND_FILL[background];

  if (previewUrl) return <PreviewThumbnail previewUrl={previewUrl} fill={fill} />;

  return (
    <span className="framed__thumb-box pv-cut pv-cut--tooth" style={{ background: fill }}>
      <img
        key={`${kind}-${background}-${isCustomColor}-${isDark}`}
        className="framed__thumb-img"
        src={asset.url}
        alt={t('studio.capture.framed.previewAlt')}
        width={isLandscape ? 44 : Math.round((44 * asset.width) / asset.height)}
        height={isLandscape ? Math.round((44 * asset.height) / asset.width) : 44}
      />
    </span>
  );
}

function PreviewThumbnail({ previewUrl, fill }: { previewUrl: string; fill: string }) {
  const [largeUrl, setLargeUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (largeUrl) URL.revokeObjectURL(largeUrl);
    },
    [largeUrl],
  );

  const loadLarge = async (isOpen: boolean) => {
    if (!isOpen) return;
    const blob = await composeLargePreview();
    if (blob) setLargeUrl(URL.createObjectURL(blob));
  };

  return (
    <DialogTrigger onOpenChange={(isOpen) => void loadLarge(isOpen)}>
      <AriaButton
        className="framed__thumb-box framed__thumb-box--button pv-cut pv-cut--tooth"
        style={{ background: fill }}
        aria-label={t('studio.capture.framed.previewOpen')}
      >
        <img
          key={previewUrl}
          className="framed__thumb-img framed__thumb-img--preview"
          src={previewUrl}
          alt={t('studio.capture.framed.previewAlt')}
        />
      </AriaButton>
      <Popover className="framed__preview-popover pv-cut" placement="bottom end" offset={6}>
        <Dialog
          className="framed__preview-dialog"
          aria-label={t('studio.capture.framed.previewAlt')}
        >
          <img
            className="framed__preview-large"
            src={largeUrl ?? previewUrl}
            alt={t('studio.capture.framed.previewAlt')}
          />
        </Dialog>
      </Popover>
    </DialogTrigger>
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
            onAction={(key) => patch({ frameDeviceId: key as FrameKind })}
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
  const backgroundColor = useFramed((state) => state.backgroundColor);
  const isCustomColor = background === 'custom';
  const patch = useFramed((state) => state.patch);
  const chooseCustomColor = useFramed((state) => state.chooseCustomColor);
  return (
    <div className="framed__control framed__backgrounds">
      <RadioGroup
        className="framed__swatches"
        aria-label={t('studio.capture.background.label')}
        orientation="horizontal"
        value={isCustomColor ? '' : background}
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
      <label
        className="framed__swatch framed__swatch--color"
        data-selected={isCustomColor || undefined}
        style={{ '--swatch': backgroundColor } as React.CSSProperties}
      >
        <input
          className="framed__color-input"
          type="color"
          value={backgroundColor}
          aria-label={t('studio.capture.background.custom')}
          onChange={(event) => chooseCustomColor(event.target.value)}
        />
      </label>
    </div>
  );
}

const SCOPE_OPTIONS: { value: FramedScope; label: MessageKey }[] = [
  { value: 'fold', label: 'studio.capture.framed.scope.fold' },
  { value: 'full', label: 'studio.capture.framed.scope.full' },
];

function ScopePicker() {
  const scope = useFramed((state) => state.scope);
  const setScope = useFramed((state) => state.setScope);
  return (
    <RadioGroup
      className="framed__scope"
      value={scope}
      orientation="horizontal"
      onChange={(value) => setScope(value as FramedScope)}
    >
      <Label className="framed__control-name">{t('studio.capture.framed.scope.label')}</Label>
      <div className="segmented">
        {SCOPE_OPTIONS.map((option) => (
          <Radio key={option.value} value={option.value} className="segmented__option">
            {t(option.label)}
          </Radio>
        ))}
      </div>
      {scope === 'full' && (
        <p className="framed__hint">{t('studio.capture.framed.scope.fullHint')}</p>
      )}
    </RadioGroup>
  );
}
