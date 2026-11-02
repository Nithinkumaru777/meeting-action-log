export const t = {
  feedback: 0.1,
  state: 0.22,
  layout: 0.36,
} as const;

export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  io: [0.65, 0, 0.35, 1] as const,
  spring: [0.34, 1.56, 0.64, 1] as const,
} as const;

export const stagger = {
  list: 0.035,
  drawer: 0.035,
  ruler: 0.028,
} as const;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * 10-particle burst on checkbox completion (prototype.html burst(el))
 */
export function burst(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion() || typeof document === 'undefined') return;
  const r = el.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  const cols = ['#4E9B5C', '#0F5257', '#E3A21A', '#D63C97', '#E0533A'];
  for (let i = 0; i < 10; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    const a = (i / 10) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const d = 22 + Math.random() * 20;
    const dx = Math.cos(a) * d;
    const dy = Math.sin(a) * d;
    p.style.cssText = `left:${cx - 3}px;top:${cy - 3}px;background:${cols[i % cols.length]};border-radius:${i % 2 ? '50%' : '1px'}`;
    document.body.appendChild(p);
    if (typeof p.animate === 'function') {
      p.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          { transform: `translate(${dx}px,${dy}px) rotate(${i * 45}deg) scale(.2)`, opacity: 0 },
        ],
        { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' },
      ).onfinish = () => p.remove();
    } else {
      p.remove();
    }
  }
}

/**
 * Ghost pill flight from source element to target counter element (§7.5 Decision -> Task conversion)
 */
export function flyToCounter(
  fromEl: HTMLElement | null,
  toEl: HTMLElement | null,
  innerHtml: string,
  onArrive?: () => void,
): void {
  if (prefersReducedMotion() || !fromEl || !toEl || typeof document === 'undefined') {
    onArrive?.();
    return;
  }
  const f = fromEl.getBoundingClientRect();
  const tRect = toEl.getBoundingClientRect();
  if (!f.width || !tRect.width) {
    onArrive?.();
    return;
  }
  const g = document.createElement('div');
  g.className = 'ghost';
  g.innerHTML = innerHtml;
  g.style.left = `${f.left + 36}px`;
  g.style.top = `${f.top + 8}px`;
  document.body.appendChild(g);
  const dx = tRect.left + tRect.width / 2 - (f.left + 70);
  const dy = tRect.top + tRect.height / 2 - (f.top + 18);
  if (typeof g.animate === 'function') {
    g.animate(
      [
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        {
          transform: `translate(${dx * 0.45}px,${dy * 0.45 - 32}px) scale(.92)`,
          opacity: 1,
          offset: 0.5,
        },
        { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: 0.15 },
      ],
      { duration: 540, easing: 'cubic-bezier(.22,1,.36,1)' },
    ).onfinish = () => {
      g.remove();
      toEl.classList.remove('bump');
      void toEl.offsetWidth;
      toEl.classList.add('bump');
      onArrive?.();
    };
  } else {
    g.remove();
    onArrive?.();
  }
}

/**
 * Smooth height collapse on row removal / conversion
 */
export function collapseElement(el: HTMLElement | null, done?: () => void): void {
  if (!el || prefersReducedMotion()) {
    done?.();
    return;
  }
  const h = el.offsetHeight;
  if (!h || typeof el.animate !== 'function') {
    done?.();
    return;
  }
  el.style.overflow = 'hidden';
  el.animate(
    [
      { height: `${h}px`, opacity: 1, paddingTop: '12px', paddingBottom: '12px' },
      { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' },
    ],
    { duration: 300, easing: 'cubic-bezier(.65,0,.35,1)' },
  ).onfinish = () => done?.();
}
