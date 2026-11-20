import {
  type FrameInfo,
  FrameInfoSchema,
  type StudioLaunch,
  StudioLaunchSchema,
} from '@neruz/core';
import * as v from 'valibot';

const tabId = v.pipe(v.number(), v.integer());

const StudioTabsSchema = v.array(tabId);
const DnrRulesSchema = v.array(v.object({ tabId, ruleIds: v.array(tabId) }));
const FramesSchema = v.array(v.object({ tabId, frames: v.array(FrameInfoSchema) }));

const STUDIO_TABS_KEY = 'studioTabs';
const DNR_RULES_KEY = 'dnrRules';
const StudioOriginsSchema = v.array(
  v.object({ studioTabId: tabId, originTabId: v.nullable(tabId) }),
);
const StudioLaunchesSchema = v.array(v.object({ studioTabId: tabId, launch: StudioLaunchSchema }));

const FRAMES_KEY = 'frames';
const STUDIO_ORIGINS_KEY = 'studioOrigins';
const STUDIO_LAUNCH_KEY = 'studioLaunch';
const MAX_TRACKED_STUDIOS = 50;

const readSession = async <TSchema extends v.GenericSchema>(
  key: string,
  schema: TSchema,
  fallback: v.InferOutput<TSchema>,
): Promise<v.InferOutput<TSchema>> => {
  const stored = await chrome.storage.session.get(key);
  const parsed = v.safeParse(schema, stored[key]);
  return parsed.success ? parsed.output : fallback;
};

const writeSession = (key: string, value: unknown) => chrome.storage.session.set({ [key]: value });

export const readStudioTabs = () => readSession(STUDIO_TABS_KEY, StudioTabsSchema, []);

export const writeStudioTabs = (tabs: number[]) => writeSession(STUDIO_TABS_KEY, tabs);

export const readDnrRules = () => readSession(DNR_RULES_KEY, DnrRulesSchema, []);

export const writeDnrRules = (rules: v.InferOutput<typeof DnrRulesSchema>) =>
  writeSession(DNR_RULES_KEY, rules);

export const readAllFrames = () => readSession(FRAMES_KEY, FramesSchema, []);

export const readFramesOfTab = async (tab: number): Promise<FrameInfo[]> =>
  (await readAllFrames()).find((entry) => entry.tabId === tab)?.frames ?? [];

export const writeFramesOfTab = async (tab: number, frames: FrameInfo[]) => {
  const others = (await readAllFrames()).filter((entry) => entry.tabId !== tab);
  await writeSession(FRAMES_KEY, frames.length ? [...others, { tabId: tab, frames }] : others);
};

export type StudioOrigin = v.InferOutput<typeof StudioOriginsSchema>[number];

export const readStudioOrigins = () => readSession(STUDIO_ORIGINS_KEY, StudioOriginsSchema, []);

export const writeStudioOrigins = (origins: StudioOrigin[]) =>
  writeSession(STUDIO_ORIGINS_KEY, origins.slice(-MAX_TRACKED_STUDIOS));

const readStudioLaunches = () => readSession(STUDIO_LAUNCH_KEY, StudioLaunchesSchema, []);

export const storeStudioLaunch = async (studioTabId: number, launch: StudioLaunch) => {
  const others = (await readStudioLaunches()).filter((entry) => entry.studioTabId !== studioTabId);
  await writeSession(
    STUDIO_LAUNCH_KEY,
    [...others, { studioTabId, launch }].slice(-MAX_TRACKED_STUDIOS),
  );
};

export const takeStudioLaunch = async (studioTabId: number): Promise<StudioLaunch | null> => {
  const entries = await readStudioLaunches();
  const found = entries.find((entry) => entry.studioTabId === studioTabId);
  if (!found) return null;
  await writeSession(
    STUDIO_LAUNCH_KEY,
    entries.filter((entry) => entry.studioTabId !== studioTabId),
  );
  return found.launch;
};
