import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

/**
 * Subtle staggered fade-in for a container's direct children.
 * Respects reduced-motion preferences.
 */
export function useFadeIn<T extends HTMLElement = HTMLDivElement>(
  options?: { delay?: number; stagger?: number; y?: number }
) {
  const ref = useRef<T | null>(null);
  const { delay = 0, stagger = 0.08, y = 12 } = options ?? {};

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const targets = el.querySelectorAll<HTMLElement>('[data-fade-in]');

    if (prefersReduced || targets.length === 0) {
      gsap.set(targets.length ? targets : el, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          delay,
          stagger,
          ease: 'power2.out',
        }
      );
    }, el);

    return () => ctx.revert();
  }, [delay, stagger, y]);

  return ref;
}
