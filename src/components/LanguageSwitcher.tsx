import React from 'react';
import { setSavedLang, useLang, type Lang } from '../lib/i18n';

const LANGS: Array<{ id: Lang; short: string; name: string }> = [
  { id: 'id', short: 'ID', name: 'Bahasa Indonesia' },
  { id: 'en', short: 'EN', name: 'English' },
];

export default function LanguageSwitcher() {
  const lang = useLang();

  function handleSelect(next: Lang) {
    setSavedLang(next);
  }

  return (
    <div
      className="inline-flex items-center rounded-full border-2 border-[var(--ink)] bg-[var(--surface)] p-0.5"
      role="group"
      aria-label="Bahasa / Language"
    >
      {LANGS.map((item) => {
        const active = lang === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleSelect(item.id)}
            aria-pressed={active}
            aria-label={item.name}
            title={item.name}
            className={`inline-flex h-11 min-w-[44px] items-center justify-center rounded-full px-2 text-xs font-extrabold tracking-wide transition-colors ${
              active
                ? 'border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                : 'border-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]'
            }`}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
}
