import type { BatchImageFormat } from './types';

const MAX_PAGE_SLUG_LENGTH = 48;
const MAX_SCREEN_SLUG_LENGTH = 40;
const MAX_ZIP_PATH_LENGTH = 200;
const DEFAULT_PAGE_SLUG = 'inicio';
const DEFAULT_SCREEN_SLUG = 'tela';

const IMAGE_EXTENSIONS: Record<BatchImageFormat, string> = {
  png: 'png',
  jpeg: 'jpg',
  webp: 'webp',
};

export type BatchFileSpec =
  | { kind: 'print'; part: number | null }
  | { kind: 'moment'; number: number }
  | { kind: 'frame' };

const pad = (value: number, digits: number): string => String(value).padStart(digits, '0');

const safeDecode = (text: string): string => {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
};

export const slugify = (text: string, maxLength: number): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');

export const sanitizeZipPath = (path: string): string =>
  path
    .toLowerCase()
    .replace(/[^a-z0-9._/-]/g, '-')
    .replace(/\.{2,}/g, '.')
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.')
    .join('/')
    .slice(0, MAX_ZIP_PATH_LENGTH);

const hostLabel = (url: string): string => {
  const { hostname, port } = new URL(url);
  const host = slugifyHost(hostname);
  return port ? `${host}-${port}` : host;
};

const slugifyHost = (hostname: string): string =>
  hostname.toLowerCase().replace(/[^a-z0-9.-]/g, '-');

const formatStamp = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1, 2)}-${pad(date.getDate(), 2)}_${pad(date.getHours(), 2)}${pad(date.getMinutes(), 2)}`;

export type RootFolderInput = {
  firstUrl: string;
  originCount: number;
  startedAt: Date;
};

export const rootFolderName = ({ firstUrl, originCount, startedAt }: RootFolderInput): string => {
  const base = hostLabel(firstUrl);
  const host = originCount > 1 ? `${base}-mais-${originCount - 1}` : base;
  return `neruz-page-view_${host}_${formatStamp(startedAt)}`;
};

export const pageFolderName = (index: number, url: string): string => {
  const segments = new URL(url).pathname.split('/').filter(Boolean).map(safeDecode);
  const slug = slugify(segments.join('-'), MAX_PAGE_SLUG_LENGTH) || DEFAULT_PAGE_SLUG;
  return `${pad(index, 3)}-${slug}`;
};

export const screenFolderName = (position: number, label: string): string => {
  const slug = slugify(label, MAX_SCREEN_SLUG_LENGTH) || DEFAULT_SCREEN_SLUG;
  return `${pad(position, 2)}-${slug}`;
};

export const imageExtension = (format: BatchImageFormat): string => IMAGE_EXTENSIONS[format];

export const fileName = (spec: BatchFileSpec, format: BatchImageFormat): string => {
  const extension = imageExtension(format);
  if (spec.kind === 'frame') return `moldura.${extension}`;
  if (spec.kind === 'moment') return `momentos/momento-${pad(spec.number, 2)}.${extension}`;
  return spec.part === null
    ? `print.${extension}`
    : `print-parte-${pad(spec.part, 2)}.${extension}`;
};

export const screenFilePath = (pageFolder: string, screenFolder: string, name: string): string =>
  sanitizeZipPath(`${pageFolder}/${screenFolder}/${name}`);

export const zipEntryPath = (rootFolder: string, relativePath: string): string =>
  sanitizeZipPath(`${rootFolder}/${relativePath}`);

export const zipFileName = (rootFolder: string, part?: { index: number; total: number }): string =>
  part && part.total > 1
    ? `${rootFolder}_parte-${part.index}-de-${part.total}.zip`
    : `${rootFolder}.zip`;
