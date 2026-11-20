import '@neruz/ui/tokens.css';
import '@neruz/ui/fonts.css';
import '@neruz/ui/base.css';
import '@neruz/ui/graphics.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupApp } from '../../src/features/popup/PopupApp';

const container = document.querySelector<HTMLElement>('#app');

if (container) {
  createRoot(container).render(
    <StrictMode>
      <PopupApp />
    </StrictMode>,
  );
}
