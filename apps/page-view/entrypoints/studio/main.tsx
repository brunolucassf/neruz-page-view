import '@neruz/ui/tokens.css';
import '@neruz/ui/fonts.css';
import '@neruz/ui/base.css';
import '@neruz/ui/graphics.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudioApp } from '../../src/features/shell/StudioApp';
import { openPage, startStudioSession } from '../../src/features/shell/studioSession';

const container = document.querySelector<HTMLElement>('#app');

if (container) {
  startStudioSession();
  createRoot(container).render(
    <StrictMode>
      <StudioApp />
    </StrictMode>,
  );
  const initialAddress = new URLSearchParams(location.search).get('url');
  if (initialAddress) void openPage(initialAddress);
}
