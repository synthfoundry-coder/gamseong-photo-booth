import React, { useEffect, useRef } from 'react';
import { attachLightDismissFallback } from '../lib/dialogFallback';
import { UI_TEXT, useLang } from '../lib/i18n';
import { CloseIcon, MenuIcon } from './Icons';
import ThemeSwitcher from './ThemeSwitcher';

interface MobileMenuDialogProps {
  currentPath: string;
}

export default function MobileMenuDialog({ currentPath }: MobileMenuDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const lang = useLang();
  const t = UI_TEXT[lang].nav;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    return attachLightDismissFallback(dialog);
  }, []);

  function openMenu() {
    dialogRef.current?.showModal();
  }

  function closeMenu() {
    dialogRef.current?.close();
  }

  const navItems = [
    { href: '/', label: t.packs, labelKo: '프롬프트 팩' },
    { href: '/how-to', label: t.howToFull, labelKo: '사용 방법' },
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={openMenu}
        aria-haspopup="dialog"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:bg-[var(--surface-tint)]"
      >
        <MenuIcon className="h-5 w-5" />
        <span>{t.menu}</span>
      </button>

      <dialog
        ref={dialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="mobile-menu-title"
        className="w-[min(92vw,360px)]"
      >
        <div className="p-5">
          <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-4">
            <h2 id="mobile-menu-title" className="text-lg font-extrabold">
              GAMSEONG PHOTO{' '}
              <span className="inline-block break-keep font-semibold text-[var(--ink-muted)]">
                감성네컷
              </span>
            </h2>
            <button
              type="button"
              onClick={closeMenu}
              aria-label={t.closeMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-tint)]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          <nav aria-label="Navigasi seluler" className="mt-4 flex flex-col gap-2">
            {navItems.map((item) => {
              const isCurrent =
                item.href === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? 'page' : undefined}
                  onClick={closeMenu}
                  className={`flex min-h-[48px] items-center justify-between rounded-xl border-2 px-4 py-3 text-base font-bold transition-colors ${
                    isCurrent
                      ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]'
                  }`}
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-semibold opacity-80">{item.labelKo}</span>
                </a>
              );
            })}
          </nav>

          <div className="mt-5 flex items-center justify-between border-t-2 border-[var(--border-subtle)] pt-4">
            <span className="text-sm font-semibold text-[var(--ink-muted)]">{t.boothColor}</span>
            <ThemeSwitcher />
          </div>
        </div>
      </dialog>
    </div>
  );
}
