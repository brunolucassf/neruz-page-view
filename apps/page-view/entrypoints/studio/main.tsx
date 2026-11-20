import '@neruz/ui/tokens.css';
import '@neruz/ui/fonts.css';
import '@neruz/ui/base.css';
import '@neruz/ui/graphics.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { useFramed } from '../../src/features/capture/framedStore';
import { useLibrary } from '../../src/features/library/libraryStore';
import { StudioApp } from '../../src/features/shell/StudioApp';
import { runInitialLaunch, startStudioSession } from '../../src/features/shell/studioSession';

const container = document.querySelector<HTMLElement>('#app');

if (container) {
  startStudioSession();
  createRoot(container).render(
    <StrictMode>
      <StudioApp />
    </StrictMode>,
  );
  void useLibrary.getState().hydrate();
  void useFramed.getState().hydrate();
  void runInitialLaunch();
}
