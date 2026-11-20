export const DEVICE_CATEGORIES = [
  'phone',
  'foldable',
  'tablet',
  'laptop',
  'desktop',
  'tv',
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

export type Device = {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
  dpr: number;
  isEssential: boolean;
  isVerified: boolean;
};

type Flag = 'essential' | 'approximate';

const device = (
  id: string,
  name: string,
  category: DeviceCategory,
  width: number,
  height: number,
  dpr: number,
  flag?: Flag,
): Device => ({
  id,
  name,
  category,
  width,
  height,
  dpr,
  isEssential: flag === 'essential',
  isVerified: flag !== 'approximate',
});

export const DEVICES: readonly Device[] = [
  device('iphone-se', 'iPhone SE', 'phone', 375, 667, 2, 'essential'),
  device('iphone-13-mini', 'iPhone 13 mini', 'phone', 375, 812, 3),
  device('iphone-14', 'iPhone 14', 'phone', 390, 844, 3),
  device('iphone-16', 'iPhone 16', 'phone', 393, 852, 3, 'essential'),
  device('iphone-17', 'iPhone 17', 'phone', 402, 874, 3),
  device('iphone-air', 'iPhone Air', 'phone', 420, 912, 3),
  device('iphone-16-plus', 'iPhone 16 Plus', 'phone', 430, 932, 3),
  device('iphone-17-pro-max', 'iPhone 17 Pro Max', 'phone', 440, 956, 3, 'essential'),
  device('android-small', 'Android pequeno', 'phone', 360, 800, 3, 'approximate'),
  device('galaxy-s24', 'Galaxy S24', 'phone', 360, 780, 3, 'essential'),
  device('galaxy-s24-ultra', 'Galaxy S24 Ultra', 'phone', 384, 824, 3.75),
  device('galaxy-s25-ultra', 'Galaxy S25 Ultra', 'phone', 412, 891, 3.5, 'approximate'),
  device('pixel-9', 'Pixel 9', 'phone', 412, 915, 2.625, 'essential'),
  device('pixel-10-pro', 'Pixel 10 Pro', 'phone', 410, 914, 3.125, 'approximate'),
  device('pixel-9-pro-xl', 'Pixel 9 Pro XL', 'phone', 448, 997, 3, 'approximate'),

  device('fold-closed', 'Dobrável fechado', 'foldable', 344, 882, 2.625, 'approximate'),
  device('flip-open', 'Dobrável vertical aberto', 'foldable', 412, 914, 2.625, 'approximate'),
  device('fold-open', 'Dobrável aberto', 'foldable', 673, 841, 2.625, 'approximate'),
  device('fold-open-large', 'Dobrável aberto grande', 'foldable', 768, 884, 2.5, 'approximate'),

  device('ipad-mini', 'iPad mini', 'tablet', 744, 1133, 2, 'essential'),
  device('ipad-9', 'iPad (9ª geração)', 'tablet', 810, 1080, 2),
  device('ipad-10', 'iPad', 'tablet', 820, 1180, 2, 'essential'),
  device('ipad-pro-11', 'iPad Pro 11"', 'tablet', 834, 1210, 2),
  device('ipad-pro-13', 'iPad Pro 13"', 'tablet', 1032, 1376, 2, 'essential'),
  device('galaxy-tab-s9', 'Galaxy Tab S9', 'tablet', 800, 1280, 2, 'approximate'),
  device('surface-pro', 'Surface Pro', 'tablet', 912, 1368, 2),

  device('laptop-1366', 'Notebook 1366', 'laptop', 1366, 768, 1, 'essential'),
  device('laptop-1440', 'Notebook 1440', 'laptop', 1440, 900, 2, 'essential'),
  device('laptop-1536', 'Notebook 1536', 'laptop', 1536, 864, 1.25),
  device('laptop-1600', 'Notebook 1600', 'laptop', 1600, 900, 1),
  device('macbook-air-13', 'MacBook Air 13"', 'laptop', 1470, 956, 2),
  device('macbook-air-15', 'MacBook Air 15"', 'laptop', 1710, 1112, 2),
  device('macbook-pro-14', 'MacBook Pro 14"', 'laptop', 1512, 982, 2),
  device('macbook-pro-16', 'MacBook Pro 16"', 'laptop', 1728, 1117, 2),

  device('desktop-1680', 'Monitor 1680', 'desktop', 1680, 1050, 1),
  device('desktop-1920', 'Monitor Full HD', 'desktop', 1920, 1080, 1, 'essential'),
  device('desktop-1920-1200', 'Monitor 1920 × 1200', 'desktop', 1920, 1200, 1),
  device('desktop-2560', 'Monitor QHD', 'desktop', 2560, 1440, 1, 'essential'),
  device('imac-24', 'iMac 24"', 'desktop', 2240, 1260, 2),
  device('studio-display', 'Studio Display', 'desktop', 2560, 1440, 2),
  device('ultrawide-3440', 'Monitor ultrawide', 'desktop', 3440, 1440, 1),
  device('desktop-3840', 'Monitor 4K', 'desktop', 3840, 2160, 1),

  device('tv-hd', 'TV HD', 'tv', 1280, 720, 1, 'approximate'),
  device('tv-fhd', 'TV Full HD', 'tv', 1920, 1080, 1, 'approximate'),
  device('tv-4k-scaled', 'TV 4K (como o navegador mostra)', 'tv', 1920, 1080, 2, 'approximate'),
  device('tv-4k-native', 'TV 4K (pixels reais)', 'tv', 3840, 2160, 1, 'approximate'),
];

export const ESSENTIAL_DEVICES: readonly Device[] = DEVICES.filter((item) => item.isEssential);

export const STARTER_DEVICE_IDS: readonly string[] = [
  'iphone-16',
  'ipad-10',
  'laptop-1440',
  'desktop-1920',
];

const DEVICES_BY_ID = new Map(DEVICES.map((item) => [item.id, item]));

export const findDevice = (id: string): Device | undefined => DEVICES_BY_ID.get(id);

export const listDevicesByCategory = (category: DeviceCategory): Device[] =>
  DEVICES.filter((item) => item.category === category);

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

export function searchDevices(query: string): Device[] {
  const needle = normalizeSearch(query.trim());
  if (!needle) return [...DEVICES];
  return DEVICES.filter((item) =>
    normalizeSearch(
      `${item.name} ${item.width}x${item.height} ${item.width} ${item.height}`,
    ).includes(needle),
  );
}
