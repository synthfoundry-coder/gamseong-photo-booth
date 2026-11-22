export type ImageUploadKind = 'prop' | 'pose' | 'backdrop' | 'preview' | 'template';

export interface OptimizedImageResult {
  base64: string;
  dataUrl: string;
  width: number;
  height: number;
  byteSize: number;
  extension: 'png' | 'jpg';
}

const MAX_DIMENSION: Record<ImageUploadKind, number> = {
  prop: 512,
  pose: 512,
  backdrop: 900,
  preview: 1600,
  template: 1600,
};

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode image file. Upload a valid PNG, JPG, or WebP image.'));
    };
    img.src = objectUrl;
  });
}

// Resizes large photos in the browser to stay well under Vercel's 4.5MB limit while preserving PNG transparency.
export async function optimizeImageFile(
  file: File,
  kind: ImageUploadKind
): Promise<OptimizedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selected file is not an image.');
  }

  const img = await loadImageFromFile(file);
  const maxDim = MAX_DIMENSION[kind];
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser canvas context is unavailable.');

  const preferPng =
    file.type === 'image/png' || kind === 'prop' || kind === 'pose' || kind === 'template';
  const mimeType = preferPng ? 'image/png' : 'image/jpeg';
  const extension: 'png' | 'jpg' = preferPng ? 'png' : 'jpg';

  if (!preferPng) {
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(img, 0, 0, width, height);

  let dataUrl = canvas.toDataURL(mimeType, preferPng ? undefined : 0.9);
  let base64 = dataUrl.split(',')[1] ?? '';
  let byteSize = Math.floor((base64.length * 3) / 4);

  // If a large PNG preview still exceeds 3.5 MB, fall back to crisp JPEG so upload never hits Vercel's 4.5 MB limit.
  if (byteSize > 3.5 * 1024 * 1024 && kind === 'preview') {
    ctx.fillStyle = '#FAF6EE';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    base64 = dataUrl.split(',')[1] ?? '';
    byteSize = Math.floor((base64.length * 3) / 4);
    return { base64, dataUrl, width, height, byteSize, extension: 'jpg' };
  }

  if (byteSize > 3.9 * 1024 * 1024) {
    throw new Error('Optimized image is still over 3.9 MB. Try a slightly smaller source image.');
  }

  return { base64, dataUrl, width, height, byteSize, extension };
}

export function slugifyFilename(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'asset'
  );
}
