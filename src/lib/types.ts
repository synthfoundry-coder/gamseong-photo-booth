export type PackFormat = '4-cut' | '3-cut' | '6-cut' | 'polaroid' | 'haru-2x2';

export type PropSlot = 'headwear' | 'eyewear' | 'accessory';

export interface PropOption {
  id: string;
  label: string;
  labelKo: string;
  slot: PropSlot;
  promptText: string;
  image: string;
  attachToKit: boolean;
}

export interface BackdropOption {
  id: string;
  label: string;
  labelKo: string;
  kind: 'solid' | 'wallpaper';
  swatchHex: string;
  promptText: string;
  image: string;
  attachToKit: boolean;
}

export interface PoseOption {
  id: string;
  label: string;
  labelKo: string;
  summary: string;
  promptText: string;
  image: string;
}

export interface MoodOption {
  id: string;
  label: string;
  labelKo: string;
  summary: string;
  promptText: string;
  swatchHex: string;
}

export interface LibraryData {
  props: Record<string, PropOption>;
  backdrops: Record<string, BackdropOption>;
  poses: Record<string, PoseOption>;
  moods: Record<string, MoodOption>;
}

export interface RequiredFile {
  id: string;
  label: string;
  roleDescription: string;
  path: string;
  filename: string;
}

export interface PackDefaults {
  headwear: string | null;
  eyewear: string | null;
  accessory: string | null;
  backdrop: string;
  pose: string;
  mood: string;
}

export interface PackAllowedOptions {
  headwear: string[];
  eyewear: string[];
  accessory: string[];
  backdrops: string[];
  poses: string[];
  moods: string[];
}

export interface PromptPack {
  slug: string;
  title: string;
  titleKo: string;
  subtitle: string;
  format: PackFormat;
  formatLabel: string;
  formatLabelKo: string;
  cuts: number;
  tags: string[];
  isNew?: boolean;
  isSample?: boolean;
  premium?: boolean;
  previewImage: string;
  previewWidth: number;
  previewHeight: number;
  aspectClass: 'strip-tall' | 'polaroid' | 'grid-2x2';
  requiredFiles: RequiredFile[];
  allowed: PackAllowedOptions;
  defaults: PackDefaults;
  template: string;
}

export interface CustomizerSelection {
  headwear: string | null;
  eyewear: string | null;
  accessory: string | null;
  backdrop: string;
  pose: string;
  mood: string;
}

export interface KitAttachment {
  imageNumber: number;
  filename: string;
  label: string;
  role: string;
  path: string | null; // null for user's own selfie (Image 1)
  isUserSelfie?: boolean;
}

export interface CompiledPromptResult {
  prompt: string;
  attachments: KitAttachment[];
  matchesPreview: boolean;
}
