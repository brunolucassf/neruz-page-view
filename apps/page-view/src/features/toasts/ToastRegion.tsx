import { animateExit, Button, EASE_OUT, IconButton, prefersReducedMotion } from '@neruz/ui';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { t } from '../i18n';
import { type Toast, useToasts } from './toastStore';
import './toasts.css';

const TONE_ICON = { success: CircleCheck, error: CircleAlert, neutral: Info } as const;

export function ToastRegion() {
  const toasts = useToasts((state) => state.toasts);
  const politeToasts = toasts.filter((toast) => toast.tone !== 'error');
  const urgentToasts = toasts.filter((toast) => toast.tone === 'error');
  return (
    <div className="toast-region">
      <div className="toast-region__list" aria-live="assertive" aria-relevant="additions">
        {urgentToasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
      <div className="toast-region__list" aria-live="polite" aria-relevant="additions">
        {politeToasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </div>
    </div>
  );
}

function ToastCard({ toast }: { toast: Toast }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dismissToast = useToasts((state) => state.dismissToast);
  const removeToast = useToasts((state) => state.removeToast);
  const Icon = TONE_ICON[toast.tone];

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const keyframes: Keyframe[] = prefersReducedMotion()
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [
          { opacity: 0, transform: 'translateY(8px) scale(0.95)' },
          { opacity: 1, transform: 'none' },
        ];
    card.animate(keyframes, { duration: 200, easing: EASE_OUT });
  }, []);

  useEffect(() => {
    const card = cardRef.current;
    if (!toast.isLeaving || !card) return;
    const exit = animateExit(card);
    exit.finished.then(() => removeToast(toast.id)).catch(() => removeToast(toast.id));
  }, [toast.isLeaving, toast.id, removeToast]);

  return (
    <div ref={cardRef} className="toast pv-cut" data-tone={toast.tone}>
      <Icon className="toast__icon" size={18} strokeWidth={1.75} aria-hidden="true" />
      <div className="toast__content">
        <p className="toast__title">{toast.title}</p>
        {toast.body && <p className="toast__body">{toast.body}</p>}
        {toast.actions && toast.actions.length > 0 && (
          <div className="toast__actions">
            {toast.actions.map((action) => (
              <Button key={action.label} variant="secondary" onPress={action.onPress}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      <IconButton
        label={t('common.close')}
        className="toast__close"
        onPress={() => dismissToast(toast.id)}
      >
        <X size={14} strokeWidth={1.75} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
