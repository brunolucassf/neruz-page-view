import { useCapture } from '../capture/captureStore';
import { useLocale } from '../i18n';
import type { ThemePreference } from './persistence';
import { useSettings } from './settingsStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function resolveTheme(preference: ThemePreference): 'dark' | 'light' {
  if (preference !== 'system') return preference;
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function applyTheme() {
  document.documentElement.dataset.theme = resolveTheme(useSettings.getState().settings.theme);
}

function applyLocale() {
  useLocale.getState().applyPreference(useSettings.getState().settings.locale);
}

function applyCaptureDefaults() {
  const { printMode, imageFormat, imageQuality } = useSettings.getState().captureDefaults;
  useCapture.setState({ mode: printMode, format: imageFormat, quality: imageQuality });
}

export function startSettingsEffects(): void {
  let previous = useSettings.getState();
  useSettings.subscribe((state) => {
    if (state.settings.theme !== previous.settings.theme) applyTheme();
    if (state.settings.locale !== previous.settings.locale) applyLocale();
    if (state.captureDefaults !== previous.captureDefaults) applyCaptureDefaults();
    previous = state;
  });
  window.matchMedia(DARK_QUERY).addEventListener('change', applyTheme);
  applyTheme();
  applyLocale();
}

export async function hydrateSettings(): Promise<void> {
  await useSettings.getState().hydrate();
  applyTheme();
  applyLocale();
  applyCaptureDefaults();
}
