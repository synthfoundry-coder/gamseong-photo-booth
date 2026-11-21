import type {
  CompiledPromptResult,
  CustomizerSelection,
  KitAttachment,
  LibraryData,
  PromptPack,
} from './types';

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

export function isMatchingPreview(pack: PromptPack, selection: CustomizerSelection): boolean {
  return (
    selection.headwear === pack.defaults.headwear &&
    selection.eyewear === pack.defaults.eyewear &&
    selection.accessory === pack.defaults.accessory &&
    selection.backdrop === pack.defaults.backdrop &&
    selection.pose === pack.defaults.pose &&
    selection.mood === pack.defaults.mood
  );
}

export function compilePackPrompt(
  pack: PromptPack,
  library: LibraryData,
  selection: CustomizerSelection
): CompiledPromptResult {
  const attachments: KitAttachment[] = [
    {
      imageNumber: 1,
      filename: '01-your-selfie (upload from your device)',
      label: 'Your Selfie',
      role: 'your face and hair likeness',
      path: null,
      isUserSelfie: true,
    },
  ];

  let nextNum = 2;
  const fileRefs: Record<string, string> = {};

  for (const file of pack.requiredFiles) {
    const imgNum = nextNum++;
    const numberedFilename = `${padTwo(imgNum)}-${file.filename}`;
    fileRefs[file.id] = `Image ${imgNum}`;
    attachments.push({
      imageNumber: imgNum,
      filename: numberedFilename,
      label: file.label,
      role: file.roleDescription,
      path: file.path,
    });
  }

  const chosenPropDescriptions: string[] = [];
  const propSlots: Array<'headwear' | 'eyewear' | 'accessory'> = [
    'headwear',
    'eyewear',
    'accessory',
  ];

  for (const slot of propSlots) {
    const propId = selection[slot];
    if (!propId) continue;
    const prop = library.props[propId];
    if (!prop) continue;

    if (prop.attachToKit) {
      const imgNum = nextNum++;
      attachments.push({
        imageNumber: imgNum,
        filename: `${padTwo(imgNum)}-prop-${prop.id}.png`,
        label: prop.label,
        role: `${prop.label} reference prop`,
        path: prop.image,
      });
      chosenPropDescriptions.push(`${prop.promptText} (match the reference in Image ${imgNum})`);
    } else {
      chosenPropDescriptions.push(prop.promptText);
    }
  }

  const backdrop = library.backdrops[selection.backdrop];
  let backdropFull = '';
  if (backdrop) {
    if (backdrop.attachToKit) {
      const imgNum = nextNum++;
      attachments.push({
        imageNumber: imgNum,
        filename: `${padTwo(imgNum)}-backdrop-${backdrop.id}.png`,
        label: backdrop.label,
        role: `${backdrop.label} studio backdrop`,
        path: backdrop.image,
      });
      backdropFull = `${backdrop.promptText} (match the color and pattern from Image ${imgNum})`;
    } else {
      backdropFull = backdrop.promptText;
    }
  }

  const pose = library.poses[selection.pose];
  const mood = library.moods[selection.mood];

  const propsSentence =
    chosenPropDescriptions.length > 0
      ? `The subject is wearing/holding: ${chosenPropDescriptions.join('; ')}.`
      : 'No extra hats, glasses, or props; keep the look clean and natural.';

  const attachmentsList = attachments
    .map((item) => `- Image ${item.imageNumber}: ${item.label} (${item.role})`)
    .join('\n');

  let prompt = pack.template;
  prompt = prompt.replaceAll('{attachments.list}', attachmentsList);
  prompt = prompt.replaceAll('{props.sentence}', propsSentence);
  prompt = prompt.replaceAll('{backdrop.full}', backdropFull);
  prompt = prompt.replaceAll('{pose.text}', pose?.promptText ?? '');
  prompt = prompt.replaceAll('{mood.text}', mood?.promptText ?? '');

  for (const [fileId, refLabel] of Object.entries(fileRefs)) {
    prompt = prompt.replaceAll(`{file.${fileId}}`, refLabel);
  }

  return {
    prompt: prompt.trim(),
    attachments,
    matchesPreview: isMatchingPreview(pack, selection),
  };
}
