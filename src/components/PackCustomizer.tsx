import React, { useEffect, useMemo, useRef, useState } from 'react';
import { SITE_CONFIG } from '../config/site';
import { attachLightDismissFallback } from '../lib/dialogFallback';
import { downloadKitZip } from '../lib/kit';
import {
  FAVORITES_EVENT,
  getFavorites,
  getSavedPicks,
  savePicks,
  toggleFavorite,
} from '../lib/storage';
import { compilePackPrompt } from '../lib/template';
import type { CustomizerSelection, LibraryData, PromptPack } from '../lib/types';
import {
  CameraIcon,
  CheckIcon,
  CloseIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  HeartIcon,
  LockIcon,
  ResetIcon,
  ZoomIcon,
} from './Icons';

interface PackCustomizerProps {
  pack: PromptPack;
  library: LibraryData;
}

type StepId = 'props' | 'backdrop' | 'pose' | 'mood';

const STEPS: Array<{ id: StepId; num: string; label: string; labelKo: string }> = [
  { id: 'props', num: '01', label: 'Props', labelKo: '소품' },
  { id: 'backdrop', num: '02', label: 'Backdrop', labelKo: '배경' },
  { id: 'pose', num: '03', label: 'Pose', labelKo: '포즈' },
  { id: 'mood', num: '04', label: 'Mood', labelKo: '무드' },
];

export default function PackCustomizer({ pack, library }: PackCustomizerProps) {
  const [selection, setSelection] = useState<CustomizerSelection>(pack.defaults);
  const [activeStep, setActiveStep] = useState<StepId>('props');
  const [isRevealed, setIsRevealed] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [zipStatus, setZipStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [zipError, setZipError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const lightboxRef = useRef<HTMLDialogElement>(null);
  const revealSectionRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<StepId, HTMLButtonElement | null>>({
    props: null,
    backdrop: null,
    pose: null,
    mood: null,
  });
  const panelRefs = useRef<Record<StepId, HTMLDivElement | null>>({
    props: null,
    backdrop: null,
    pose: null,
    mood: null,
  });

  // Load focusgroup polyfill only when native focusgroup is unsupported.
  useEffect(() => {
    if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'focusGroup')) {
      import('@microsoft/focusgroup-polyfill')
        .then(({ polyfill }) => {
          if (typeof polyfill === 'function') polyfill(document.body);
        })
        .catch(() => {
          // Arrow-key navigation fallback below still works without the polyfill.
        });
    }
  }, []);

  // Restore saved picks & favorite status from browser storage after hydration.
  useEffect(() => {
    const favs = getFavorites();
    setIsFavorite(favs.includes(pack.slug));

    const saved = getSavedPicks(pack.slug);
    if (saved) {
      setSelection({
        headwear:
          saved.headwear === null ||
          (typeof saved.headwear === 'string' && pack.allowed.headwear.includes(saved.headwear))
            ? saved.headwear
            : pack.defaults.headwear,
        eyewear:
          saved.eyewear === null ||
          (typeof saved.eyewear === 'string' && pack.allowed.eyewear.includes(saved.eyewear))
            ? saved.eyewear
            : pack.defaults.eyewear,
        accessory:
          saved.accessory === null ||
          (typeof saved.accessory === 'string' && pack.allowed.accessory.includes(saved.accessory))
            ? saved.accessory
            : pack.defaults.accessory,
        backdrop:
          typeof saved.backdrop === 'string' && pack.allowed.backdrops.includes(saved.backdrop)
            ? saved.backdrop
            : pack.defaults.backdrop,
        pose:
          typeof saved.pose === 'string' && pack.allowed.poses.includes(saved.pose)
            ? saved.pose
            : pack.defaults.pose,
        mood:
          typeof saved.mood === 'string' && pack.allowed.moods.includes(saved.mood)
            ? saved.mood
            : pack.defaults.mood,
      });
    }

    const onFavChange = (event: Event) => {
      const custom = event as CustomEvent<string[]>;
      const list = Array.isArray(custom.detail) ? custom.detail : getFavorites();
      setIsFavorite(list.includes(pack.slug));
    };
    window.addEventListener(FAVORITES_EVENT, onFavChange);
    return () => window.removeEventListener(FAVORITES_EVENT, onFavChange);
  }, [pack]);

  // Attach Safari light-dismiss fallback to the native lightbox dialog.
  useEffect(() => {
    const dialog = lightboxRef.current;
    if (!dialog) return;
    return attachLightDismissFallback(dialog);
  }, []);

  // Sync find-in-page matches inside hidden="until-found" tab panels.
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const step of STEPS) {
      const panel = panelRefs.current[step.id];
      if (!panel) continue;
      const onBeforeMatch = () => setActiveStep(step.id);
      panel.addEventListener('beforematch', onBeforeMatch);
      cleanups.push(() => panel.removeEventListener('beforematch', onBeforeMatch));
    }
    return () => cleanups.forEach((fn) => fn());
  }, []);

  const compiled = useMemo(
    () => compilePackPrompt(pack, library, selection),
    [pack, library, selection]
  );

  function announce(message: string) {
    setAnnouncement('');
    requestAnimationFrame(() => setAnnouncement(message));
  }

  function updateSelection(patch: Partial<CustomizerSelection>) {
    setSelection((prev) => {
      const next = { ...prev, ...patch };
      savePicks(pack.slug, next);
      return next;
    });
    setCopyStatus('idle');
    setZipStatus('idle');
    setZipError(null);
    if (isRevealed) {
      announce('Prompt and kit updated for your new selection.');
    }
  }

  function resetToDefaults() {
    setSelection(pack.defaults);
    savePicks(pack.slug, pack.defaults);
    setCopyStatus('idle');
    setZipStatus('idle');
    setZipError(null);
    announce('Reset all options to preview defaults.');
  }

  function selectStep(stepId: StepId, shouldFocus = false) {
    setActiveStep(stepId);
    const btn = tabRefs.current[stepId];
    if (btn) {
      btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (shouldFocus) btn.focus();
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const idx = STEPS.findIndex((s) => s.id === activeStep);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      selectStep(STEPS[(idx + 1) % STEPS.length].id, true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      selectStep(STEPS[(idx - 1 + STEPS.length) % STEPS.length].id, true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectStep(STEPS[0].id, true);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectStep(STEPS[STEPS.length - 1].id, true);
    }
  }

  function handleReveal() {
    setIsRevealed(true);
    setShowFlash(true);
    announce('Prompt revealed. Copy the prompt and download your numbered reference kit.');
    setTimeout(() => setShowFlash(false), 380);
    setTimeout(() => {
      revealSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  }

  async function handleCopyPrompt() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(compiled.prompt);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = compiled.prompt;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        if (!ok) throw new Error('Copy command failed');
      }
      setCopyStatus('copied');
      announce('Prompt copied to clipboard.');
      setTimeout(() => setCopyStatus('idle'), 2600);
    } catch {
      setCopyStatus('error');
      announce('Could not copy automatically. Select the prompt text and copy manually.');
    }
  }

  async function handleDownloadZip() {
    setZipStatus('loading');
    setZipError(null);
    announce('Packing your numbered reference kit ZIP.');
    try {
      await downloadKitZip(pack, compiled);
      setZipStatus('done');
      announce('Reference kit ZIP downloaded.');
      setTimeout(() => setZipStatus('idle'), 2600);
    } catch (err) {
      setZipStatus('error');
      const msg =
        err instanceof Error ? err.message : 'Download failed while preparing the ZIP archive.';
      setZipError(msg);
      announce(`Download failed: ${msg}`);
    }
  }

  function handleToggleFavorite() {
    const next = toggleFavorite(pack.slug);
    const fav = next.includes(pack.slug);
    setIsFavorite(fav);
    announce(fav ? `Saved ${pack.title} to favorites.` : `Removed ${pack.title} from favorites.`);
  }

  const activeStepIndex = STEPS.findIndex((s) => s.id === activeStep);
  const downloadableFiles = compiled.attachments.filter((a) => !a.isUserSelfie && a.path);

  const selectedHeadwear = selection.headwear ? library.props[selection.headwear] : null;
  const selectedEyewear = selection.eyewear ? library.props[selection.eyewear] : null;
  const selectedAccessory = selection.accessory ? library.props[selection.accessory] : null;
  const selectedBackdrop = library.backdrops[selection.backdrop];
  const selectedPose = library.poses[selection.pose];
  const selectedMood = library.moods[selection.mood];

  return (
    <div className="relative">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {showFlash && (
        <div
          className="shutter-flash-overlay pointer-events-none fixed inset-0 z-50 bg-white"
          aria-hidden="true"
        />
      )}

      {/* Pack Header Row */}
      <div className="flex flex-col gap-4 border-b-2 border-[var(--border-subtle)] pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-[var(--ink)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--ink)]">
              {pack.formatLabel} · {pack.formatLabelKo}
            </span>
            {pack.isSample && (
              <span className="inline-flex items-center rounded-md border border-[var(--border-control)] bg-[var(--surface-tint)] px-2.5 py-1 text-xs font-bold text-[var(--ink-muted)]">
                SAMPLE PACK
              </span>
            )}
            <span className="text-xs font-semibold text-[var(--ink-muted)]">
              {pack.cuts} {pack.cuts === 1 ? 'cut' : 'cuts'} · {compiled.attachments.length} total Gemini images
            </span>
          </div>

          <h1 className="mt-3 text-[clamp(1.75rem,3.6vw,2.65rem)] font-extrabold leading-tight">
            <span>{pack.title}</span>{' '}
            <span className="inline-block break-keep font-semibold text-[var(--ink-muted)]">
              {pack.titleKo}
            </span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--ink-muted)] sm:text-base">
            {pack.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-pressed={isFavorite}
          className={`inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 self-start rounded-xl border-2 px-4 py-2 text-sm font-bold transition-colors md:self-auto ${
            isFavorite
              ? 'border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]'
              : 'border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-tint)]'
          }`}
        >
          <HeartIcon className="h-5 w-5" filled={isFavorite} />
          <span>{isFavorite ? 'Saved' : 'Save pack'}</span>
        </button>
      </div>

      {/* Main Two-Column Booth Studio */}
      <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Sticky Strip Preview + Live Setup Summary */}
        <aside className="lg:sticky lg:top-24 lg:col-span-5">
          <div className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--ink-muted)]">
                Pack Preview
              </span>
              <button
                type="button"
                onClick={() => lightboxRef.current?.showModal()}
                aria-haspopup="dialog"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border-2 border-[var(--border-control)] bg-[var(--bg)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]"
              >
                <ZoomIcon className="h-4 w-4" />
                <span>Zoom preview</span>
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--bg)] p-3">
              <img
                src={pack.previewImage}
                alt={`${pack.title} preview output`}
                width={pack.previewWidth}
                height={pack.previewHeight}
                fetchPriority="high"
                className="mx-auto block max-h-[480px] w-auto max-w-full rounded-lg object-contain"
              />
            </div>

            {/* Honest Matches-Preview Status */}
            <div className="mt-4 rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-3.5">
              {compiled.matchesPreview ? (
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">
                      Matches preview (default picks)
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      These options reproduce the sample look above. Swap any item on the right to customize.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-[var(--ink)]">Custom booth combo</p>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      Your generated strip will reflect your new picks rather than the sample preview.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetToDefaults}
                    className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] hover:bg-[var(--surface-tint)]"
                  >
                    <ResetIcon className="h-4 w-4" />
                    <span>Reset defaults</span>
                  </button>
                </div>
              )}
            </div>

            {/* Compact Live Selection Receipt */}
            <dl className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
                <dt className="font-semibold text-[var(--ink-muted)]">Props</dt>
                <dd className="mt-1 font-bold text-[var(--ink)]">
                  {[selectedHeadwear?.label, selectedEyewear?.label, selectedAccessory?.label]
                    .filter(Boolean)
                    .join(', ') || 'None'}
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
                <dt className="font-semibold text-[var(--ink-muted)]">Backdrop</dt>
                <dd className="mt-1 flex items-center gap-1.5 font-bold text-[var(--ink)]">
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--ink)]"
                    style={{ backgroundColor: selectedBackdrop?.swatchHex }}
                    aria-hidden="true"
                  />
                  <span>{selectedBackdrop?.label}</span>
                </dd>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
                <dt className="font-semibold text-[var(--ink-muted)]">Pose</dt>
                <dd className="mt-1 font-bold text-[var(--ink)]">{selectedPose?.label}</dd>
              </div>
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-2.5">
                <dt className="font-semibold text-[var(--ink-muted)]">Mood</dt>
                <dd className="mt-1 font-bold text-[var(--ink)]">{selectedMood?.label}</dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Right Column: Step Customizer + Prompt Reveal */}
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-extrabold">
                Customize Your Booth{' '}
                <span className="font-semibold text-[var(--ink-muted)]">옵션 선택</span>
              </h2>
              <span className="text-xs font-bold text-[var(--ink-muted)]">
                Step {activeStepIndex + 1} of {STEPS.length}
              </span>
            </div>

            {/* Single-row scrollable accessible tablist per modern-web-guidance */}
            <div
              {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
              role="tablist"
              aria-label="Prompt customization steps"
              onKeyDown={handleTabKeyDown}
              className="customizer-tablist mt-4"
            >
              {STEPS.map((step) => {
                const selected = activeStep === step.id;
                return (
                  <button
                    key={step.id}
                    ref={(el) => {
                      tabRefs.current[step.id] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`tab-${step.id}`}
                    aria-selected={selected}
                    tabIndex={selected ? 0 : -1}
                    {...(selected ? ({ focusgroupstart: '' } as Record<string, string>) : {})}
                    onClick={() => selectStep(step.id)}
                    className="customizer-tab"
                  >
                    <span className="font-mono text-xs font-bold text-[var(--accent-text)]">
                      {step.num}
                    </span>
                    <span>{step.label}</span>
                    <span className="text-xs opacity-75">{step.labelKo}</span>
                  </button>
                );
              })}
            </div>

            {/* Panels placed in one grid cell so hidden="until-found" adds zero extra gap */}
            <div className="mt-5 grid grid-cols-1">
              {/* STEP 1: PROPS */}
              <div
                ref={(el) => {
                  panelRefs.current.props = el;
                }}
                role="tabpanel"
                aria-labelledby="tab-props"
                hidden={activeStep !== 'props' ? ('until-found' as unknown as boolean) : undefined}
                className="col-start-1 row-start-1"
              >
                <div className="space-y-6">
                  <p className="text-sm text-[var(--ink-muted)]">
                    Pick up to one item per slot. Selected prop images are added to your numbered download kit so Gemini reproduces their look accurately.
                  </p>

                  {(
                    [
                      {
                        slot: 'headwear',
                        title: 'Headwear',
                        titleKo: '머리 소품',
                        allowedIds: pack.allowed.headwear,
                      },
                      {
                        slot: 'eyewear',
                        title: 'Eyewear',
                        titleKo: '안경 & 선글라스',
                        allowedIds: pack.allowed.eyewear,
                      },
                      {
                        slot: 'accessory',
                        title: 'Hands & Extras',
                        titleKo: '손 소품',
                        allowedIds: pack.allowed.accessory,
                      },
                    ] as const
                  ).map((group) => {
                    if (group.allowedIds.length === 0) return null;
                    const currentVal = selection[group.slot];
                    return (
                      <div key={group.slot}>
                        <div className="mb-2.5 flex items-baseline justify-between">
                          <h3 className="text-sm font-extrabold text-[var(--ink)]">
                            {group.title}{' '}
                            <span className="font-semibold text-[var(--ink-muted)]">
                              {group.titleKo}
                            </span>
                          </h3>
                          <span className="text-xs font-semibold text-[var(--ink-muted)]">
                            {currentVal ? library.props[currentVal]?.label : 'None selected'}
                          </span>
                        </div>

                        <div
                          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                          role="group"
                          aria-label={`${group.title} options`}
                        >
                          <button
                            type="button"
                            onClick={() => updateSelection({ [group.slot]: null })}
                            aria-pressed={currentVal === null}
                            data-selected={currentVal === null ? 'true' : undefined}
                            className={`flex min-h-[120px] flex-col items-center justify-center rounded-[14px] border-2 p-3 text-center transition-colors ${
                              currentVal === null
                                ? 'border-[var(--ink)] bg-[var(--surface-tint)] font-bold'
                                : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                            }`}
                          >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-[var(--border-control)] text-xs font-bold text-[var(--ink-muted)]">
                              OFF
                            </span>
                            <span className="mt-2.5 text-xs font-bold text-[var(--ink)]">
                              No {group.title.toLowerCase()}
                            </span>
                            <span className="text-[11px] text-[var(--ink-muted)]">없음</span>
                          </button>

                          {group.allowedIds.map((id) => {
                            const prop = library.props[id];
                            if (!prop) return null;
                            const isSelected = currentVal === id;
                            return (
                              <button
                                key={id}
                                type="button"
                                onClick={() => updateSelection({ [group.slot]: id })}
                                aria-pressed={isSelected}
                                data-selected={isSelected ? 'true' : undefined}
                                className={`relative flex flex-col items-center rounded-[14px] border-2 p-2.5 text-center transition-colors ${
                                  isSelected
                                    ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                                    : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                                }`}
                              >
                                {isSelected && (
                                  <span
                                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]"
                                    aria-hidden="true"
                                  >
                                    <CheckIcon className="h-3.5 w-3.5" />
                                  </span>
                                )}
                                <img
                                  src={prop.image}
                                  alt=""
                                  width={128}
                                  height={128}
                                  loading="lazy"
                                  className="h-20 w-20 rounded-xl object-contain"
                                />
                                <span className="mt-2 text-xs font-bold leading-tight text-[var(--ink)]">
                                  {prop.label}
                                </span>
                                <span className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                                  {prop.labelKo}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STEP 2: BACKDROP */}
              <div
                ref={(el) => {
                  panelRefs.current.backdrop = el;
                }}
                role="tabpanel"
                aria-labelledby="tab-backdrop"
                hidden={
                  activeStep !== 'backdrop' ? ('until-found' as unknown as boolean) : undefined
                }
                className="col-start-1 row-start-1"
              >
                <div>
                  <p className="mb-4 text-sm text-[var(--ink-muted)]">
                    Choose a pastel curtain or cute studio wallpaper. The chosen backdrop image is bundled into your download kit so lighting matches naturally.
                  </p>
                  <div
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                    role="group"
                    aria-label="Backdrop options"
                  >
                    {pack.allowed.backdrops.map((id) => {
                      const bg = library.backdrops[id];
                      if (!bg) return null;
                      const isSelected = selection.backdrop === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateSelection({ backdrop: id })}
                          aria-pressed={isSelected}
                          data-selected={isSelected ? 'true' : undefined}
                          className={`relative flex flex-col overflow-hidden rounded-[14px] border-2 text-left transition-colors ${
                            isSelected
                              ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {isSelected && (
                            <span
                              className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]"
                              aria-hidden="true"
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <img
                            src={bg.image}
                            alt=""
                            width={180}
                            height={120}
                            loading="lazy"
                            className="h-24 w-full border-b border-[var(--border-subtle)] object-cover"
                          />
                          <div className="p-2.5">
                            <span className="block text-xs font-bold text-[var(--ink)]">
                              {bg.label}
                            </span>
                            <span className="mt-0.5 flex items-center justify-between text-[11px] text-[var(--ink-muted)]">
                              <span>{bg.labelKo}</span>
                              <span className="capitalize">{bg.kind}</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 3: POSE */}
              <div
                ref={(el) => {
                  panelRefs.current.pose = el;
                }}
                role="tabpanel"
                aria-labelledby="tab-pose"
                hidden={activeStep !== 'pose' ? ('until-found' as unknown as boolean) : undefined}
                className="col-start-1 row-start-1"
              >
                <div>
                  <p className="mb-4 text-sm text-[var(--ink-muted)]">
                    Pick a pose direction. Pose previews are visual guides only and stay text-only in the prompt so Gemini keeps your own face from Image 1.
                  </p>
                  <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    role="group"
                    aria-label="Pose pack options"
                  >
                    {pack.allowed.poses.map((id) => {
                      const pose = library.poses[id];
                      if (!pose) return null;
                      const isSelected = selection.pose === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateSelection({ pose: id })}
                          aria-pressed={isSelected}
                          data-selected={isSelected ? 'true' : undefined}
                          className={`relative flex items-center gap-3.5 rounded-[14px] border-2 p-3 text-left transition-colors ${
                            isSelected
                              ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {isSelected && (
                            <span
                              className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]"
                              aria-hidden="true"
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <img
                            src={pose.image}
                            alt=""
                            width={96}
                            height={96}
                            loading="lazy"
                            className="h-20 w-20 shrink-0 rounded-xl border border-[var(--border-subtle)] object-contain bg-[var(--bg)]"
                          />
                          <div className="min-w-0 pr-5">
                            <span className="block text-sm font-extrabold text-[var(--ink)]">
                              {pose.label}
                            </span>
                            <span className="block text-xs font-semibold text-[var(--ink-muted)]">
                              {pose.labelKo}
                            </span>
                            <span className="mt-1 block text-xs leading-snug text-[var(--ink-muted)]">
                              {pose.summary}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* STEP 4: MOOD */}
              <div
                ref={(el) => {
                  panelRefs.current.mood = el;
                }}
                role="tabpanel"
                aria-labelledby="tab-mood"
                hidden={activeStep !== 'mood' ? ('until-found' as unknown as boolean) : undefined}
                className="col-start-1 row-start-1"
              >
                <div>
                  <p className="mb-4 text-sm text-[var(--ink-muted)]">
                    Set the booth flash lighting and film color finish.
                  </p>
                  <div
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                    role="group"
                    aria-label="Lighting and film mood options"
                  >
                    {pack.allowed.moods.map((id) => {
                      const mood = library.moods[id];
                      if (!mood) return null;
                      const isSelected = selection.mood === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => updateSelection({ mood: id })}
                          aria-pressed={isSelected}
                          data-selected={isSelected ? 'true' : undefined}
                          className={`relative flex items-start gap-3 rounded-[14px] border-2 p-3.5 text-left transition-colors ${
                            isSelected
                              ? 'border-[var(--ink)] bg-[var(--surface-tint)]'
                              : 'border-[var(--border-subtle)] bg-[var(--surface)] hover:border-[var(--ink)]'
                          }`}
                        >
                          {isSelected && (
                            <span
                              className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--accent)] text-[var(--on-accent)]"
                              aria-hidden="true"
                            >
                              <CheckIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <span
                            className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border-2 border-[var(--ink)]"
                            style={{ backgroundColor: mood.swatchHex }}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 pr-5">
                            <span className="block text-sm font-extrabold text-[var(--ink)]">
                              {mood.label}
                            </span>
                            <span className="block text-xs font-semibold text-[var(--ink-muted)]">
                              {mood.labelKo}
                            </span>
                            <span className="mt-1 block text-xs leading-snug text-[var(--ink-muted)]">
                              {mood.summary}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step Navigation Row */}
            <div className="mt-6 flex items-center justify-between gap-3 border-t-2 border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                disabled={activeStepIndex === 0}
                onClick={() => selectStep(STEPS[activeStepIndex - 1].id)}
                className="btn-outline"
              >
                Previous step
              </button>

              {activeStepIndex < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => selectStep(STEPS[activeStepIndex + 1].id)}
                  className="btn-outline"
                >
                  Next: {STEPS[activeStepIndex + 1].label}
                </button>
              ) : !isRevealed ? (
                <button type="button" onClick={handleReveal} className="btn-booth">
                  <CameraIcon className="h-5 w-5" />
                  <span>Reveal prompt · 찰칵!</span>
                </button>
              ) : (
                <span className="text-xs font-bold text-[var(--success-text)]">
                  Prompt ready below
                </span>
              )}
            </div>
          </div>

          {/* Prompt Reveal Section */}
          <div
            ref={revealSectionRef}
            className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-5 sm:p-6"
          >
            {!isRevealed ? (
              <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3.5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-[var(--ink)] bg-[var(--surface-tint)] text-[var(--ink)]">
                    <LockIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-extrabold">
                      Ready to develop your prompt?{' '}
                      <span className="font-semibold text-[var(--ink-muted)]">프롬프트 확인</span>
                    </h2>
                    <p className="mt-1 text-sm text-[var(--ink-muted)]">
                      Your kit prepares {downloadableFiles.length} numbered reference{' '}
                      {downloadableFiles.length === 1 ? 'file' : 'files'} plus your selfie (
                      {compiled.attachments.length} images total for Gemini).
                    </p>
                  </div>
                </div>

                <button type="button" onClick={handleReveal} className="btn-booth shrink-0">
                  <CameraIcon className="h-5 w-5" />
                  <span>Reveal prompt · 찰칵!</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xl font-extrabold">
                      Your Custom Prompt & Kit{' '}
                      <span className="font-semibold text-[var(--ink-muted)]">완성!</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      Changing any option above updates this prompt and file numbering automatically.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRevealed(false)}
                    className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-bold text-[var(--ink-muted)] underline underline-offset-4 hover:text-[var(--ink)]"
                  >
                    Hide prompt
                  </button>
                </div>

                {/* Primary Export Actions */}
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={handleCopyPrompt} className="btn-booth">
                    {copyStatus === 'copied' ? (
                      <>
                        <CheckIcon className="h-5 w-5" />
                        <span>Prompt copied</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="h-5 w-5" />
                        <span>Copy prompt</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={zipStatus === 'loading'}
                    className="btn-outline"
                  >
                    <DownloadIcon className="h-5 w-5" />
                    <span>
                      {zipStatus === 'loading'
                        ? 'Packing ZIP...'
                        : zipStatus === 'done'
                          ? 'Kit ZIP saved'
                          : `Download kit ZIP (${downloadableFiles.length} files)`}
                    </span>
                  </button>

                  <a
                    href={SITE_CONFIG.geminiAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline no-underline"
                  >
                    <span>Open Gemini app</span>
                    <ExternalLinkIcon className="h-4 w-4" />
                  </a>
                </div>

                {/* Explicit error states for clipboard or ZIP */}
                {copyStatus === 'error' && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                  >
                    Browser blocked automatic copy. Select the prompt text in the box below and copy manually.
                  </p>
                )}

                {zipStatus === 'error' && zipError && (
                  <p
                    role="alert"
                    className="mt-3 rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                  >
                    Could not build the ZIP file ({zipError}). Use the individual Save buttons in the checklist below instead.
                  </p>
                )}

                {/* Compiled Prompt Text Box */}
                <div className="mt-5">
                  <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-[var(--ink-muted)]">
                    <span>Compiled Gemini Prompt</span>
                    <span>{compiled.prompt.length} chars</span>
                  </div>
                  <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words rounded-[14px] border-2 border-[var(--ink)] bg-[var(--bg)] p-4 font-mono text-xs leading-relaxed text-[var(--ink)] sm:text-[13px]">
                    {compiled.prompt}
                  </pre>
                </div>

                {/* Numbered Attachment Kit Checklist */}
                <div className="mt-6">
                  <h3 className="text-base font-extrabold text-[var(--ink)]">
                    Numbered Attachment Order ({compiled.attachments.length} images)
                  </h3>
                  <p className="mt-1 text-xs text-[var(--ink-muted)]">
                    Attach these in order inside one Gemini chat message so Image 1, Image 2, and so on match the prompt. On phones, save individual files directly if you prefer not to unzip.
                  </p>

                  <ol className="mt-3 space-y-2.5">
                    {compiled.attachments.map((item) => (
                      <li
                        key={item.imageNumber}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-[var(--ink)] bg-[var(--accent)] font-mono text-xs font-extrabold text-[var(--on-accent)]">
                            0{item.imageNumber}
                          </span>
                          {item.path ? (
                            <img
                              src={item.path}
                              alt=""
                              width={48}
                              height={48}
                              loading="lazy"
                              className="h-12 w-12 shrink-0 rounded-lg border border-[var(--border-control)] bg-white object-cover"
                            />
                          ) : (
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-[var(--border-control)] bg-[var(--surface)] text-[11px] font-bold text-[var(--ink-muted)]">
                              YOU
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[var(--ink)]">
                              Image {item.imageNumber}: {item.label}
                            </p>
                            <p className="truncate font-mono text-xs text-[var(--ink-muted)]">
                              {item.filename}
                            </p>
                          </div>
                        </div>

                        {item.path ? (
                          <a
                            href={item.path}
                            download={item.filename}
                            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg border-2 border-[var(--border-control)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] no-underline hover:border-[var(--ink)] hover:bg-[var(--surface-tint)]"
                          >
                            <DownloadIcon className="h-4 w-4" />
                            <span>Save file</span>
                          </a>
                        ) : (
                          <span className="rounded-md bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-muted)]">
                            Upload from your device first
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Inline Usage Steps */}
                <div className="mt-6 rounded-xl border-2 border-[var(--border-subtle)] bg-[var(--surface-tint)] p-4">
                  <h3 className="text-sm font-extrabold text-[var(--ink)]">
                    Quick run checklist for Gemini
                  </h3>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-relaxed text-[var(--ink)] sm:text-sm">
                    <li>
                      Download the ZIP kit (or save each numbered file above) and open{' '}
                      <a
                        href={SITE_CONFIG.geminiAppUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[var(--accent-text)] underline underline-offset-2"
                      >
                        gemini.google.com
                      </a>
                      .
                    </li>
                    <li>
                      Attach a clear, front-facing selfie first (Image 1), then attach{' '}
                      {downloadableFiles.map((f) => `Image ${f.imageNumber}`).join(', ')} in order.
                    </li>
                    <li>
                      Paste the copied prompt and send. Free Google accounts get daily image generations built into the Gemini app.
                    </li>
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Native Modal Lightbox Dialog per modern-web-guidance */}
      <dialog
        ref={lightboxRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="lightbox-title"
        className="w-[min(92vw,540px)]"
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
            <h2 id="lightbox-title" className="text-base font-extrabold">
              {pack.title} preview
            </h2>
            <button
              type="button"
              onClick={() => lightboxRef.current?.close()}
              aria-label="Close preview lightbox"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-tint)]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border-2 border-[var(--ink)] bg-[var(--bg)] p-3">
            <img
              src={pack.previewImage}
              alt={`${pack.title} full size preview`}
              width={pack.previewWidth}
              height={pack.previewHeight}
              className="mx-auto block max-h-[72dvh] w-auto max-w-full object-contain"
            />
          </div>
          <p className="mt-3 text-center text-xs text-[var(--ink-muted)]">
            Click outside this frame or press Esc to close.
          </p>
        </div>
      </dialog>
    </div>
  );
}
