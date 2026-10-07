import { useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import useThemeStore from '../../store/themeStore';

const THEMES = [
  { value: 'light',  Icon: Sun,     label: 'Light' },
  { value: 'dark',   Icon: Moon,    label: 'Dark'  },
  { value: 'system', Icon: Monitor, label: 'System' },
];

const STYLES = `
  .theme-toggle-wrap {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  /* ── Compact single-button (used in dense headers) ── */
  .theme-btn-icon {
    width: 36px; height: 36px;
    border: none;
    background: transparent;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;
    transition: background 0.18s, color 0.18s, transform 0.18s;
    position: relative;
    overflow: hidden;
  }
  .theme-btn-icon:hover {
    background: var(--bg-surface-2);
    color: var(--text-primary);
    transform: rotate(15deg) scale(1.1);
  }

  /* ── Pill segmented toggle ── */
  .theme-pill {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    background: var(--bg-surface-2);
    border: 1px solid var(--border-default);
    border-radius: 9999px;
    padding: 3px;
    position: relative;
  }
  .theme-pill-btn {
    display: flex; align-items: center; justify-content: center; gap: 5px;
    padding: 5px 12px;
    border: none;
    border-radius: 9999px;
    background: transparent;
    color: var(--text-muted);
    font-size: 0.75rem; font-weight: 600;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: color 0.2s;
    white-space: nowrap;
    position: relative; z-index: 1;
  }
  .theme-pill-btn:hover { color: var(--text-primary); }
  .theme-pill-btn.active { color: var(--text-primary); }
  .theme-pill-indicator {
    position: absolute;
    top: 3px; bottom: 3px;
    border-radius: 9999px;
    background: var(--bg-surface);
    box-shadow: 0 1px 6px rgba(0,0,0,0.12);
    transition: left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
                width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
    pointer-events: none;
  }
  [data-theme="dark"] .theme-pill-indicator {
    box-shadow: 0 1px 6px rgba(0,0,0,0.45);
  }
`;

let styleInjected = false;
function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const tag = document.createElement('style');
  tag.id = 'theme-toggle-styles';
  tag.textContent = STYLES;
  document.head.appendChild(tag);
}

/* ─────────────────────────────────────────────────────────
   ThemeToggle — default: compact cycling icon button
   variant="pill" → shows a 3-way segmented control
   ───────────────────────────────────────────────────────── */
export default function ThemeToggle({ variant = 'icon', className = '' }) {
  const { theme, setTheme, cycleTheme, resolvedTheme } = useThemeStore();
  const resolved = resolvedTheme();

  useEffect(() => { injectStyles(); }, []);

  if (variant === 'pill') {
    // Figure out the pixel position of the active indicator
    // Each button is ~80px wide (approx) — we use a ref-less approach via CSS vars
    const idx = THEMES.findIndex((t) => t.value === theme);

    return (
      <div className={`theme-toggle-wrap ${className}`}>
        <div className="theme-pill" role="group" aria-label="Theme selector">
          {/* Sliding indicator — positioned by CSS custom property */}
          <span
            className="theme-pill-indicator"
            style={{
              left:  `calc(3px + ${idx} * (100% - 6px) / 3)`,
              width: 'calc((100% - 6px) / 3)',
            }}
          />
          {THEMES.map(({ value, Icon, label }) => (
            <button
              key={value}
              className={`theme-pill-btn${theme === value ? ' active' : ''}`}
              onClick={() => setTheme(value)}
              aria-pressed={theme === value}
              title={label}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* default: icon button that cycles through modes */
  const CurrentIcon = resolved === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const nextLabel   = theme === 'light' ? 'Switch to dark' : theme === 'dark' ? 'Switch to system' : 'Switch to light';

  return (
    <div className={`theme-toggle-wrap ${className}`}>
      <button
        className="theme-btn-icon"
        onClick={cycleTheme}
        title={nextLabel}
        aria-label={nextLabel}
      >
        <CurrentIcon size={18} />
      </button>
    </div>
  );
}
