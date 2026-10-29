import { useEffect } from 'react';
import type { State } from '../../shared/model';
import { contrastInk } from '../styles/colors';

export function useAppearance(settings: State['settings'] | undefined) {
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;
    const system = matchMedia('(prefers-color-scheme: dark)');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const mode =
        settings.theme === 'system' ? (system.matches ? 'dark' : 'light') : settings.theme;
      root.dataset.theme = mode;
      root.dataset.visualStyle = settings.visualStyle;
      root.dataset.decorations = settings.decorationIntensity > 0 ? 'on' : 'off';
      root.style.setProperty('--decoration-strength', String(settings.decorationIntensity / 100));
      // Custom colors are used only by Original, retained unchanged in storage in both styles.
      const accent =
        settings.visualStyle === 'original'
          ? settings.accent
          : mode === 'dark'
            ? '#adc9fc'
            : '#365e91';
      root.style.setProperty('--accent', accent);
      root.style.setProperty('--accent-ink', contrastInk(accent));
      const animate =
        settings.visualStyle === 'sky-cherry' &&
        settings.decorationIntensity > 0 &&
        settings.decorativeAnimations &&
        !reduce.matches &&
        !document.hidden &&
        root.dataset.windowVisible !== 'false';
      root.dataset.decorativeMotion = animate ? 'running' : 'paused';
    };
    apply();
    const unsubscribe = window.grello.onVisibilityChanged((visible) => {
      root.dataset.windowVisible = String(visible);
      apply();
    });
    system.addEventListener('change', apply);
    reduce.addEventListener('change', apply);
    document.addEventListener('visibilitychange', apply);
    return () => {
      unsubscribe();
      system.removeEventListener('change', apply);
      reduce.removeEventListener('change', apply);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [settings]);
}
