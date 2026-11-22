import React, { useEffect, useMemo, useState } from 'react';
import { FORMAT_LABELS, SAMPLE_PACK_SUBTITLES_ID, UI_TEXT, useLang } from '../lib/i18n';
import { FAVORITES_EVENT, getFavorites, toggleFavorite } from '../lib/storage';
import type { PackFormat, PromptPack } from '../lib/types';
import { HeartIcon, ResetIcon } from './Icons';

interface PackGalleryProps {
  packs: PromptPack[];
}

const FORMAT_FILTER_IDS: Array<{ id: PackFormat | 'all'; labelKo?: string }> = [
  { id: 'all' },
  { id: '4-cut', labelKo: '네컷' },
  { id: '3-cut', labelKo: '세컷' },
  { id: '6-cut', labelKo: '여섯컷' },
  { id: 'polaroid', labelKo: '폴라로이드' },
  { id: 'haru-2x2', labelKo: '하루필름' },
];

export default function PackGallery({ packs }: PackGalleryProps) {
  const lang = useLang();
  const t = UI_TEXT[lang].gallery;
  const formatLabels = FORMAT_LABELS[lang];

  const [format, setFormat] = useState<PackFormat | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(getFavorites());
    const onFavChange = (event: Event) => {
      const custom = event as CustomEvent<string[]>;
      setFavorites(Array.isArray(custom.detail) ? custom.detail : getFavorites());
    };
    window.addEventListener(FAVORITES_EVENT, onFavChange);
    return () => window.removeEventListener(FAVORITES_EVENT, onFavChange);
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const pack of packs) {
      for (const tag of pack.tags) tagSet.add(tag);
    }
    return Array.from(tagSet);
  }, [packs]);

  const filteredPacks = useMemo(() => {
    return packs.filter((pack) => {
      if (format !== 'all' && pack.format !== format) return false;
      if (selectedTag && !pack.tags.includes(selectedTag)) return false;
      if (onlyFavorites && !favorites.includes(pack.slug)) return false;
      return true;
    });
  }, [packs, format, selectedTag, onlyFavorites, favorites]);

  const hasActiveFilters = format !== 'all' || selectedTag !== null || onlyFavorites;

  function resetFilters() {
    setFormat('all');
    setSelectedTag(null);
    setOnlyFavorites(false);
  }

  function handleToggleFav(slug: string) {
    setFavorites(toggleFavorite(slug));
  }

  return (
    <section id="packs" aria-labelledby="packs-heading" className="scroll-mt-24">
      <div className="flex flex-col gap-4 border-b-2 border-[var(--border-subtle)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 id="packs-heading" className="text-2xl font-extrabold sm:text-3xl">
            {t.heading}{' '}
            <span className="inline-block break-keep font-semibold text-[var(--ink-muted)]">
              프롬프트 컬렉션
            </span>
          </h2>
          <p className="mt-1.5 text-sm text-[var(--ink-muted)] sm:text-base">{t.subheading}</p>
        </div>

        <button
          type="button"
          onClick={() => setOnlyFavorites((prev) => !prev)}
          aria-pressed={onlyFavorites}
          className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors md:self-auto ${
            onlyFavorites
              ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
              : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]'
          }`}
        >
          <HeartIcon className="h-4 w-4" filled={onlyFavorites} />
          <span>{t.saved(favorites.length)}</span>
        </button>
      </div>

      {/* Format filters */}
      <div className="mt-5 flex flex-col gap-3">
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t.filterFormatAria}
        >
          {FORMAT_FILTER_IDS.map((item) => {
            const active = format === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFormat(item.id)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition-colors ${
                  active
                    ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                    : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]'
                }`}
              >
                <span>{formatLabels[item.id]}</span>
                {item.labelKo && (
                  <span
                    className={`text-xs font-medium ${active ? 'opacity-85' : 'text-[var(--ink-muted)]'}`}
                  >
                    {item.labelKo}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Theme tag filters */}
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label={t.filterTagAria}
        >
          <span className="mr-1 text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
            {t.tagsLabel}
          </span>
          {allTags.map((tag) => {
            const active = selectedTag === tag;
            return (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(active ? null : tag)}
                aria-pressed={active}
                className={`inline-flex min-h-[44px] items-center rounded-lg border-2 px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]'
                }`}
              >
                #{tag}
              </button>
            );
          })}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold text-[var(--accent-text)] underline underline-offset-4 hover:opacity-80"
            >
              <ResetIcon className="h-4 w-4" />
              <span>{t.clearFilters}</span>
            </button>
          )}
        </div>
      </div>

      {/* Live filter announcement for assistive tech */}
      <p className="sr-only" aria-live="polite">
        {t.liveCount(filteredPacks.length, packs.length)}
      </p>

      {/* Pack grid or explicit empty state */}
      {filteredPacks.length === 0 ? (
        <div className="mt-8 rounded-[20px] border-2 border-dashed border-[var(--border-control)] bg-[var(--surface)] px-6 py-12 text-center">
          <p className="font-[var(--font-display)] text-xl font-extrabold text-[var(--ink)]">
            {onlyFavorites && favorites.length === 0 ? t.emptySavedTitle : t.emptyFilterTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--ink-muted)]">
            {onlyFavorites && favorites.length === 0 ? t.emptySavedDesc : t.emptyFilterDesc}
          </p>
          <button type="button" onClick={resetFilters} className="btn-booth mt-5">
            {t.showAll(packs.length)}
          </button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPacks.map((pack) => {
            const isFav = favorites.includes(pack.slug);
            const subtitle =
              lang === 'id' ? (SAMPLE_PACK_SUBTITLES_ID[pack.slug] ?? pack.subtitle) : pack.subtitle;
            return (
              <article
                key={pack.slug}
                className="group flex flex-col overflow-hidden rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] transition-transform duration-150 hover:-translate-y-1"
              >
                <div className="relative bg-[var(--surface-tint)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center rounded-md border border-[var(--ink)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">
                        {formatLabels[pack.format] ?? pack.formatLabel} · {pack.formatLabelKo}
                      </span>
                      {pack.isSample && (
                        <span className="inline-flex items-center rounded-md border border-[var(--border-control)] bg-[var(--bg)] px-2 py-1 text-xs font-bold text-[var(--ink-muted)]">
                          {t.sampleBadge}
                        </span>
                      )}
                      {pack.isNew && (
                        <span className="inline-flex items-center rounded-md border border-[var(--ink)] bg-[var(--accent)] px-2 py-1 text-xs font-extrabold text-[var(--on-accent)]">
                          {t.newBadge}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFav(pack.slug)}
                      aria-pressed={isFav}
                      aria-label={
                        isFav ? t.removePackAria(pack.title) : t.savePackAria(pack.title)
                      }
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 transition-colors ${
                        isFav
                          ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
                          : 'border-[var(--border-control)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]'
                      }`}
                    >
                      <HeartIcon className="h-5 w-5" filled={isFav} />
                    </button>
                  </div>

                  <a
                    href={`/pack/${pack.slug}`}
                    className="block overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface)]"
                  >
                    <img
                      src={pack.previewImage}
                      alt={`${pack.title} preview`}
                      width={pack.previewWidth}
                      height={pack.previewHeight}
                      loading="lazy"
                      className="mx-auto block max-h-[380px] w-full object-contain bg-[var(--bg)]"
                    />
                  </a>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-xl font-extrabold leading-snug text-[var(--ink)]">
                      <a
                        href={`/pack/${pack.slug}`}
                        className="text-[var(--ink)] no-underline hover:underline underline-offset-4"
                      >
                        {pack.title}
                      </a>
                    </h3>
                    <span className="shrink-0 text-xs font-bold text-[var(--ink-muted)]">
                      {pack.titleKo}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{subtitle}</p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {pack.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                    <span className="rounded-md bg-[var(--bg)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                      {t.cutCount(pack.cuts)}
                    </span>
                  </div>

                  <div className="mt-5 pt-2">
                    <a href={`/pack/${pack.slug}`} className="btn-booth w-full no-underline">
                      {t.customizeCta}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
