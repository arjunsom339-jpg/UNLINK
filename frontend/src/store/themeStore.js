import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Detect the OS-level preferred color scheme (dark/light).
 */
const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/**
 * Apply the theme to <html> by setting data-theme attribute.
 */
const applyTheme = (theme) => {
  const resolved = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.setAttribute('data-theme', resolved);
};

const useThemeStore = create(
  persist(
    (set, get) => ({
      /** 'light' | 'dark' | 'system' */
      theme: 'system',

      /** Apply stored theme on hydration */
      init: () => {
        applyTheme(get().theme);
      },

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },

      /** Cycles: light → dark → system → light */
      cycleTheme: () => {
        const order = ['light', 'dark', 'system'];
        const current = get().theme;
        const next = order[(order.indexOf(current) + 1) % order.length];
        get().setTheme(next);
      },

      /** Returns the effective theme that is actually rendered */
      resolvedTheme: () => {
        const t = get().theme;
        return t === 'system' ? getSystemTheme() : t;
      },
    }),
    {
      name: 'unilink-theme',
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    }
  )
);

export default useThemeStore;
