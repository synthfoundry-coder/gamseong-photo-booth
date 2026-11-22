import React, { useEffect, useRef, useState } from 'react';
import {
  getItemUsage,
  stripItemReferencesFromPacks,
  type ContentSnapshot,
  type ItemUsageReport,
  type LibraryCategory,
} from '../../lib/adminValidation';
import { attachLightDismissFallback } from '../../lib/dialogFallback';
import { useFormValidationSync } from '../../lib/formValidationSync';
import { optimizeImageFile, slugifyFilename } from '../../lib/imageOptimize';
import type { BackdropOption, MoodOption, PoseOption, PropOption, PropSlot } from '../../lib/types';
import { CloseIcon, PlusIcon, TrashIcon, UploadIcon } from '../Icons';
import type { StagedImageUpload } from './adminTypes';

interface LibraryManagerProps {
  snapshot: ContentSnapshot;
  stagedUploads: Record<string, StagedImageUpload>;
  onUpdateSnapshot: (updater: (prev: ContentSnapshot) => ContentSnapshot) => void;
  onStageUpload: (upload: StagedImageUpload) => void;
  onQueueAssetDelete: (assetUrl: string) => void;
  onAnnounce: (msg: string) => void;
}

const CATEGORIES: Array<{ id: LibraryCategory; label: string; labelKo: string }> = [
  { id: 'props', label: 'Props', labelKo: '소품' },
  { id: 'backdrops', label: 'Backdrops', labelKo: '배경' },
  { id: 'poses', label: 'Poses', labelKo: '포즈' },
  { id: 'moods', label: 'Moods', labelKo: '무드' },
];

type AnyLibraryItem = PropOption | BackdropOption | PoseOption | MoodOption;

interface DraftState {
  category: LibraryCategory;
  isNew: boolean;
  originalId: string | null;
  id: string;
  label: string;
  labelKo: string;
  promptText: string;
  slot: PropSlot;
  kind: 'solid' | 'wallpaper';
  swatchHex: string;
  summary: string;
  image: string;
  attachToKit: boolean;
}

export default function LibraryManager({
  snapshot,
  stagedUploads,
  onUpdateSnapshot,
  onStageUpload,
  onQueueAssetDelete,
  onAnnounce,
}: LibraryManagerProps) {
  const [activeCategory, setActiveCategory] = useState<LibraryCategory>('props');
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    category: LibraryCategory;
    item: AnyLibraryItem;
    usage: ItemUsageReport;
  } | null>(null);

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const tabRefs = useRef<Record<LibraryCategory, HTMLButtonElement | null>>({
    props: null,
    backdrops: null,
    poses: null,
    moods: null,
  });

  useFormValidationSync(formRef, onAnnounce);

  useEffect(() => {
    const cleanups: Array<() => void> = [];
    if (editDialogRef.current) cleanups.push(attachLightDismissFallback(editDialogRef.current));
    if (deleteDialogRef.current) cleanups.push(attachLightDismissFallback(deleteDialogRef.current));
    return () => cleanups.forEach((fn) => fn());
  }, []);

  function resolvePreviewSrc(assetUrl: string): string {
    return stagedUploads[assetUrl]?.dataUrl ?? assetUrl;
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const idx = CATEGORIES.findIndex((c) => c.id === activeCategory);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const next = CATEGORIES[(idx + 1) % CATEGORIES.length].id;
      setActiveCategory(next);
      tabRefs.current[next]?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prev = CATEGORIES[(idx - 1 + CATEGORIES.length) % CATEGORIES.length].id;
      setActiveCategory(prev);
      tabRefs.current[prev]?.focus();
    }
  }

  function openNewModal(category: LibraryCategory) {
    setUploadError(null);
    setDraft({
      category,
      isNew: true,
      originalId: null,
      id: '',
      label: '',
      labelKo: '',
      promptText: '',
      slot: 'headwear',
      kind: 'solid',
      swatchHex: '#FEE500',
      summary: '',
      image: '',
      attachToKit: true,
    });
    editDialogRef.current?.showModal();
  }

  function openEditModal(category: LibraryCategory, item: AnyLibraryItem) {
    setUploadError(null);
    setDraft({
      category,
      isNew: false,
      originalId: item.id,
      id: item.id,
      label: item.label,
      labelKo: item.labelKo,
      promptText: item.promptText,
      slot: 'slot' in item ? item.slot : 'headwear',
      kind: 'kind' in item ? item.kind : 'solid',
      swatchHex: 'swatchHex' in item ? item.swatchHex : '#FFF8D6',
      summary: 'summary' in item ? item.summary : '',
      image: 'image' in item ? item.image : '',
      attachToKit: 'attachToKit' in item ? item.attachToKit : true,
    });
    editDialogRef.current?.showModal();
  }

  async function handleImagePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !draft) return;
    setUploadError(null);
    setUploadBusy(true);
    try {
      const kind =
        draft.category === 'props'
          ? 'prop'
          : draft.category === 'backdrops'
            ? 'backdrop'
            : 'pose';
      const optimized = await optimizeImageFile(file, kind);
      const baseSlug = slugifyFilename(draft.id || draft.label || file.name);
      const folder = draft.category;
      const assetUrl = `/assets/library/${folder}/${baseSlug}.${optimized.extension}`;
      const repoPath = `public${assetUrl}`;

      onStageUpload({
        assetUrl,
        repoPath,
        base64: optimized.base64,
        dataUrl: optimized.dataUrl,
        width: optimized.width,
        height: optimized.height,
        byteSize: optimized.byteSize,
      });

      setDraft((prev) =>
        prev
          ? {
              ...prev,
              id: prev.id || baseSlug,
              image: assetUrl,
            }
          : prev
      );
      onAnnounce(`Optimized and staged ${file.name} (${optimized.width} by ${optimized.height} px).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process image.';
      setUploadError(msg);
    } finally {
      setUploadBusy(false);
      event.target.value = '';
    }
  }

  function handleSaveDraft(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;

    const cleanId = slugifyFilename(draft.id || draft.label);
    if (!cleanId) {
      setUploadError('Provide a valid lowercase ID (letters, numbers, hyphens).');
      return;
    }

    const needsImage = draft.category !== 'moods';
    if (needsImage && !draft.image) {
      setUploadError('Upload an image for this item before saving.');
      return;
    }

    const existingList = snapshot[draft.category];
    if (draft.isNew && existingList.some((x) => x.id === cleanId)) {
      setUploadError(`An item with ID "${cleanId}" already exists in ${draft.category}.`);
      return;
    }

    onUpdateSnapshot((prev) => {
      if (draft.category === 'props') {
        const nextItem: PropOption = {
          id: cleanId,
          label: draft.label.trim(),
          labelKo: draft.labelKo.trim(),
          slot: draft.slot,
          promptText: draft.promptText.trim(),
          image: draft.image,
          attachToKit: draft.attachToKit,
        };
        const nextProps = draft.isNew
          ? [...prev.props, nextItem]
          : prev.props.map((p) => (p.id === draft.originalId ? nextItem : p));
        return { ...prev, props: nextProps };
      }

      if (draft.category === 'backdrops') {
        const nextItem: BackdropOption = {
          id: cleanId,
          label: draft.label.trim(),
          labelKo: draft.labelKo.trim(),
          kind: draft.kind,
          swatchHex: draft.swatchHex,
          promptText: draft.promptText.trim(),
          image: draft.image,
          attachToKit: draft.attachToKit,
        };
        const nextBackdrops = draft.isNew
          ? [...prev.backdrops, nextItem]
          : prev.backdrops.map((b) => (b.id === draft.originalId ? nextItem : b));
        return { ...prev, backdrops: nextBackdrops };
      }

      if (draft.category === 'poses') {
        const nextItem: PoseOption = {
          id: cleanId,
          label: draft.label.trim(),
          labelKo: draft.labelKo.trim(),
          summary: draft.summary.trim(),
          promptText: draft.promptText.trim(),
          image: draft.image,
        };
        const nextPoses = draft.isNew
          ? [...prev.poses, nextItem]
          : prev.poses.map((p) => (p.id === draft.originalId ? nextItem : p));
        return { ...prev, poses: nextPoses };
      }

      const nextItem: MoodOption = {
        id: cleanId,
        label: draft.label.trim(),
        labelKo: draft.labelKo.trim(),
        summary: draft.summary.trim(),
        promptText: draft.promptText.trim(),
        swatchHex: draft.swatchHex,
      };
      const nextMoods = draft.isNew
        ? [...prev.moods, nextItem]
        : prev.moods.map((m) => (m.id === draft.originalId ? nextItem : m));
      return { ...prev, moods: nextMoods };
    });

    editDialogRef.current?.close();
    onAnnounce(`${draft.isNew ? 'Added' : 'Updated'} ${draft.label.trim()} in staged changes.`);
    setDraft(null);
  }

  function openDeleteGuard(category: LibraryCategory, item: AnyLibraryItem) {
    const usage = getItemUsage(category, item.id, snapshot.packs);
    setDeleteTarget({ category, item, usage });
    deleteDialogRef.current?.showModal();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const { category, item, usage } = deleteTarget;
    if (usage.usedAsRequiredDefaultIn.length > 0) return;

    onUpdateSnapshot((prev) => {
      const cleanedPacks = stripItemReferencesFromPacks(category, item.id, prev.packs);
      if (category === 'props') {
        return { ...prev, packs: cleanedPacks, props: prev.props.filter((x) => x.id !== item.id) };
      }
      if (category === 'backdrops') {
        return {
          ...prev,
          packs: cleanedPacks,
          backdrops: prev.backdrops.filter((x) => x.id !== item.id),
        };
      }
      if (category === 'poses') {
        return { ...prev, packs: cleanedPacks, poses: prev.poses.filter((x) => x.id !== item.id) };
      }
      return { ...prev, packs: cleanedPacks, moods: prev.moods.filter((x) => x.id !== item.id) };
    });

    if ('image' in item && item.image) {
      onQueueAssetDelete(item.image);
    }

    deleteDialogRef.current?.close();
    onAnnounce(`Deleted "${item.label}" from staged changes.`);
    setDeleteTarget(null);
  }

  const activeItems = snapshot[activeCategory];

  return (
    <section aria-labelledby="library-heading" className="rounded-[20px] border-2 border-[var(--ink)] bg-[var(--surface)] p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="library-heading" className="text-xl font-extrabold sm:text-2xl">
            Shared Booth Library{' '}
            <span className="inline-block break-keep font-semibold text-[var(--ink-muted)]">
              공용 라이브러리
            </span>
          </h2>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">
            Upload reusable props, pastel backdrops, chibi pose guides, and film moods once, then assign them inside any pack.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openNewModal(activeCategory)}
          className="btn-booth shrink-0 self-start sm:self-auto"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add {activeCategory.slice(0, -1)}</span>
        </button>
      </div>

      {/* Accessible 4-category tablist */}
      <div
        {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
        role="tablist"
        aria-label="Library categories"
        onKeyDown={handleTabKeyDown}
        className="customizer-tablist mt-5"
      >
        {CATEGORIES.map((cat) => {
          const selected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              ref={(el) => {
                tabRefs.current[cat.id] = el;
              }}
              type="button"
              role="tab"
              id={`lib-tab-${cat.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              {...(selected ? ({ focusgroupstart: '' } as Record<string, string>) : {})}
              onClick={() => setActiveCategory(cat.id)}
              className="customizer-tab"
            >
              <span>{cat.label}</span>
              <span className="text-xs opacity-75">{cat.labelKo}</span>
              <span className="rounded-md bg-[var(--bg)] px-1.5 py-0.5 font-mono text-xs font-bold text-[var(--ink)]">
                {snapshot[cat.id].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Category Grid */}
      <div className="mt-5">
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[var(--border-control)] bg-[var(--bg)] px-6 py-10 text-center">
            <p className="font-[var(--font-display)] text-lg font-extrabold">
              No {activeCategory} added yet
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              Create your first item so packs can offer it in the customizer.
            </p>
            <button
              type="button"
              onClick={() => openNewModal(activeCategory)}
              className="btn-booth mt-4"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add {activeCategory.slice(0, -1)}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeItems.map((item) => {
              const usage = getItemUsage(activeCategory, item.id, snapshot.packs);
              const usedCount = new Set([
                ...usage.usedAsRequiredDefaultIn.map((u) => u.slug),
                ...usage.usedAsOptionalDefaultIn.map((u) => u.slug),
                ...usage.usedInAllowedOf.map((u) => u.slug),
              ]).size;

              return (
                <article
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-4"
                >
                  <div>
                    <div className="flex items-start gap-3">
                      {'image' in item ? (
                        <img
                          src={resolvePreviewSrc(item.image)}
                          alt={`${item.label} preview`}
                          width={72}
                          height={72}
                          loading="lazy"
                          className="h-18 w-18 shrink-0 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] object-cover"
                        />
                      ) : (
                        <span
                          className="h-16 w-16 shrink-0 rounded-xl border-2 border-[var(--ink)]"
                          style={{ backgroundColor: item.swatchHex }}
                          aria-hidden="true"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {'slot' in item && (
                            <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--ink-muted)] border border-[var(--border-subtle)]">
                              {item.slot}
                            </span>
                          )}
                          {'kind' in item && (
                            <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] font-bold uppercase text-[var(--ink-muted)] border border-[var(--border-subtle)]">
                              {item.kind}
                            </span>
                          )}
                          <span className="rounded bg-[var(--surface)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ink-muted)]">
                            {usedCount} {usedCount === 1 ? 'pack' : 'packs'}
                          </span>
                        </div>
                        <h3 className="mt-1.5 truncate text-base font-extrabold text-[var(--ink)]">
                          {item.label}
                        </h3>
                        <p className="text-xs font-semibold text-[var(--ink-muted)]">
                          {item.labelKo || 'No Korean label'} ·{' '}
                          <span className="font-mono">{item.id}</span>
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)]">
                      {item.promptText}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3">
                    <button
                      type="button"
                      onClick={() => openEditModal(activeCategory, item)}
                      className="btn-outline flex-1 py-2 text-xs"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteGuard(activeCategory, item)}
                      aria-label={`Delete ${item.label}`}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-[var(--error-text)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--error-text)] hover:bg-[var(--error-bg)]"
                    >
                      <TrashIcon className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Item Native Modal Dialog */}
      <dialog
        ref={editDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="lib-edit-title"
        className="w-[min(94vw,580px)]"
      >
        {draft && (
          <form ref={formRef} onSubmit={handleSaveDraft} className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
              <h3 id="lib-edit-title" className="text-lg font-extrabold">
                {draft.isNew ? `Add ${draft.category.slice(0, -1)}` : `Edit ${draft.label}`}
              </h3>
              <button
                type="button"
                onClick={() => editDialogRef.current?.close()}
                aria-label="Close editor dialog"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-tint)]"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {draft.category !== 'moods' && (
                <div className="rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg)] p-3.5">
                  <div className="flex flex-wrap items-center gap-4">
                    {draft.image ? (
                      <img
                        src={resolvePreviewSrc(draft.image)}
                        alt="Uploaded item preview"
                        width={88}
                        height={88}
                        className="h-22 w-22 rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)] object-contain"
                      />
                    ) : (
                      <div className="flex h-22 w-22 items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-control)] bg-[var(--surface)] text-xs font-bold text-[var(--ink-muted)]">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <label
                        htmlFor="lib-image-upload"
                        className="btn-outline inline-flex text-xs"
                      >
                        <UploadIcon className="h-4 w-4" />
                        <span>
                          {uploadBusy
                            ? 'Optimizing image...'
                            : draft.image
                              ? 'Replace image'
                              : 'Upload image'}
                        </span>
                      </label>
                      <input
                        id="lib-image-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImagePick}
                        className="sr-only"
                      />
                      <p className="mt-2 text-xs text-[var(--ink-muted)]">
                        Auto-resized to {draft.category === 'backdrops' ? '900px' : '512px'} max. PNG transparency preserved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lib-label" className="block text-sm font-bold text-[var(--ink)]">
                    Display Name
                  </label>
                  <span id="lib-label-hint" className="mb-1 block text-xs text-[var(--ink-muted)]">
                    Shown on user option cards (e.g. Plush Cat Ears)
                  </span>
                  <input
                    id="lib-label"
                    type="text"
                    required
                    value={draft.label}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDraft((prev) =>
                        prev
                          ? {
                              ...prev,
                              label: val,
                              id: prev.isNew && !prev.id ? slugifyFilename(val) : prev.id,
                            }
                          : prev
                      );
                    }}
                    aria-describedby="lib-label-hint"
                    data-error="lib-label-error"
                    className="admin-input"
                    placeholder="Plush Cat Ears"
                  />
                  <span id="lib-label-error" className="field-error-msg">
                    Enter a display name for this item.
                  </span>
                </div>

                <div>
                  <label htmlFor="lib-label-ko" className="block text-sm font-bold text-[var(--ink)]">
                    Korean Accent Label
                  </label>
                  <span id="lib-label-ko-hint" className="mb-1 block text-xs text-[var(--ink-muted)]">
                    Optional Hangul label (e.g. 고양이 귀)
                  </span>
                  <input
                    id="lib-label-ko"
                    type="text"
                    value={draft.labelKo}
                    onChange={(e) =>
                      setDraft((prev) => (prev ? { ...prev, labelKo: e.target.value } : prev))
                    }
                    aria-describedby="lib-label-ko-hint"
                    className="admin-input"
                    placeholder="고양이 귀"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="lib-id" className="block text-sm font-bold text-[var(--ink)]">
                    Item ID (slug)
                  </label>
                  <span id="lib-id-hint" className="mb-1 block text-xs text-[var(--ink-muted)]">
                    Lowercase letters, numbers, and hyphens only
                  </span>
                  <input
                    id="lib-id"
                    type="text"
                    required
                    disabled={!draft.isNew}
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    spellCheck={false}
                    value={draft.id}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, id: e.target.value.toLowerCase() } : prev
                      )
                    }
                    aria-describedby="lib-id-hint"
                    data-error="lib-id-error"
                    className="admin-input font-mono text-sm disabled:opacity-60"
                    placeholder="cat-ears"
                  />
                  <span id="lib-id-error" className="field-error-msg">
                    Use lowercase kebab-case like cat-ears or pastel-pink.
                  </span>
                </div>

                {draft.category === 'props' && (
                  <div>
                    <label htmlFor="lib-slot" className="block text-sm font-bold text-[var(--ink)]">
                      Body Slot
                    </label>
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                      Users can pick up to 1 item per slot
                    </span>
                    <select
                      id="lib-slot"
                      value={draft.slot}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev ? { ...prev, slot: e.target.value as PropSlot } : prev
                        )
                      }
                      className="admin-input"
                    >
                      <option value="headwear">Headwear (머리)</option>
                      <option value="eyewear">Eyewear (안경)</option>
                      <option value="accessory">Hands & Extras (손 소품)</option>
                    </select>
                  </div>
                )}

                {draft.category === 'backdrops' && (
                  <div>
                    <label htmlFor="lib-kind" className="block text-sm font-bold text-[var(--ink)]">
                      Backdrop Type
                    </label>
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                      Solid pastel color or patterned wallpaper
                    </span>
                    <select
                      id="lib-kind"
                      value={draft.kind}
                      onChange={(e) =>
                        setDraft((prev) =>
                          prev
                            ? { ...prev, kind: e.target.value as 'solid' | 'wallpaper' }
                            : prev
                        )
                      }
                      className="admin-input"
                    >
                      <option value="solid">Solid pastel</option>
                      <option value="wallpaper">Patterned wallpaper</option>
                    </select>
                  </div>
                )}

                {(draft.category === 'backdrops' || draft.category === 'moods') && (
                  <div>
                    <label
                      htmlFor="lib-swatch"
                      className="block text-sm font-bold text-[var(--ink)]"
                    >
                      Swatch Color
                    </label>
                    <span className="mb-1 block text-xs text-[var(--ink-muted)]">
                      Preview dot shown in the customizer receipt
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        id="lib-swatch"
                        type="color"
                        value={draft.swatchHex}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, swatchHex: e.target.value } : prev
                          )
                        }
                        className="h-11 w-14 rounded-lg border-2 border-[var(--ink)] bg-[var(--surface)] p-1"
                      />
                      <input
                        type="text"
                        aria-label="Hex color value"
                        value={draft.swatchHex}
                        onChange={(e) =>
                          setDraft((prev) =>
                            prev ? { ...prev, swatchHex: e.target.value } : prev
                          )
                        }
                        className="admin-input font-mono text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>

              {(draft.category === 'poses' || draft.category === 'moods') && (
                <div>
                  <label htmlFor="lib-summary" className="block text-sm font-bold text-[var(--ink)]">
                    Short Card Summary
                  </label>
                  <span id="lib-summary-hint" className="mb-1 block text-xs text-[var(--ink-muted)]">
                    One-line description shown on the user option card
                  </span>
                  <input
                    id="lib-summary"
                    type="text"
                    required
                    value={draft.summary}
                    onChange={(e) =>
                      setDraft((prev) => (prev ? { ...prev, summary: e.target.value } : prev))
                    }
                    aria-describedby="lib-summary-hint"
                    data-error="lib-summary-error"
                    className="admin-input"
                    placeholder="Peace sign, finger heart, cheek poke, and a wink."
                  />
                  <span id="lib-summary-error" className="field-error-msg">
                    Enter a short summary so users know what this option looks like.
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="lib-prompt" className="block text-sm font-bold text-[var(--ink)]">
                  Prompt Description Text
                </label>
                <span id="lib-prompt-hint" className="mb-1 block text-xs text-[var(--ink-muted)]">
                  Exact phrase inserted into Gemini prompts when this option is selected
                </span>
                <textarea
                  id="lib-prompt"
                  required
                  rows={3}
                  value={draft.promptText}
                  onChange={(e) =>
                    setDraft((prev) => (prev ? { ...prev, promptText: e.target.value } : prev))
                  }
                  aria-describedby="lib-prompt-hint"
                  data-error="lib-prompt-error"
                  className="admin-input"
                  placeholder="a fluffy plush white cat ears headband"
                />
                <span id="lib-prompt-error" className="field-error-msg">
                  Enter the prompt text injected into templates.
                </span>
              </div>

              {(draft.category === 'props' || draft.category === 'backdrops') && (
                <label className="admin-check-label inline-flex min-h-[44px] items-center gap-2.5 text-sm font-semibold text-[var(--ink)]">
                  <input
                    type="checkbox"
                    checked={draft.attachToKit}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev ? { ...prev, attachToKit: e.target.checked } : prev
                      )
                    }
                    className="h-5 w-5"
                  />
                  <span>Include this image in the numbered Gemini download kit</span>
                </label>
              )}

              {uploadError && (
                <p
                  role="alert"
                  className="rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] px-3.5 py-2.5 text-sm font-semibold text-[var(--error-text)]"
                >
                  {uploadError}
                </p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t-2 border-[var(--border-subtle)] pt-4">
              <button
                type="button"
                onClick={() => editDialogRef.current?.close()}
                className="btn-outline"
              >
                Cancel
              </button>
              <button type="submit" disabled={uploadBusy} className="btn-booth">
                {draft.isNew ? 'Stage new item' : 'Stage changes'}
              </button>
            </div>
          </form>
        )}
      </dialog>

      {/* Safe Delete Guard Native Modal Dialog */}
      <dialog
        ref={deleteDialogRef}
        {...({ closedby: 'any' } as Record<string, string>)}
        aria-labelledby="safe-delete-title"
        className="w-[min(94vw,480px)]"
      >
        {deleteTarget && (
          <div className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4 border-b-2 border-[var(--border-subtle)] pb-3">
              <h3 id="safe-delete-title" className="text-lg font-extrabold">
                Delete "{deleteTarget.item.label}"?
              </h3>
              <button
                type="button"
                onClick={() => deleteDialogRef.current?.close()}
                aria-label="Close delete confirmation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--surface)]"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {deleteTarget.usage.usedAsRequiredDefaultIn.length > 0 ? (
              <div className="mt-4">
                <p
                  role="alert"
                  className="rounded-xl border-2 border-[var(--error-text)] bg-[var(--error-bg)] p-3.5 text-sm font-semibold text-[var(--error-text)]"
                >
                  Cannot delete while set as the required default in these packs:
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
                  {deleteTarget.usage.usedAsRequiredDefaultIn.map((ref) => (
                    <li key={`${ref.slug}-${ref.field}`}>
                      <strong>{ref.title}</strong> ({ref.field} default)
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-[var(--ink-muted)]">
                  Switch those packs to another default {deleteTarget.category.slice(0, -1)} first, then come back to delete this item safely.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => deleteDialogRef.current?.close()}
                    className="btn-booth"
                  >
                    Understood
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                {deleteTarget.usage.usedInAllowedOf.length > 0 ||
                deleteTarget.usage.usedAsOptionalDefaultIn.length > 0 ? (
                  <div className="rounded-xl border-2 border-[var(--ink)] bg-[var(--surface-tint)] p-3.5 text-sm">
                    <p className="font-bold text-[var(--ink)]">
                      This item is referenced by existing pack option lists:
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[var(--ink)]">
                      {Array.from(
                        new Set([
                          ...deleteTarget.usage.usedInAllowedOf.map((u) => u.title),
                          ...deleteTarget.usage.usedAsOptionalDefaultIn.map((u) => u.title),
                        ])
                      ).map((title) => (
                        <li key={title}>{title}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs text-[var(--ink-muted)]">
                      Deleting will automatically clean those pack references so your build stays valid.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--ink-muted)]">
                    No packs currently reference this item. Deleting stages its removal from the library and queues its image file for cleanup on Publish.
                  </p>
                )}

                <div className="mt-5 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => deleteDialogRef.current?.close()}
                    className="btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border-2 border-[var(--ink)] bg-[var(--error-text)] px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    <TrashIcon className="h-4 w-4" />
                    <span>
                      {deleteTarget.usage.usedInAllowedOf.length > 0
                        ? 'Clean references & delete'
                        : 'Delete item'}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}
