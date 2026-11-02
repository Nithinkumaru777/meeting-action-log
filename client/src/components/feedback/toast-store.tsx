import { createStore } from '../../lib/store';
import { AnimatedIcon, type IconName } from '../ui/animated-icon';

export type ToastTone = 'ok' | 'warn' | 'err' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  body?: string;
  tone: ToastTone;
  undo?: () => void;
  leaving?: boolean;
}

interface ToastState {
  toasts: ToastItem[];
  push: (input: { title: string; body?: string; tone?: ToastTone; undo?: () => void }) => string;
  dismiss: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

let toastSeq = 0;

export const useToastStore = createStore<ToastState>((set) => ({
  toasts: [],
  push: ({ title, body, tone = 'ok', undo }) => {
    const id = `toast-${++toastSeq}`;
    set((state) => {
      const next = [...state.toasts, { id, title, body, tone, undo }];
      if (next.length > 3) {
        return {
          toasts: next.map((t, idx) => (idx === 0 ? { ...t, leaving: true } : t)),
        };
      }
      return { toasts: next };
    });
    return id;
  },
  dismiss: (id) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
    })),
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clear: () => set({ toasts: [] }),
}));

export function toast(input: {
  title: string;
  body?: string;
  tone?: ToastTone;
  undo?: () => void;
}): string {
  return useToastStore.getState().push(input);
}

const TONE_ICON: Record<ToastTone, IconName> = {
  ok: 'check',
  warn: 'alarm',
  err: 'alert',
  info: 'bulb',
};

export function ToastViewport() {
  const { toasts, dismiss, remove } = useToastStore();

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast ${t.tone} ${t.leaving ? 'out' : ''}`}
          role="status"
          onAnimationEnd={(e) => {
            if (e.currentTarget.classList.contains('out')) {
              remove(t.id);
            }
          }}
        >
          <span className="tico">
            <AnimatedIcon name={TONE_ICON[t.tone]} play />
          </span>
          <div>
            <b>{t.title}</b>
            {t.body ? <p>{t.body}</p> : null}
          </div>
          <div className="tacts">
            {t.undo && (
              <button
                type="button"
                className="btn btn-ghost btn-sm ah"
                onClick={() => {
                  t.undo?.();
                  remove(t.id);
                }}
              >
                <span className="lbl">
                  <AnimatedIcon name="undo" />
                  Undo
                </span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-icon ah"
              aria-label="Dismiss"
              onClick={() => {
                dismiss(t.id);
                setTimeout(() => remove(t.id), 220);
              }}
            >
              <AnimatedIcon name="x" />
            </button>
          </div>
          <i
            className="drain"
            onAnimationEnd={(e) => {
              e.stopPropagation();
              dismiss(t.id);
              setTimeout(() => remove(t.id), 220);
            }}
          />
        </div>
      ))}
    </div>
  );
}
