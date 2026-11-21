import type { SettingsExport } from '@neruz/core';
import { DEFAULT_CAPTURE_DEFAULTS, DEFAULT_SETTINGS } from '@neruz/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const memory = vi.hoisted(() => new Map<string, unknown>());

vi.mock('wxt/utils/storage', () => ({
  storage: {
    defineItem: (key: string, options: { fallback: unknown }) => ({
      key,
      getValue: async () => (memory.has(key) ? memory.get(key) : options.fallback),
      setValue: async (value: unknown) => {
        memory.set(key, value);
      },
    }),
  },
}));

const {
  applySettingsExport,
  buildSettingsExport,
  keepKnownFavorites,
  loadFavorites,
  saveFavorites,
} = await import('./items');

const CUSTOM_ID = '3f2b8c1e-6a4d-4b7e-9c10-1a2b3c4d5e6f';
const customDevice = {
  id: CUSTOM_ID,
  name: 'Totem',
  width: 1080,
  height: 1920,
  dpr: 2,
  type: 'tv' as const,
  frame: 'none' as const,
};
const CATALOG_ID = 'iphone-14';

beforeEach(() => {
  memory.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('keepKnownFavorites', () => {
  it('mantém catálogo e personalizadas conhecidas e descarta o resto', () => {
    expect(keepKnownFavorites([CATALOG_ID, CUSTOM_ID, 'fantasma'], [CUSTOM_ID])).toEqual([
      CATALOG_ID,
      CUSTOM_ID,
    ]);
  });
});

describe('loadFavorites', () => {
  it('lê favorito de personalizada existente', async () => {
    memory.set('local:devices.favorites', [CUSTOM_ID]);
    expect(await loadFavorites([CUSTOM_ID])).toEqual([CUSTOM_ID]);
  });

  it('filtra em memória sem regravar a lista', async () => {
    memory.set('local:devices.favorites', [CUSTOM_ID, CATALOG_ID]);
    expect(await loadFavorites([])).toEqual([CATALOG_ID]);
    expect(memory.get('local:devices.favorites')).toEqual([CUSTOM_ID, CATALOG_ID]);
  });

  it('devices.custom inválido cai em [] e não apaga favoritos gravados', async () => {
    memory.set('local:devices.custom', [{ id: 'quebrado' }]);
    memory.set('local:devices.favorites', [CUSTOM_ID, CATALOG_ID]);
    const { loadCustomDevices } = await import('./items');
    const customs = await loadCustomDevices();
    expect(customs).toEqual([]);
    expect(await loadFavorites(customs.map((device) => device.id))).toEqual([CATALOG_ID]);
    expect(memory.get('local:devices.favorites')).toEqual([CUSTOM_ID, CATALOG_ID]);
  });
});

describe('export e import', () => {
  it('export grava favorito de personalizada junto com a personalizada', async () => {
    memory.set('local:devices.custom', [customDevice]);
    await saveFavorites([CUSTOM_ID, CATALOG_ID, 'fantasma']);
    const payload = await buildSettingsExport();
    expect(payload.data.devicesFavorites).toEqual([CUSTOM_ID, CATALOG_ID]);
  });

  it('import filtra favoritos contra as personalizadas do próprio arquivo', async () => {
    const payload: SettingsExport = {
      schema: 'neruz.pageview.settings',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        settings: DEFAULT_SETTINGS,
        devicesCustom: [customDevice],
        devicesFavorites: [CUSTOM_ID, CATALOG_ID, 'fantasma', '7c9e6679-7425-40de-944b-e07fc1f90ae7'],
        kits: [],
        captureDefaults: DEFAULT_CAPTURE_DEFAULTS,
      },
    };
    await applySettingsExport(payload);
    expect(memory.get('local:devices.favorites')).toEqual([CUSTOM_ID, CATALOG_ID]);
  });
});
