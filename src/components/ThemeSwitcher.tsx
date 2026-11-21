import React, { useEffect, useState } from 'react';
import { getSavedTheme, setSavedTheme, THEME_EVENT, type ThemeId } from '../lib/storage';

const THEMES: Array<{ id: ThemeId; label: string; swatch: string }> = [
  { id: 'yellow', label: 'Kakao Yellow theme', swatch: '#FEE500' },
  { id: 'pink', label: 'Pastel Pink theme', swatch: '#FFB8CD' },
  { id: 'blue', label: 'Pastel Blue theme', swatch: '#9FD4FF' },
];

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>('yellow');

  useEffect(() => {
    setTheme(getSavedTheme());
    const handler = (event: Event) => {
      const custom = event as CustomEvent<ThemeId>;
      if (custom.detail) setTheme(custom.detail);
    };
    window.addEventListener(THEME_EVENT, handler);
    return () => window.removeEventListener(THEME_EVENT, handler);
  }, []);

  function handleSelect(next: ThemeId) {
    setTheme(next);
    setSavedTheme(next);
  }

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] px-1"
      role="group"
      aria-label="Color theme"
    >
      {THEMES.map((item) => {
        const active = theme === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            aria-label={item.label}
            aria-pressed={active}
            title={item.label}
            className="relative flex h-11 w-11 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          >
            <span
              className="block h-6 w-6 rounded-full border-2 border-[var(--ink)]"
              style={{ backgroundColor: item.swatch }}
            />
            {active && (
              <span
                className="pointer-events-none absolute inset-1 rounded-full border-2 border-[var(--ink)]"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
