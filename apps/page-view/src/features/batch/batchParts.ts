import { ZIP_PART_MAX_BYTES, ZIP_PART_MAX_ENTRIES } from '@neruz/core';

const ENTRY_OVERHEAD_BYTES = 256;
const REPORT_ENTRY_COUNT = 2;

export type PageWeight = { pageIndex: number; bytes: number; entries: number };

export type PartPlanLimits = {
  reservedBytes: number;
  maxBytes?: number;
  maxEntries?: number;
};

export function planZipParts(pages: readonly PageWeight[], limits: PartPlanLimits): number[][] {
  const maxBytes = limits.maxBytes ?? ZIP_PART_MAX_BYTES;
  const maxEntries = limits.maxEntries ?? ZIP_PART_MAX_ENTRIES;
  const parts: number[][] = [];
  let current: number[] = [];
  let currentBytes = limits.reservedBytes;
  let currentEntries = REPORT_ENTRY_COUNT;

  for (const page of pages) {
    const pageBytes = page.bytes + page.entries * ENTRY_OVERHEAD_BYTES;
    const wouldOverflow =
      currentBytes + pageBytes > maxBytes || currentEntries + page.entries > maxEntries;
    if (wouldOverflow && current.length > 0) {
      parts.push(current);
      current = [];
      currentBytes = limits.reservedBytes;
      currentEntries = REPORT_ENTRY_COUNT;
    }
    current.push(page.pageIndex);
    currentBytes += pageBytes;
    currentEntries += page.entries;
  }
  if (current.length > 0 || parts.length === 0) parts.push(current);
  return parts;
}
