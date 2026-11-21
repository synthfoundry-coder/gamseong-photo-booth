import fs from 'node:fs';
import path from 'node:path';
import type {
  BackdropOption,
  LibraryData,
  MoodOption,
  PoseOption,
  PromptPack,
  PropOption,
} from './types';

const CONTENT_DIR = path.join(process.cwd(), 'content');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of items) {
    map[item.id] = item;
  }
  return map;
}

export function loadLibrary(): LibraryData {
  const libDir = path.join(CONTENT_DIR, 'library');
  const props = readJson<PropOption[]>(path.join(libDir, 'props.json'));
  const backdrops = readJson<BackdropOption[]>(path.join(libDir, 'backdrops.json'));
  const poses = readJson<PoseOption[]>(path.join(libDir, 'poses.json'));
  const moods = readJson<MoodOption[]>(path.join(libDir, 'moods.json'));

  return {
    props: indexById(props),
    backdrops: indexById(backdrops),
    poses: indexById(poses),
    moods: indexById(moods),
  };
}

export function loadAllPacks(): PromptPack[] {
  const packsDir = path.join(CONTENT_DIR, 'packs');
  if (!fs.existsSync(packsDir)) return [];

  const dirs = fs
    .readdirSync(packsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const packs: PromptPack[] = [];
  for (const dir of dirs) {
    const jsonPath = path.join(packsDir, dir, 'pack.json');
    if (fs.existsSync(jsonPath)) {
      packs.push(readJson<PromptPack>(jsonPath));
    }
  }

  // Keep featured new packs first so the primary sample strip sits at the top of the gallery.
  return packs.sort((a, b) => {
    if (a.slug === 'bunny-4cut') return -1;
    if (b.slug === 'bunny-4cut') return 1;
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return a.title.localeCompare(b.title);
  });
}

export function loadPackBySlug(slug: string): PromptPack | undefined {
  return loadAllPacks().find((p) => p.slug === slug);
}
