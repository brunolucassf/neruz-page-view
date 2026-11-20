import { useEffect } from 'react';
import { cancelCapture, runCapture, useCapture } from '../capture/captureStore';
import { useLibrary } from '../library/libraryStore';
import { stepZoom } from '../screens/layout';
import { removeScreenWithUndo } from './studioSession';
import { useStudio } from './studioStore';

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

function focusScreen(position: number) {
  const button = document.querySelector<HTMLElement>(`[data-screen-key="${position}"]`);
  button?.focus();
}

export function useShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && useCapture.getState().isRunning) {
        cancelCapture();
        return;
      }
      if (isTypingTarget(event.target)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        if (useStudio.getState().undo()) event.preventDefault();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const studio = useStudio.getState();
      if (!studio.pageUrl) return;
      const key = event.key.toLowerCase();
      if (key === '+' || key === '=') studio.setZoom(stepZoom(studio.zoom, 1));
      else if (key === '-') studio.setZoom(stepZoom(studio.zoom, -1));
      else if (key === '0') studio.fitToBench();
      else if (key === 'm') studio.setMirror(!studio.isMirrorOn);
      else if (key === 'c') void runCapture();
      else if (key === 'delete') removeScreenWithUndo(studio.activeScreenId);
      else if (key === '/') useLibrary.getState().open();
      else if (/^[1-9]$/.test(key)) focusScreen(Number(key));
      else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
