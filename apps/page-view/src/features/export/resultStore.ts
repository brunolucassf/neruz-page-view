import { create } from 'zustand';
import type { CapturedShot } from './exportService';

type ResultState = {
  shots: CapturedShot[];
  host: string;
  captureId: number;
  previewSource: Blob | null;
  isPreparing: boolean;
  setCaptured: (shots: CapturedShot[], host: string, previewSource: Blob | null) => void;
  setPreparing: (isPreparing: boolean) => void;
};

export const useResult = create<ResultState>()((set) => ({
  shots: [],
  host: '',
  captureId: 0,
  previewSource: null,
  isPreparing: false,
  setCaptured: (shots, host, previewSource) =>
    set((state) => ({ shots, host, previewSource, captureId: state.captureId + 1 })),
  setPreparing: (isPreparing) => set({ isPreparing }),
}));
