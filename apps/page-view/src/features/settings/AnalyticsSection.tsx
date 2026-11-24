import { useEffect, useState } from 'react';
import { Switch } from 'react-aria-components';
import {
  hasFirefoxDataPermission,
  isFirefoxBuild,
  setFirefoxDataPermission,
} from '../analytics/analytics';
import { t } from '../i18n';
import { useSettings } from './settingsStore';

export function AnalyticsSection() {
  const isSettingOn = useSettings((state) => state.settings.analytics);
  const isOpen = useSettings((state) => state.isOpen);
  const patchSettings = useSettings((state) => state.patchSettings);
  const [hasPermission, setHasPermission] = useState(false);
  const isFirefox = isFirefoxBuild();

  useEffect(() => {
    if (isFirefox && isOpen) void hasFirefoxDataPermission().then(setHasPermission);
  }, [isFirefox, isOpen]);

  const handleChange = async (isOn: boolean) => {
    if (!isFirefox) {
      patchSettings({ analytics: isOn });
      return;
    }
    const isGranted = await setFirefoxDataPermission(isOn);
    setHasPermission(isGranted);
    patchSettings({ analytics: isGranted });
  };

  return (
    <section className="settings__group">
      <Switch
        className="framed__switch"
        isSelected={isFirefox ? isSettingOn && hasPermission : isSettingOn}
        onChange={(isOn) => void handleChange(isOn)}
      >
        <span className="framed__track" aria-hidden="true">
          <span className="framed__thumb" />
        </span>
        <span className="framed__label">{t('settings.analytics.label')}</span>
      </Switch>
      <p className="settings__hint">{t('settings.analytics.hint')}</p>
    </section>
  );
}
