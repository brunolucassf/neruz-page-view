import * as v from 'valibot';
import { FrameInfoSchema } from '../types';
import { defineRequest, EmptySchema } from './envelope';
import { RecConfigSchema } from './recording';

const originList = v.array(v.pipe(v.string(), v.maxLength(512)));
const tabId = v.pipe(v.number(), v.integer());

export const bgStudioEnable = defineRequest(
  'bg.studio.enable',
  EmptySchema,
  v.object({ tabId, grantedOrigins: originList, ruleIds: v.array(tabId) }),
);

export const bgStudioDisable = defineRequest('bg.studio.disable', EmptySchema, EmptySchema);

export const bgScriptsSync = defineRequest(
  'bg.scripts.sync',
  EmptySchema,
  v.object({ origins: originList }),
);

export const bgFramesList = defineRequest(
  'bg.frames.list',
  EmptySchema,
  v.object({ frames: v.array(FrameInfoSchema) }),
  3000,
);

export const bgPopupOpenStudio = defineRequest(
  'bg.popup.openStudio',
  v.object({ url: v.optional(v.pipe(v.string(), v.maxLength(4096))) }),
  v.object({ tabId }),
);

export const bgRecArm = defineRequest(
  'bg.rec.arm',
  RecConfigSchema,
  v.object({ armedUntil: v.pipe(v.number(), v.finite()) }),
  3000,
);
export const bgRecTrigger = defineRequest('bg.rec.trigger', EmptySchema, EmptySchema);
export const bgRecCancel = defineRequest('bg.rec.cancel', EmptySchema, EmptySchema);
export const bgRecRelease = defineRequest(
  'bg.rec.release',
  v.object({ blobUrl: v.pipe(v.string(), v.maxLength(512)) }),
  EmptySchema,
);

export type BackgroundAudience = 'studio' | 'popup';

export const backgroundRoutes = [
  { definition: bgStudioEnable, audience: 'studio' },
  { definition: bgStudioDisable, audience: 'studio' },
  { definition: bgScriptsSync, audience: 'studio' },
  { definition: bgFramesList, audience: 'studio' },
  { definition: bgPopupOpenStudio, audience: 'popup' },
  { definition: bgRecArm, audience: 'studio' },
  { definition: bgRecTrigger, audience: 'popup' },
  { definition: bgRecCancel, audience: 'studio' },
  { definition: bgRecRelease, audience: 'studio' },
] as const;
