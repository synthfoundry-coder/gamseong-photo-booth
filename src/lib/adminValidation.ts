import { compilePackPrompt } from './template';
import type {
  BackdropOption,
  CustomizerSelection,
  LibraryData,
  MoodOption,
  PoseOption,
  PromptPack,
  PropOption,
} from './types';

export interface ContentSnapshot {
  packs: PromptPack[];
  props: PropOption[];
  backdrops: BackdropOption[];
  poses: PoseOption[];
  moods: MoodOption[];
}

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

export type LibraryCategory = 'props' | 'backdrops' | 'poses' | 'moods';

export interface ItemUsageReport {
  usedAsRequiredDefaultIn: Array<{ slug: string; title: string; field: string }>;
  usedAsOptionalDefaultIn: Array<{ slug: string; title: string; field: string }>;
  usedInAllowedOf: Array<{ slug: string; title: string; field: string }>;
}

const MAX_SAFE_ATTACHMENTS = 6;
const MAX_HARD_ATTACHMENTS = 10;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function snapshotToLibraryData(snapshot: Pick<ContentSnapshot, 'props' | 'backdrops' | 'poses' | 'moods'>): LibraryData {
  const index = <T extends { id: string }>(items: T[]) => {
    const out: Record<string, T> = {};
    for (const item of items) out[item.id] = item;
    return out;
  };
  return {
    props: index(snapshot.props),
    backdrops: index(snapshot.backdrops),
    poses: index(snapshot.poses),
    moods: index(snapshot.moods),
  };
}

export function getItemUsage(
  category: LibraryCategory,
  id: string,
  packs: PromptPack[]
): ItemUsageReport {
  const report: ItemUsageReport = {
    usedAsRequiredDefaultIn: [],
    usedAsOptionalDefaultIn: [],
    usedInAllowedOf: [],
  };

  for (const pack of packs) {
    if (category === 'props') {
      const slots: Array<'headwear' | 'eyewear' | 'accessory'> = [
        'headwear',
        'eyewear',
        'accessory',
      ];
      for (const slot of slots) {
        if (pack.defaults[slot] === id) {
          report.usedAsOptionalDefaultIn.push({ slug: pack.slug, title: pack.title, field: slot });
        }
        if (pack.allowed[slot].includes(id)) {
          report.usedInAllowedOf.push({ slug: pack.slug, title: pack.title, field: slot });
        }
      }
    } else if (category === 'backdrops') {
      if (pack.defaults.backdrop === id) {
        report.usedAsRequiredDefaultIn.push({
          slug: pack.slug,
          title: pack.title,
          field: 'backdrop',
        });
      }
      if (pack.allowed.backdrops.includes(id)) {
        report.usedInAllowedOf.push({ slug: pack.slug, title: pack.title, field: 'backdrops' });
      }
    } else if (category === 'poses') {
      if (pack.defaults.pose === id) {
        report.usedAsRequiredDefaultIn.push({ slug: pack.slug, title: pack.title, field: 'pose' });
      }
      if (pack.allowed.poses.includes(id)) {
        report.usedInAllowedOf.push({ slug: pack.slug, title: pack.title, field: 'poses' });
      }
    } else if (category === 'moods') {
      if (pack.defaults.mood === id) {
        report.usedAsRequiredDefaultIn.push({ slug: pack.slug, title: pack.title, field: 'mood' });
      }
      if (pack.allowed.moods.includes(id)) {
        report.usedInAllowedOf.push({ slug: pack.slug, title: pack.title, field: 'moods' });
      }
    }
  }

  return report;
}

export function stripItemReferencesFromPacks(
  category: LibraryCategory,
  id: string,
  packs: PromptPack[]
): PromptPack[] {
  return packs.map((pack) => {
    if (category === 'props') {
      return {
        ...pack,
        defaults: {
          ...pack.defaults,
          headwear: pack.defaults.headwear === id ? null : pack.defaults.headwear,
          eyewear: pack.defaults.eyewear === id ? null : pack.defaults.eyewear,
          accessory: pack.defaults.accessory === id ? null : pack.defaults.accessory,
        },
        allowed: {
          ...pack.allowed,
          headwear: pack.allowed.headwear.filter((x) => x !== id),
          eyewear: pack.allowed.eyewear.filter((x) => x !== id),
          accessory: pack.allowed.accessory.filter((x) => x !== id),
        },
      };
    }
    if (category === 'backdrops') {
      return {
        ...pack,
        allowed: {
          ...pack.allowed,
          backdrops: pack.allowed.backdrops.filter((x) => x !== id),
        },
      };
    }
    if (category === 'poses') {
      return {
        ...pack,
        allowed: {
          ...pack.allowed,
          poses: pack.allowed.poses.filter((x) => x !== id),
        },
      };
    }
    return {
      ...pack,
      allowed: {
        ...pack.allowed,
        moods: pack.allowed.moods.filter((x) => x !== id),
      },
    };
  });
}

export function findUnresolvedPlaceholders(prompt: string): string[] {
  const matches = prompt.match(/\{[a-zA-Z0-9_.-]+\}/g);
  return matches ? Array.from(new Set(matches)) : [];
}

export function validateContentSnapshot(
  snapshot: ContentSnapshot,
  checkAssetExists?: (assetUrl: string) => boolean
): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const library = snapshotToLibraryData(snapshot);

  const checkFile = (url: string, context: string) => {
    if (!url || !url.startsWith('/assets/')) {
      errors.push(`[invalid path] ${context}: "${url}" must start with /assets/`);
      return;
    }
    if (checkAssetExists && !checkAssetExists(url)) {
      errors.push(`[missing file] ${context}: ${url} does not exist`);
    }
  };

  const checkUniqueIds = <T extends { id: string }>(items: T[], label: string) => {
    const seen = new Set<string>();
    for (const item of items) {
      if (!SLUG_RE.test(item.id)) {
        errors.push(`[invalid id] ${label} "${item.id}" must use lowercase letters, numbers, and hyphens`);
      }
      if (seen.has(item.id)) {
        errors.push(`[duplicate id] ${label} "${item.id}" appears more than once`);
      }
      seen.add(item.id);
    }
  };

  checkUniqueIds(snapshot.props, 'prop');
  checkUniqueIds(snapshot.backdrops, 'backdrop');
  checkUniqueIds(snapshot.poses, 'pose');
  checkUniqueIds(snapshot.moods, 'mood');

  for (const prop of snapshot.props) {
    if (!prop.label.trim()) errors.push(`[missing label] prop "${prop.id}" needs a label`);
    if (!prop.promptText.trim()) errors.push(`[missing prompt] prop "${prop.id}" needs promptText`);
    checkFile(prop.image, `prop "${prop.id}"`);
  }
  for (const bg of snapshot.backdrops) {
    if (!bg.label.trim()) errors.push(`[missing label] backdrop "${bg.id}" needs a label`);
    if (!bg.promptText.trim()) errors.push(`[missing prompt] backdrop "${bg.id}" needs promptText`);
    checkFile(bg.image, `backdrop "${bg.id}"`);
  }
  for (const pose of snapshot.poses) {
    if (!pose.label.trim()) errors.push(`[missing label] pose "${pose.id}" needs a label`);
    if (!pose.promptText.trim()) errors.push(`[missing prompt] pose "${pose.id}" needs promptText`);
    checkFile(pose.image, `pose "${pose.id}"`);
  }
  for (const mood of snapshot.moods) {
    if (!mood.label.trim()) errors.push(`[missing label] mood "${mood.id}" needs a label`);
    if (!mood.promptText.trim()) errors.push(`[missing prompt] mood "${mood.id}" needs promptText`);
  }

  if (snapshot.packs.length === 0) {
    errors.push('At least one prompt pack is required.');
  }

  const seenSlugs = new Set<string>();
  for (const pack of snapshot.packs) {
    if (!SLUG_RE.test(pack.slug)) {
      errors.push(`[invalid slug] pack "${pack.slug}" must use lowercase letters, numbers, and hyphens`);
    }
    if (seenSlugs.has(pack.slug)) {
      errors.push(`[duplicate slug] pack "${pack.slug}" appears more than once`);
    }
    seenSlugs.add(pack.slug);

    if (!pack.title.trim()) errors.push(`[missing title] pack "${pack.slug}" needs a title`);
    if (!pack.template.trim()) errors.push(`[missing template] pack "${pack.slug}" needs a prompt template`);
    checkFile(pack.previewImage, `pack "${pack.slug}" previewImage`);

    const seenFileIds = new Set<string>();
    for (const file of pack.requiredFiles) {
      if (!SLUG_RE.test(file.id)) {
        errors.push(`[invalid file id] pack "${pack.slug}" file "${file.id}" must be lowercase kebab-case`);
      }
      if (seenFileIds.has(file.id)) {
        errors.push(`[duplicate file id] pack "${pack.slug}" file "${file.id}" appears twice`);
      }
      seenFileIds.add(file.id);
      checkFile(file.path, `pack "${pack.slug}" required file "${file.id}"`);
    }

    for (const id of pack.allowed.headwear) {
      const prop = library.props[id];
      if (!prop) errors.push(`[unknown prop] pack "${pack.slug}" allows missing headwear "${id}"`);
      else if (prop.slot !== 'headwear') errors.push(`[wrong slot] "${id}" is "${prop.slot}", not headwear`);
    }
    for (const id of pack.allowed.eyewear) {
      const prop = library.props[id];
      if (!prop) errors.push(`[unknown prop] pack "${pack.slug}" allows missing eyewear "${id}"`);
      else if (prop.slot !== 'eyewear') errors.push(`[wrong slot] "${id}" is "${prop.slot}", not eyewear`);
    }
    for (const id of pack.allowed.accessory) {
      const prop = library.props[id];
      if (!prop) errors.push(`[unknown prop] pack "${pack.slug}" allows missing accessory "${id}"`);
      else if (prop.slot !== 'accessory') errors.push(`[wrong slot] "${id}" is "${prop.slot}", not accessory`);
    }
    for (const id of pack.allowed.backdrops) {
      if (!library.backdrops[id]) {
        errors.push(`[unknown backdrop] pack "${pack.slug}" allows missing backdrop "${id}"`);
      }
    }
    for (const id of pack.allowed.poses) {
      if (!library.poses[id]) {
        errors.push(`[unknown pose] pack "${pack.slug}" allows missing pose "${id}"`);
      }
    }
    for (const id of pack.allowed.moods) {
      if (!library.moods[id]) {
        errors.push(`[unknown mood] pack "${pack.slug}" allows missing mood "${id}"`);
      }
    }

    if (pack.defaults.headwear && !pack.allowed.headwear.includes(pack.defaults.headwear)) {
      errors.push(`[invalid default] pack "${pack.slug}" default headwear "${pack.defaults.headwear}" not in allowed list`);
    }
    if (pack.defaults.eyewear && !pack.allowed.eyewear.includes(pack.defaults.eyewear)) {
      errors.push(`[invalid default] pack "${pack.slug}" default eyewear "${pack.defaults.eyewear}" not in allowed list`);
    }
    if (pack.defaults.accessory && !pack.allowed.accessory.includes(pack.defaults.accessory)) {
      errors.push(`[invalid default] pack "${pack.slug}" default accessory "${pack.defaults.accessory}" not in allowed list`);
    }
    if (!pack.allowed.backdrops.includes(pack.defaults.backdrop)) {
      errors.push(`[invalid default] pack "${pack.slug}" default backdrop "${pack.defaults.backdrop}" not in allowed list`);
    }
    if (!pack.allowed.poses.includes(pack.defaults.pose)) {
      errors.push(`[invalid default] pack "${pack.slug}" default pose "${pack.defaults.pose}" not in allowed list`);
    }
    if (!pack.allowed.moods.includes(pack.defaults.mood)) {
      errors.push(`[invalid default] pack "${pack.slug}" default mood "${pack.defaults.mood}" not in allowed list`);
    }

    const defaultCompiled = compilePackPrompt(pack, library, pack.defaults);
    const unresolved = findUnresolvedPlaceholders(defaultCompiled.prompt);
    if (unresolved.length > 0) {
      errors.push(
        `[unresolved placeholder] pack "${pack.slug}" left tokens: ${unresolved.join(', ')}`
      );
    }

    const worstCase: CustomizerSelection = {
      headwear: pack.allowed.headwear[0] ?? null,
      eyewear: pack.allowed.eyewear[0] ?? null,
      accessory: pack.allowed.accessory[0] ?? null,
      backdrop: pack.allowed.backdrops[0] ?? pack.defaults.backdrop,
      pose: pack.allowed.poses[0] ?? pack.defaults.pose,
      mood: pack.allowed.moods[0] ?? pack.defaults.mood,
    };
    const maxImages = compilePackPrompt(pack, library, worstCase).attachments.length;
    if (maxImages > MAX_HARD_ATTACHMENTS) {
      errors.push(
        `[too many attachments] pack "${pack.slug}" can reach ${maxImages} images (limit ${MAX_HARD_ATTACHMENTS})`
      );
    } else if (maxImages > MAX_SAFE_ATTACHMENTS) {
      warnings.push(
        `[attachment count] pack "${pack.slug}" can reach ${maxImages} images when all prop slots are filled`
      );
    }
  }

  return { errors, warnings };
}
