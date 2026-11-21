import fs from 'node:fs';
import path from 'node:path';
import { loadAllPacks, loadLibrary } from '../src/lib/content';
import { compilePackPrompt } from '../src/lib/template';
import type { CustomizerSelection } from '../src/lib/types';

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const MAX_SAFE_ATTACHMENTS = 6;
const MAX_HARD_ATTACHMENTS = 10;

function assertPublicFile(assetUrl: string, context: string, errors: string[]) {
  const normalized = assetUrl.startsWith('/') ? assetUrl.slice(1) : assetUrl;
  const fullPath = path.join(PUBLIC_DIR, normalized);
  if (!fs.existsSync(fullPath)) {
    errors.push(`[missing file] ${context}: ${assetUrl} not found at ${fullPath}`);
  }
}

function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const library = loadLibrary();
  const packs = loadAllPacks();

  if (packs.length === 0) {
    errors.push('No prompt packs found under content/packs/');
  }

  for (const prop of Object.values(library.props)) {
    assertPublicFile(prop.image, `library prop "${prop.id}"`, errors);
  }
  for (const backdrop of Object.values(library.backdrops)) {
    assertPublicFile(backdrop.image, `library backdrop "${backdrop.id}"`, errors);
  }
  for (const pose of Object.values(library.poses)) {
    assertPublicFile(pose.image, `library pose "${pose.id}"`, errors);
  }

  const seenSlugs = new Set<string>();

  for (const pack of packs) {
    if (seenSlugs.has(pack.slug)) {
      errors.push(`[duplicate slug] "${pack.slug}" appears more than once`);
    }
    seenSlugs.add(pack.slug);

    assertPublicFile(pack.previewImage, `pack "${pack.slug}" previewImage`, errors);

    for (const file of pack.requiredFiles) {
      assertPublicFile(file.path, `pack "${pack.slug}" requiredFile "${file.id}"`, errors);
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

    // Defaults must belong to allowed lists
    if (pack.defaults.headwear && !pack.allowed.headwear.includes(pack.defaults.headwear)) {
      errors.push(`[invalid default] pack "${pack.slug}" default headwear not in allowed list`);
    }
    if (pack.defaults.eyewear && !pack.allowed.eyewear.includes(pack.defaults.eyewear)) {
      errors.push(`[invalid default] pack "${pack.slug}" default eyewear not in allowed list`);
    }
    if (pack.defaults.accessory && !pack.allowed.accessory.includes(pack.defaults.accessory)) {
      errors.push(`[invalid default] pack "${pack.slug}" default accessory not in allowed list`);
    }
    if (!pack.allowed.backdrops.includes(pack.defaults.backdrop)) {
      errors.push(`[invalid default] pack "${pack.slug}" default backdrop not in allowed list`);
    }
    if (!pack.allowed.poses.includes(pack.defaults.pose)) {
      errors.push(`[invalid default] pack "${pack.slug}" default pose not in allowed list`);
    }
    if (!pack.allowed.moods.includes(pack.defaults.mood)) {
      errors.push(`[invalid default] pack "${pack.slug}" default mood not in allowed list`);
    }

    // Check template resolution on defaults and worst-case full selection
    const defaultCompiled = compilePackPrompt(pack, library, pack.defaults);
    const unresolvedDefault = defaultCompiled.prompt.match(/\{[a-zA-Z0-9_.-]+\}/g);
    if (unresolvedDefault) {
      errors.push(
        `[unresolved placeholder] pack "${pack.slug}" left tokens: ${unresolvedDefault.join(', ')}`
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
    const worstCompiled = compilePackPrompt(pack, library, worstCase);
    const maxImages = worstCompiled.attachments.length;
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

  for (const warn of warnings) {
    console.warn(`WARN: ${warn}`);
  }
  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`FAIL: ${err}`);
    }
    process.exit(1);
  }

  console.log(
    `OK: Validated ${packs.length} pack(s), ${Object.keys(library.props).length} props, ${Object.keys(library.backdrops).length} backdrops, ${Object.keys(library.poses).length} poses, ${Object.keys(library.moods).length} moods.`
  );
}

main();
