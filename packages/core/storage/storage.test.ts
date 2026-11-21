import * as v from 'valibot';
import { describe, expect, it } from 'vitest';
import { migrateFramedCaptureV1ToV2 } from './migrations';
import {
  CaptureDefaultsSchema,
  DEFAULT_CAPTURE_DEFAULTS,
  DEFAULT_FRAMED_CAPTURE,
  FramedCaptureSchema,
  FramedCaptureV1Schema,
} from './schemas';

describe('migrateFramedCaptureV1ToV2', () => {
  it('keeps the three v1 fields and adds color and scope defaults', () => {
    const migrated = migrateFramedCaptureV1ToV2({
      isEnabled: false,
      frameDeviceId: 'tablet',
      background: 'night',
    });
    expect(migrated).toEqual({
      isEnabled: false,
      frameDeviceId: 'tablet',
      background: 'night',
      backgroundColor: '#C8D4E0',
      scope: 'fold',
    });
    expect(v.safeParse(FramedCaptureSchema, migrated).success).toBe(true);
  });
});

describe('framed capture schemas', () => {
  it('reads an unknown frameDeviceId as null', () => {
    const parsed = v.parse(FramedCaptureV1Schema, {
      isEnabled: true,
      frameDeviceId: 'watch',
      background: 'ice',
    });
    expect(parsed.frameDeviceId).toBeNull();
  });

  it('uppercases the custom color and rejects malformed ones', () => {
    const parsed = v.parse(FramedCaptureSchema, {
      ...DEFAULT_FRAMED_CAPTURE,
      background: 'custom',
      backgroundColor: '#abcdef',
    });
    expect(parsed.backgroundColor).toBe('#ABCDEF');
    expect(
      v.safeParse(FramedCaptureSchema, { ...DEFAULT_FRAMED_CAPTURE, backgroundColor: 'red' })
        .success,
    ).toBe(false);
  });

  it('rejects mockup colors outside #RRGGBB or beyond four items', () => {
    const withColors = (colors: string[]) => ({
      ...DEFAULT_CAPTURE_DEFAULTS,
      mockup: { enabled: true, background: { kind: 'gradient', colors } },
    });
    expect(v.safeParse(CaptureDefaultsSchema, withColors(['#112233'])).success).toBe(true);
    expect(v.safeParse(CaptureDefaultsSchema, withColors(['blue'])).success).toBe(false);
    expect(v.safeParse(CaptureDefaultsSchema, withColors([])).success).toBe(false);
    expect(v.safeParse(CaptureDefaultsSchema, withColors(Array(5).fill('#112233'))).success).toBe(
      false,
    );
  });
});
