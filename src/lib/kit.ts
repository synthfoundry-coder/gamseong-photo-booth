import JSZip from 'jszip';
import type { CompiledPromptResult, PromptPack } from './types';

export async function downloadKitZip(
  pack: PromptPack,
  compiled: CompiledPromptResult
): Promise<void> {
  const zip = new JSZip();

  const downloadable = compiled.attachments.filter((item) => !item.isUserSelfie && item.path);

  const fetchedEntries = await Promise.all(
    downloadable.map(async (item) => {
      const response = await fetch(item.path!);
      if (!response.ok) {
        throw new Error(`Could not fetch ${item.label} (${response.status})`);
      }
      const blob = await response.blob();
      return { filename: item.filename, blob };
    })
  );

  for (const entry of fetchedEntries) {
    zip.file(entry.filename, entry.blob);
  }

  const guideLines = [
    `${pack.title} (${pack.titleKo})`,
    'GAMSEONG PHOTO BOOTH PROMPT KIT',
    '',
    'HOW TO ATTACH IN GEMINI (gemini.google.com):',
    '1. Upload your own selfie FIRST (this becomes Image 1).',
    '2. Upload the numbered files from this folder in order (02, 03, ...).',
    '3. Paste the prompt below and generate.',
    '',
    'ATTACHMENT ORDER:',
    ...compiled.attachments.map((item) => `  Image ${item.imageNumber}: ${item.filename}`),
    '',
    'PROMPT:',
    compiled.prompt,
    '',
  ];

  zip.file('00-prompt-and-guide.txt', guideLines.join('\n'));

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(zipBlob);
  try {
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${pack.slug}-gemini-kit.zip`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  }
}
