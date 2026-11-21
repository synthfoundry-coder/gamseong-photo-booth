import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUBLIC_ASSETS = path.join(ROOT, 'public', 'assets');
const ARTIFACT_DIR =
  '/Users/itoperations/.gemini/antigravity/brain/cc1a499d-9bd2-4c97-b606-458483ecfe53';

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function renderSvgToPng(svg: string, outPath: string, width: number, height: number) {
  await ensureDir(path.dirname(outPath));
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

async function copyGeneratedIfPresent(srcName: string, destRelPath: string, width?: number) {
  const src = path.join(ARTIFACT_DIR, srcName);
  const dest = path.join(PUBLIC_ASSETS, destRelPath);
  await ensureDir(path.dirname(dest));
  try {
    await fs.access(src);
    let pipeline = sharp(src);
    if (width) {
      pipeline = pipeline.resize({ width, withoutEnlargement: true });
    }
    await pipeline.png({ compressionLevel: 9 }).toFile(dest);
    console.log(`Copied & converted: ${destRelPath}`);
  } catch {
    console.log(`Skipped copy (source absent): ${srcName}`);
  }
}

function stickerFrame(innerSvg: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <rect width="512" height="512" fill="#FAF6EE"/>
    <g stroke-linecap="round" stroke-linejoin="round">
      ${innerSvg}
    </g>
  </svg>`;
}

const PROP_SVGS: Record<string, string> = {
  'cream-beret': stickerFrame(`
    <ellipse cx="256" cy="368" rx="135" ry="18" fill="#E8DFCE"/>
    <path d="M256 142 C256 122 268 118 274 128 C276 132 270 145 260 152" fill="#FFF3C4" stroke="#1C1917" stroke-width="10"/>
    <path d="M98 286 C86 202 158 148 258 148 C356 148 426 196 412 278 C404 324 344 352 256 352 C164 352 106 332 98 286 Z" fill="#FFF1C9" stroke="#1C1917" stroke-width="12"/>
    <path d="M122 284 C150 318 202 332 258 332 C316 332 368 314 390 278" fill="none" stroke="#E5C98B" stroke-width="12"/>
    <path d="M144 324 C178 346 218 354 256 354 C296 354 338 344 368 322 C354 350 312 364 256 364 C198 364 156 348 144 324 Z" fill="#F6DF9F" stroke="#1C1917" stroke-width="10"/>
    <path d="M150 218 Q186 184 242 178" fill="none" stroke="#FFFFFF" stroke-width="10" opacity="0.8"/>
    <path d="M332 274 C350 258 370 264 364 282 C356 296 338 292 332 274 Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="8"/>
    <path d="M332 274 C316 258 296 264 302 282 C310 296 326 292 332 274 Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="8"/>
    <circle cx="332" cy="276" r="9" fill="#FEE500" stroke="#1C1917" stroke-width="7"/>
  `),
  'pink-bandana': stickerFrame(`
    <ellipse cx="256" cy="392" rx="120" ry="16" fill="#E8DFCE"/>
    <defs>
      <pattern id="gingham" width="32" height="32" patternUnits="userSpaceOnUse">
        <rect width="32" height="32" fill="#FFE8F0"/>
        <rect width="16" height="32" fill="#FFC4D8" opacity="0.65"/>
        <rect width="32" height="16" fill="#FFC4D8" opacity="0.65"/>
        <rect width="16" height="16" fill="#FFA8C6" opacity="0.6"/>
      </pattern>
    </defs>
    <path d="M98 164 L414 164 L256 374 Z" fill="url(#gingham)" stroke="#1C1917" stroke-width="12"/>
    <path d="M98 164 Q256 128 414 164 Q256 196 98 164 Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="11"/>
    <path d="M114 164 Q256 188 398 164" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-dasharray="12 10"/>
    <path d="M98 164 C70 158 58 176 72 194 C84 206 104 192 108 174 Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="9"/>
    <path d="M414 164 C442 158 454 176 440 194 C428 206 408 192 404 174 Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="9"/>
  `),
  'heart-glasses': stickerFrame(`
    <ellipse cx="256" cy="358" rx="148" ry="16" fill="#E8DFCE"/>
    <path d="M88 214 L132 178" stroke="#1C1917" stroke-width="12"/>
    <path d="M424 214 L380 178" stroke="#1C1917" stroke-width="12"/>
    <path d="M236 244 Q256 228 276 244" fill="none" stroke="#1C1917" stroke-width="12"/>
    <path d="M168 326 C112 288 86 246 98 208 C108 178 144 174 168 204 C192 174 228 178 238 208 C250 246 224 288 168 326 Z" fill="#FF9BBA" stroke="#1C1917" stroke-width="12"/>
    <path d="M168 308 C124 278 104 244 113 214 C121 192 146 190 168 216 C190 190 215 192 223 214 C232 244 212 278 168 308 Z" fill="#FFD1E1" stroke="#1C1917" stroke-width="7"/>
    <path d="M132 224 L152 206" stroke="#FFFFFF" stroke-width="9"/>
    <path d="M344 326 C288 288 262 246 274 208 C284 178 320 174 344 204 C368 174 404 178 414 208 C426 246 400 288 344 326 Z" fill="#FF9BBA" stroke="#1C1917" stroke-width="12"/>
    <path d="M344 308 C300 278 280 244 289 214 C297 192 322 190 344 216 C366 190 391 192 399 214 C408 244 388 278 344 308 Z" fill="#FFD1E1" stroke="#1C1917" stroke-width="7"/>
    <path d="M308 224 L328 206" stroke="#FFFFFF" stroke-width="9"/>
  `),
  'star-glasses': stickerFrame(`
    <ellipse cx="256" cy="364" rx="150" ry="16" fill="#E8DFCE"/>
    <path d="M232 254 Q256 238 280 254" fill="none" stroke="#1C1917" stroke-width="11"/>
    <path d="M84 226 L124 190" stroke="#1C1917" stroke-width="11"/>
    <path d="M428 226 L388 190" stroke="#1C1917" stroke-width="11"/>
    <polygon points="164,174 186,226 242,230 198,266 212,322 164,290 116,322 130,266 86,230 142,226" fill="#9FD4FF" stroke="#1C1917" stroke-width="11"/>
    <polygon points="164,196 179,232 218,236 188,260 197,298 164,276 131,298 140,260 110,236 149,232" fill="#D4ECFF"/>
    <path d="M138 242 L162 216" stroke="#FFFFFF" stroke-width="8"/>
    <polygon points="348,174 370,226 426,230 382,266 396,322 348,290 300,322 314,266 270,230 326,226" fill="#9FD4FF" stroke="#1C1917" stroke-width="11"/>
    <polygon points="348,196 363,232 402,236 372,260 381,298 348,276 315,298 324,260 294,236 333,232" fill="#D4ECFF"/>
    <path d="M322 242 L346 216" stroke="#FFFFFF" stroke-width="8"/>
  `),
  'round-glasses': stickerFrame(`
    <ellipse cx="256" cy="356" rx="146" ry="15" fill="#E8DFCE"/>
    <path d="M84 224 L128 192" stroke="#1C1917" stroke-width="12"/>
    <path d="M428 224 L384 192" stroke="#1C1917" stroke-width="12"/>
    <path d="M234 252 Q256 236 278 252" fill="none" stroke="#1C1917" stroke-width="12"/>
    <circle cx="164" cy="256" r="74" fill="#A66B43" stroke="#1C1917" stroke-width="11"/>
    <circle cx="164" cy="256" r="56" fill="#FFFDF8" stroke="#1C1917" stroke-width="8"/>
    <path d="M134 236 L156 216" stroke="#9FD4FF" stroke-width="9" opacity="0.7"/>
    <circle cx="348" cy="256" r="74" fill="#A66B43" stroke="#1C1917" stroke-width="11"/>
    <circle cx="348" cy="256" r="56" fill="#FFFDF8" stroke="#1C1917" stroke-width="8"/>
    <path d="M318 236 L340 216" stroke="#9FD4FF" stroke-width="9" opacity="0.7"/>
  `),
  'bear-mittens': stickerFrame(`
    <ellipse cx="256" cy="396" rx="146" ry="16" fill="#E8DFCE"/>
    <g transform="translate(-14, 0)">
      <path d="M108 252 C100 176 156 144 198 158 C236 170 244 218 234 282 L238 352 L116 352 Z" fill="#C68B59" stroke="#1C1917" stroke-width="11"/>
      <path d="M220 264 C246 244 268 260 256 286 C248 304 232 308 222 306" fill="#C68B59" stroke="#1C1917" stroke-width="11"/>
      <rect x="108" y="332" width="136" height="36" rx="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="10"/>
      <ellipse cx="174" cy="272" rx="34" ry="26" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="144" cy="216" r="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="178" cy="202" r="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="208" cy="220" r="13" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
    </g>
    <g transform="translate(18, 12)">
      <path d="M396 252 C404 176 348 144 306 158 C268 170 260 218 270 282 L266 352 L388 352 Z" fill="#C68B59" stroke="#1C1917" stroke-width="11"/>
      <path d="M284 264 C258 244 236 260 248 286 C256 304 272 308 282 306" fill="#C68B59" stroke="#1C1917" stroke-width="11"/>
      <rect x="260" y="332" width="136" height="36" rx="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="10"/>
      <ellipse cx="330" cy="272" rx="34" ry="26" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="360" cy="216" r="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="326" cy="202" r="14" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
      <circle cx="296" cy="220" r="13" fill="#FFF4DC" stroke="#1C1917" stroke-width="7"/>
    </g>
  `),
};

function solidBackdropSvg(base: string, edge: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <radialGradient id="g" cx="50%" cy="42%" r="72%">
        <stop offset="0%" stop-color="${base}"/>
        <stop offset="100%" stop-color="${edge}"/>
      </radialGradient>
    </defs>
    <rect width="600" height="800" fill="url(#g)"/>
  </svg>`;
}

const BACKDROP_SVGS: Record<string, string> = {
  'baby-blue': solidBackdropSvg('#CEE7FA', '#AED5F5'),
  'strawberry-milk': solidBackdropSvg('#FFE1EB', '#F9C4D7'),
  'butter-yellow': solidBackdropSvg('#FFF5C2', '#FBE793'),
  'soft-lilac': solidBackdropSvg('#ECE2FA', '#D8C7F4'),
  'mint-cream': solidBackdropSvg('#D8F3E8', '#B7E6D4'),
  'pastel-clouds': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#A8D8FA"/>
        <stop offset="100%" stop-color="#DCEFFF"/>
      </linearGradient>
    </defs>
    <rect width="600" height="800" fill="url(#sky)"/>
    <g fill="#FFFFFF" opacity="0.92">
      <g transform="translate(80,120)">
        <circle cx="60" cy="60" r="46"/><circle cx="110" cy="48" r="56"/><circle cx="164" cy="64" r="42"/><rect x="52" y="62" width="118" height="44" rx="22"/>
      </g>
      <g transform="translate(320,250) scale(1.1)">
        <circle cx="52" cy="58" r="42"/><circle cx="102" cy="44" r="52"/><circle cx="152" cy="60" r="38"/><rect x="46" y="58" width="112" height="42" rx="21"/>
      </g>
      <g transform="translate(50,480) scale(1.15)">
        <circle cx="58" cy="56" r="42"/><circle cx="108" cy="42" r="52"/><circle cx="160" cy="58" r="38"/><rect x="50" y="56" width="118" height="40" rx="20"/>
      </g>
      <g transform="translate(340,620) scale(0.95)">
        <circle cx="56" cy="54" r="38"/><circle cx="100" cy="42" r="48"/><circle cx="146" cy="56" r="34"/><rect x="48" y="54" width="104" height="36" rx="18"/>
      </g>
    </g>
  </svg>`,
  'gingham-pink': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <defs>
      <pattern id="gpink" width="80" height="80" patternUnits="userSpaceOnUse">
        <rect width="80" height="80" fill="#FFF7F9"/>
        <rect width="40" height="80" fill="#FFD3E2" opacity="0.72"/>
        <rect width="80" height="40" fill="#FFD3E2" opacity="0.72"/>
        <rect width="40" height="40" fill="#FFB8CF" opacity="0.65"/>
      </pattern>
      <radialGradient id="vig" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
        <stop offset="100%" stop-color="#D98BA6" stop-opacity="0.16"/>
      </radialGradient>
    </defs>
    <rect width="600" height="800" fill="url(#gpink)"/>
    <rect width="600" height="800" fill="url(#vig)"/>
  </svg>`,
  'doodle-hearts': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
    <rect width="600" height="800" fill="#FFF6D6"/>
    <g fill="#FF9EB5" stroke="#1C1917" stroke-width="4" stroke-linejoin="round" opacity="0.78">
      <path transform="translate(76,92) scale(0.85)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
      <path transform="translate(468,142) rotate(14) scale(0.9)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
      <path transform="translate(110,360) rotate(-12) scale(0.8)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
      <path transform="translate(454,430) rotate(10) scale(0.95)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
      <path transform="translate(96,650) rotate(-8) scale(0.9)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
      <path transform="translate(432,690) rotate(18) scale(0.8)" d="M24 42 C8 30 0 18 6 9 C11 2 20 4 24 12 C28 4 37 2 42 9 C48 18 40 30 24 42 Z"/>
    </g>
    <g fill="#FEE500" stroke="#1C1917" stroke-width="4" stroke-linejoin="round" opacity="0.85">
      <polygon transform="translate(278,84) scale(0.65)" points="24,2 30,18 46,24 30,30 24,46 18,30 2,24 18,18"/>
      <polygon transform="translate(508,300) scale(0.55)" points="24,2 30,18 46,24 30,30 24,46 18,30 2,24 18,18"/>
      <polygon transform="translate(288,546) scale(0.6)" points="24,2 30,18 46,24 30,30 24,46 18,30 2,24 18,18"/>
      <polygon transform="translate(56,512) scale(0.5)" points="24,2 30,18 46,24 30,30 24,46 18,30 2,24 18,18"/>
    </g>
  </svg>`,
};

const POSE_SVGS: Record<string, string> = {
  'cute-classic': stickerFrame(`
    <circle cx="256" cy="256" r="196" fill="#FFF8D6"/>
    <path d="M168 398 C168 330 206 306 256 306 C306 306 344 330 344 398" fill="#FFFFFF" stroke="#1C1917" stroke-width="11"/>
    <circle cx="256" cy="214" r="88" fill="#FFFDF8" stroke="#1C1917" stroke-width="11"/>
    <circle cx="222" cy="212" r="9" fill="#1C1917"/>
    <circle cx="290" cy="212" r="9" fill="#1C1917"/>
    <ellipse cx="204" cy="232" rx="14" ry="8" fill="#FFB8CD"/>
    <ellipse cx="308" cy="232" rx="14" ry="8" fill="#FFB8CD"/>
    <path d="M238 238 Q256 256 274 238" fill="none" stroke="#1C1917" stroke-width="9"/>
    <g transform="translate(314, 186)">
      <path d="M22 104 L12 36 C11 26 24 22 28 32 L38 74 L46 28 C48 18 62 20 60 32 L52 96 C62 104 60 124 42 130 C24 134 14 122 22 104 Z" fill="#FFFDF8" stroke="#1C1917" stroke-width="10"/>
    </g>
  `),
  'funny-playful': stickerFrame(`
    <circle cx="256" cy="256" r="196" fill="#E3F1FA"/>
    <path d="M168 398 C168 330 206 306 256 306 C306 306 344 330 344 398" fill="#FFFFFF" stroke="#1C1917" stroke-width="11"/>
    <circle cx="256" cy="214" r="88" fill="#FFFDF8" stroke="#1C1917" stroke-width="11"/>
    <path d="M210 212 Q224 198 238 212" fill="none" stroke="#1C1917" stroke-width="9"/>
    <circle cx="290" cy="212" r="10" fill="#1C1917"/>
    <ellipse cx="202" cy="234" rx="14" ry="8" fill="#FFB8CD"/>
    <ellipse cx="310" cy="234" rx="14" ry="8" fill="#FFB8CD"/>
    <path d="M238 242 Q256 266 274 242 Z" fill="#FF9BBA" stroke="#1C1917" stroke-width="8"/>
    <circle cx="152" cy="242" r="24" fill="#FFFDF8" stroke="#1C1917" stroke-width="10"/>
    <circle cx="360" cy="242" r="24" fill="#FFFDF8" stroke="#1C1917" stroke-width="10"/>
  `),
  'chic-editorial': stickerFrame(`
    <circle cx="256" cy="256" r="196" fill="#F2EBE0"/>
    <path d="M168 398 C168 330 206 306 256 306 C306 306 344 330 344 398" fill="#1C1917" stroke="#1C1917" stroke-width="11"/>
    <circle cx="256" cy="210" r="86" fill="#FFFDF8" stroke="#1C1917" stroke-width="11"/>
    <path d="M212 208 L236 208" stroke="#1C1917" stroke-width="9"/>
    <path d="M276 208 L300 208" stroke="#1C1917" stroke-width="9"/>
    <path d="M244 240 Q258 246 272 238" fill="none" stroke="#1C1917" stroke-width="8"/>
    <path d="M212 316 L248 286 L278 294 L244 334 Z" fill="#FFFDF8" stroke="#1C1917" stroke-width="10"/>
  `),
  'heart-overload': stickerFrame(`
    <circle cx="256" cy="256" r="196" fill="#FCE8EE"/>
    <path d="M170 402 C170 338 206 314 256 314 C306 314 342 338 342 402" fill="#FFFFFF" stroke="#1C1917" stroke-width="11"/>
    <path d="M166 336 C116 254 134 118 228 118 C244 118 252 132 256 146 C260 132 268 118 284 118 C378 118 396 254 346 336" fill="none" stroke="#1C1917" stroke-width="16"/>
    <path d="M166 336 C116 254 134 118 228 118 C244 118 252 132 256 146 C260 132 268 118 284 118 C378 118 396 254 346 336" fill="none" stroke="#FFFDF8" stroke-width="7"/>
    <circle cx="256" cy="236" r="76" fill="#FFFDF8" stroke="#1C1917" stroke-width="11"/>
    <circle cx="228" cy="232" r="8" fill="#1C1917"/>
    <circle cx="284" cy="232" r="8" fill="#1C1917"/>
    <ellipse cx="212" cy="250" rx="13" ry="7" fill="#FFB8CD"/>
    <ellipse cx="300" cy="250" rx="13" ry="7" fill="#FFB8CD"/>
    <path d="M242 256 Q256 270 270 256" fill="none" stroke="#1C1917" stroke-width="8"/>
  `),
};

function stripTemplate4Cut() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 1800" width="600" height="1800">
    <rect width="600" height="1800" fill="#FAF6EE"/>
    <rect x="40" y="44" width="520" height="360" fill="#E9E2D5" stroke="#1C1917" stroke-width="4"/>
    <rect x="40" y="434" width="520" height="360" fill="#E9E2D5" stroke="#1C1917" stroke-width="4"/>
    <rect x="40" y="824" width="520" height="360" fill="#E9E2D5" stroke="#1C1917" stroke-width="4"/>
    <rect x="40" y="1214" width="520" height="360" fill="#E9E2D5" stroke="#1C1917" stroke-width="4"/>
    <g fill="#57534E" font-family="sans-serif" font-weight="700" font-size="28" text-anchor="middle">
      <text x="300" y="232">CUT 1</text>
      <text x="300" y="622">CUT 2</text>
      <text x="300" y="1012">CUT 3</text>
      <text x="300" y="1402">CUT 4</text>
    </g>
    <text x="300" y="1698" fill="#1C1917" font-family="sans-serif" font-weight="700" font-size="30" letter-spacing="4" text-anchor="middle">GAMSEONG PHOTO</text>
  </svg>`;
}

function stripTemplatePolaroid() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
    <rect width="800" height="1000" fill="#FFFFFF"/>
    <rect x="56" y="56" width="688" height="712" fill="#EFEAE0" stroke="#1C1917" stroke-width="4"/>
    <text x="400" y="422" fill="#57534E" font-family="sans-serif" font-weight="700" font-size="34" text-anchor="middle">SINGLE POLAROID CUT</text>
    <text x="400" y="896" fill="#1C1917" font-family="sans-serif" font-weight="700" font-size="28" letter-spacing="4" text-anchor="middle">GAMSEONG PHOTO</text>
  </svg>`;
}

function stripTemplateHaru2x2() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
    <rect width="800" height="1200" fill="#E3F1FA"/>
    <rect x="44" y="48" width="342" height="466" fill="#FFFFFF" stroke="#1C1917" stroke-width="4"/>
    <rect x="414" y="48" width="342" height="466" fill="#FFFFFF" stroke="#1C1917" stroke-width="4"/>
    <rect x="44" y="542" width="342" height="466" fill="#FFFFFF" stroke="#1C1917" stroke-width="4"/>
    <rect x="414" y="542" width="342" height="466" fill="#FFFFFF" stroke="#1C1917" stroke-width="4"/>
    <g fill="#57534E" font-family="sans-serif" font-weight="700" font-size="28" text-anchor="middle">
      <text x="215" y="290">CUT 1</text>
      <text x="585" y="290">CUT 2</text>
      <text x="215" y="784">CUT 3</text>
      <text x="585" y="784">CUT 4</text>
    </g>
    <text x="400" y="1116" fill="#102436" font-family="sans-serif" font-weight="700" font-size="30" letter-spacing="4" text-anchor="middle">GAMSEONG PHOTO</text>
  </svg>`;
}

// Illustrated sample previews for the two packs where image-gen quota was reached
function samplePreviewCafePolaroid() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
    <rect width="800" height="1000" fill="#FFFFFF"/>
    <defs>
      <radialGradient id="butter" cx="50%" cy="40%" r="65%">
        <stop offset="0%" stop-color="#FFF7CE"/>
        <stop offset="100%" stop-color="#FBE38E"/>
      </radialGradient>
    </defs>
    <rect x="48" y="48" width="704" height="728" fill="url(#butter)" stroke="#1C1917" stroke-width="6"/>
    <!-- Character portrait in warm Korean webtoon style -->
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M214 774 C218 638 282 574 400 574 C518 574 582 638 586 774 Z" fill="#4A3B31" stroke="#1C1917" stroke-width="10"/>
      <path d="M350 574 L400 634 L450 574 Z" fill="#FFF7E6" stroke="#1C1917" stroke-width="8"/>
      <rect x="366" y="510" width="68" height="74" rx="24" fill="#FFE6D4" stroke="#1C1917" stroke-width="9"/>
      <path d="M262 380 C252 240 318 192 400 192 C482 192 548 240 538 380 L552 554 C520 576 488 574 484 532 L316 532 C312 574 280 576 248 554 Z" fill="#3B2B23" stroke="#1C1917" stroke-width="10"/>
      <ellipse cx="400" cy="398" rx="116" ry="132" fill="#FFE6D4" stroke="#1C1917" stroke-width="10"/>
      <!-- Bangs -->
      <path d="M294 342 C318 286 356 266 400 266 C444 266 482 286 506 342 C476 318 446 316 426 344 C412 318 388 318 374 344 C354 316 324 318 294 342 Z" fill="#3B2B23" stroke="#1C1917" stroke-width="8"/>
      <!-- Cream Beret -->
      <path d="M254 278 C246 198 318 150 404 150 C490 150 554 192 544 268 C536 306 476 322 400 322 C318 322 262 308 254 278 Z" fill="#FFF2CC" stroke="#1C1917" stroke-width="10"/>
      <path d="M402 150 L414 130" stroke="#1C1917" stroke-width="10"/>
      <!-- Round tortoiseshell glasses -->
      <circle cx="348" cy="404" r="38" fill="#FFFFFF" fill-opacity="0.45" stroke="#8C522E" stroke-width="10"/>
      <circle cx="452" cy="404" r="38" fill="#FFFFFF" fill-opacity="0.45" stroke="#8C522E" stroke-width="10"/>
      <path d="M386 404 L414 404" stroke="#8C522E" stroke-width="9"/>
      <circle cx="348" cy="404" r="8" fill="#1C1917"/>
      <circle cx="452" cy="404" r="8" fill="#1C1917"/>
      <ellipse cx="326" cy="442" rx="18" ry="10" fill="#FFB5C5" opacity="0.8"/>
      <ellipse cx="474" cy="442" rx="18" ry="10" fill="#FFB5C5" opacity="0.8"/>
      <path d="M376 468 Q400 488 424 468" fill="none" stroke="#1C1917" stroke-width="8"/>
      <!-- Hand resting under chin -->
      <path d="M326 572 C320 538 352 518 386 524 C402 528 408 548 394 562 L364 592 Z" fill="#FFE6D4" stroke="#1C1917" stroke-width="9"/>
    </g>
    <text x="400" y="886" fill="#1C1917" font-family="sans-serif" font-weight="700" font-size="30" letter-spacing="4" text-anchor="middle">GAMSEONG PHOTO</text>
    <text x="400" y="928" fill="#57534E" font-family="sans-serif" font-weight="600" font-size="20" text-anchor="middle">ILLUSTRATED SAMPLE PREVIEW · REPLACE WITH REAL OUTPUT</text>
  </svg>`;
}

function haruMiniFace(x: number, y: number, pose: 'peace' | 'heart' | 'surprised' | 'wink') {
  const eyeLeft =
    pose === 'wink'
      ? `<path d="M${x - 42} ${y - 4} Q${x - 30} ${y - 16} ${x - 18} ${y - 4}" fill="none" stroke="#1C1917" stroke-width="7"/>`
      : `<circle cx="${x - 30}" cy="${y - 4}" r="7" fill="#1C1917"/>`;
  const mouth =
    pose === 'surprised'
      ? `<circle cx="${x}" cy="${y + 42}" r="12" fill="#FF9BBA" stroke="#1C1917" stroke-width="6"/>`
      : `<path d="M${x - 18} ${y + 38} Q${x} ${y + 54} ${x + 18} ${y + 38}" fill="none" stroke="#1C1917" stroke-width="7"/>`;
  const extra =
    pose === 'peace'
      ? `<path d="M${x + 86} ${y + 88} L${x + 76} ${y + 24} M${x + 92} ${y + 86} L${x + 106} ${y + 26}" stroke="#1C1917" stroke-width="14" stroke-linecap="round"/><path d="M${x + 86} ${y + 88} L${x + 76} ${y + 24} M${x + 92} ${y + 86} L${x + 106} ${y + 26}" stroke="#FFE6D4" stroke-width="6" stroke-linecap="round"/>`
      : pose === 'heart'
        ? `<path d="M${x + 86} ${y + 62} C${x + 70} ${y + 46} ${x + 74} ${y + 24} ${x + 86} ${y + 34} C${x + 98} ${y + 24} ${x + 102} ${y + 46} ${x + 86} ${y + 62} Z" fill="#FF9BBA" stroke="#1C1917" stroke-width="6"/>`
        : pose === 'surprised'
          ? `<circle cx="${x - 84}" cy="${y + 42}" r="22" fill="#FFE6D4" stroke="#1C1917" stroke-width="7"/><circle cx="${x + 84}" cy="${y + 42}" r="22" fill="#FFE6D4" stroke="#1C1917" stroke-width="7"/>`
          : `<path d="M${x - 94} ${y + 72} L${x - 76} ${y + 24} M${x + 94} ${y + 72} L${x + 76} ${y + 24}" stroke="#1C1917" stroke-width="13" stroke-linecap="round"/><path d="M${x - 94} ${y + 72} L${x - 76} ${y + 24} M${x + 94} ${y + 72} L${x + 76} ${y + 24}" stroke="#FFE6D4" stroke-width="5" stroke-linecap="round"/>`;
  return `
    <g stroke-linecap="round" stroke-linejoin="round">
      <path d="M${x - 102} ${y + 210} C${x - 98} ${y + 132} ${x - 62} ${y + 102} ${x} ${y + 102} C${x + 62} ${y + 102} ${x + 98} ${y + 132} ${x + 102} ${y + 210} Z" fill="#FFFFFF" stroke="#1C1917" stroke-width="8"/>
      <ellipse cx="${x}" cy="${y + 8}" rx="74" ry="84" fill="#FFE6D4" stroke="#1C1917" stroke-width="8"/>
      <!-- Pink bandana -->
      <path d="M${x - 72} ${y - 34} Q${x} ${y - 106} ${x + 72} ${y - 34} Q${x} ${y - 52} ${x - 72} ${y - 34} Z" fill="#FFB8CD" stroke="#1C1917" stroke-width="8"/>
      <!-- Star glasses -->
      <polygon points="${x - 32},${y - 34} ${x - 23},${y - 14} ${x - 2},${y - 12} ${x - 18},${y + 2} ${x - 13},${y + 22} ${x - 32},${y + 10} ${x - 51},${y + 22} ${x - 46},${y + 2} ${x - 62},${y - 12} ${x - 41},${y - 14}" fill="#9FD4FF" fill-opacity="0.72" stroke="#1C1917" stroke-width="5"/>
      <polygon points="${x + 32},${y - 34} ${x + 41},${y - 14} ${x + 62},${y - 12} ${x + 46},${y + 2} ${x + 51},${y + 22} ${x + 32},${y + 10} ${x + 13},${y + 22} ${x + 18},${y + 2} ${x + 2},${y - 12} ${x + 23},${y - 14}" fill="#9FD4FF" fill-opacity="0.72" stroke="#1C1917" stroke-width="5"/>
      ${eyeLeft}
      <circle cx="${x + 30}" cy="${y - 4}" r="7" fill="#1C1917"/>
      <ellipse cx="${x - 44}" cy="${y + 24}" rx="12" ry="7" fill="#FFB8CD"/>
      <ellipse cx="${x + 44}" cy="${y + 24}" rx="12" ry="7" fill="#FFB8CD"/>
      ${mouth}
      ${extra}
    </g>
  `;
}

function samplePreviewHaru2x2() {
  const cellBg = (cx: number, cy: number) => `
    <rect x="${cx}" y="${cy}" width="342" height="466" fill="#C4E5FD" stroke="#1C1917" stroke-width="6"/>
    <g fill="#FFFFFF" opacity="0.85">
      <circle cx="${cx + 76}" cy="${cy + 78}" r="26"/><circle cx="${cx + 104}" cy="${cy + 70}" r="32"/><circle cx="${cx + 134}" cy="${cy + 80}" r="24"/>
      <circle cx="${cx + 250}" cy="${cy + 132}" r="22"/><circle cx="${cx + 276}" cy="${cy + 124}" r="28"/><circle cx="${cx + 300}" cy="${cy + 134}" r="20"/>
    </g>
  `;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" width="800" height="1200">
    <rect width="800" height="1200" fill="#E3F1FA"/>
    <defs>
      <clipPath id="c1"><rect x="44" y="48" width="342" height="466"/></clipPath>
      <clipPath id="c2"><rect x="414" y="48" width="342" height="466"/></clipPath>
      <clipPath id="c3"><rect x="44" y="542" width="342" height="466"/></clipPath>
      <clipPath id="c4"><rect x="414" y="542" width="342" height="466"/></clipPath>
    </defs>
    ${cellBg(44, 48)}
    <g clip-path="url(#c1)">${haruMiniFace(215, 304, 'peace')}</g>
    ${cellBg(414, 48)}
    <g clip-path="url(#c2)">${haruMiniFace(585, 304, 'heart')}</g>
    ${cellBg(44, 542)}
    <g clip-path="url(#c3)">${haruMiniFace(215, 798, 'surprised')}</g>
    ${cellBg(414, 542)}
    <g clip-path="url(#c4)">${haruMiniFace(585, 798, 'wink')}</g>
    <text x="400" y="1096" fill="#102436" font-family="sans-serif" font-weight="700" font-size="30" letter-spacing="4" text-anchor="middle">GAMSEONG PHOTO</text>
    <text x="400" y="1136" fill="#18527E" font-family="sans-serif" font-weight="600" font-size="18" text-anchor="middle">ILLUSTRATED SAMPLE PREVIEW · REPLACE WITH REAL OUTPUT</text>
  </svg>`;
}

async function main() {
  // 1. Copy the 3 AI-generated images from the session artifact directory
  await copyGeneratedIfPresent('bunny_4cut_preview_1795274223825.jpg', 'packs/bunny-4cut/preview.png', 720);
  await copyGeneratedIfPresent('bunny_ears_1795274224673.jpg', 'library/props/bunny-ears.png', 512);
  await copyGeneratedIfPresent('mini_bouquet_1795274239962.jpg', 'library/props/mini-bouquet.png', 512);

  // 2. Render remaining prop illustrations
  for (const [id, svg] of Object.entries(PROP_SVGS)) {
    await renderSvgToPng(svg, path.join(PUBLIC_ASSETS, 'library', 'props', `${id}.png`), 512, 512);
  }

  // 3. Render backdrops (5 studio solids + 3 wallpapers)
  for (const [id, svg] of Object.entries(BACKDROP_SVGS)) {
    await renderSvgToPng(svg, path.join(PUBLIC_ASSETS, 'library', 'backdrops', `${id}.png`), 600, 800);
  }

  // 4. Render pose guide illustrations
  for (const [id, svg] of Object.entries(POSE_SVGS)) {
    await renderSvgToPng(svg, path.join(PUBLIC_ASSETS, 'library', 'poses', `${id}.png`), 512, 512);
  }

  // 5. Render required strip templates for each sample pack
  await renderSvgToPng(
    stripTemplate4Cut(),
    path.join(PUBLIC_ASSETS, 'packs', 'bunny-4cut', 'files', 'strip-template-4cut.png'),
    600,
    1800
  );
  await renderSvgToPng(
    stripTemplatePolaroid(),
    path.join(PUBLIC_ASSETS, 'packs', 'cafe-polaroid', 'files', 'strip-template-polaroid.png'),
    800,
    1000
  );
  await renderSvgToPng(
    stripTemplateHaru2x2(),
    path.join(PUBLIC_ASSETS, 'packs', 'y2k-haru-2x2', 'files', 'strip-template-haru-2x2.png'),
    800,
    1200
  );

  // 6. Render illustrated sample previews for the other 2 packs
  await renderSvgToPng(
    samplePreviewCafePolaroid(),
    path.join(PUBLIC_ASSETS, 'packs', 'cafe-polaroid', 'preview.png'),
    800,
    1000
  );
  await renderSvgToPng(
    samplePreviewHaru2x2(),
    path.join(PUBLIC_ASSETS, 'packs', 'y2k-haru-2x2', 'preview.png'),
    800,
    1200
  );

  console.log('Generated all starter assets cleanly.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
