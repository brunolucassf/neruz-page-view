import * as v from 'valibot';
import { FrameInfoSchema } from '../types';
import { defineEvent, defineRequest, EmptySchema } from './envelope';
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

export const STUDIO_NOTICES = ['browser-page', 'store-page', 'file-access'] as const;

export const StudioNoticeSchema = v.picklist(STUDIO_NOTICES);

export const StudioLaunchSchema = v.object({
  url: v.nullable(v.pipe(v.string(), v.maxLength(2048))),
  notice: v.nullable(StudioNoticeSchema),
  permission: v.picklist(['granted', 'denied', 'not-requested']),
});

export type StudioNotice = v.InferOutput<typeof StudioNoticeSchema>;
export type StudioLaunch = v.InferOutput<typeof StudioLaunchSchema>;

export const EMPTY_STUDIO_LAUNCH: StudioLaunch = {
  url: null,
  notice: null,
  permission: 'not-requested',
};

export const bgStudioLaunch = defineRequest(
  'bg.studio.launch',
  EmptySchema,
  StudioLaunchSchema,
  3000,
);

export const uiOpenUrl = defineEvent('ui.openUrl', StudioLaunchSchema);

export const uiActionClicked = defineEvent(
  'ui.actionClicked',
  v.object({ recording: v.picklist(['idle', 'finalizing']) }),
);

export const uiEvents = [uiOpenUrl, uiActionClicked] as const;

export const bgRecArm = defineRequest(
  'bg.rec.arm',
  v.object({ ...RecConfigSchema.entries, tryStartNow: v.optional(v.boolean()) }),
  v.object({ armedUntil: v.pipe(v.number(), v.finite()), started: v.boolean() }),
  3000,
);
export const bgRecCancel = defineRequest('bg.rec.cancel', EmptySchema, EmptySchema);
export const bgRecRelease = defineRequest(
  'bg.rec.release',
  v.object({ blobUrl: v.pipe(v.string(), v.maxLength(512)) }),
  EmptySchema,
);

export const backgroundRequests = [
  bgStudioEnable,
  bgStudioDisable,
  bgScriptsSync,
  bgFramesList,
  bgStudioLaunch,
  bgRecArm,
  bgRecCancel,
  bgRecRelease,
] as const;
