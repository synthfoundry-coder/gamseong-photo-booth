import { useEffect, useState } from 'react';
import type { PackFormat } from './types';

export type Lang = 'id' | 'en';

export const DEFAULT_LANG: Lang = 'id';
const LANG_KEY = 'gamseong.lang';
export const LANG_EVENT = 'gamseong:lang-changed';

export function getSavedLang(): Lang {
  if (typeof window === 'undefined') return DEFAULT_LANG;
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    if (raw === 'id' || raw === 'en') return raw;
  } catch {
    // Ignore storage access restrictions
  }
  return DEFAULT_LANG;
}

export function setSavedLang(lang: Lang): void {
  if (typeof window === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Ignore storage access restrictions
  }
  window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: lang }));
}

export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLang(getSavedLang());
    const handler = (event: Event) => {
      const custom = event as CustomEvent<Lang>;
      if (custom.detail === 'id' || custom.detail === 'en') {
        setLang(custom.detail);
      }
    };
    window.addEventListener(LANG_EVENT, handler);
    return () => window.removeEventListener(LANG_EVENT, handler);
  }, []);

  return lang;
}

export const SAMPLE_PACK_SUBTITLES_ID: Record<string, string> = {
  'bunny-4cut':
    'Strip vertikal 4 foto ala Life4Cuts dengan pencahayaan studio cerah dan empat pose solo yang manis.',
  'cafe-polaroid':
    'Satu foto Polaroid instan dengan nuansa film analog hangat dan bingkai putih klasik yang lebar di bawah.',
  'y2k-haru-2x2':
    'Empat foto ekspresif dalam grid 2x2 ala Haru Film dengan bingkai biru langit dan aksesori Y2K.',
};

export const FORMAT_LABELS: Record<Lang, Record<PackFormat | 'all', string>> = {
  id: {
    all: 'Semua Format',
    '4-cut': 'Strip 4-Cut',
    '3-cut': 'Strip 3-Cut',
    '6-cut': 'Grid 6-Cut',
    polaroid: 'Polaroid',
    'haru-2x2': 'Haru 2x2',
  },
  en: {
    all: 'All Formats',
    '4-cut': '4-Cut Strip',
    '3-cut': '3-Cut Strip',
    '6-cut': '6-Cut Grid',
    polaroid: 'Polaroid',
    'haru-2x2': 'Haru 2x2',
  },
};

export const UI_TEXT = {
  id: {
    nav: {
      brandSub: 'Koleksi Prompt 감성네컷',
      packs: 'Koleksi Prompt',
      howTo: 'Cara Pakai',
      howToFull: 'Cara Pakai di Gemini',
      menu: 'Menu',
      closeMenu: 'Tutup menu',
      boothColor: 'Warna Booth',
      language: 'Bahasa',
    },
    gallery: {
      heading: 'Koleksi Pack Prompt',
      subheading:
        'Pilih format strip di bawah, lalu ganti properti, latar, pose, dan nuansa film sebelum membuka prompt.',
      saved: (n: number) => `Tersimpan (${n})`,
      filterFormatAria: 'Filter berdasarkan format strip foto',
      filterTagAria: 'Filter berdasarkan tag gaya',
      tagsLabel: 'Tag:',
      clearFilters: 'Hapus filter',
      liveCount: (shown: number, total: number) =>
        `Menampilkan ${shown} dari ${total} pack prompt.`,
      emptySavedTitle: 'Belum ada pack tersimpan',
      emptySavedDesc:
        'Ketuk tombol hati pada kartu pack mana saja untuk menyimpan strip favoritmu di browser ini.',
      emptyFilterTitle: 'Belum ada pack untuk filter ini',
      emptyFilterDesc:
        'Versi ini menyediakan 3 pack sampel (4-Cut, Single Polaroid, dan Haru 2x2). Tampilkan semua format untuk melihat pack yang tersedia.',
      showAll: (total: number) => `Tampilkan semua ${total} pack`,
      sampleBadge: 'SAMPEL',
      newBadge: 'BARU',
      savePackAria: (title: string) => `Simpan ${title} ke favorit`,
      removePackAria: (title: string) => `Hapus ${title} dari pack tersimpan`,
      cutCount: (n: number) => `${n} foto`,
      customizeCta: 'Atur & pakai pack ini',
    },
    customizer: {
      samplePack: 'PACK SAMPEL',
      cutAndTotal: (cuts: number, totalImages: number) =>
        `${cuts} foto · total ${totalImages} gambar Gemini`,
      saved: 'Tersimpan',
      savePack: 'Simpan pack',
      packPreview: 'Pratinjau Pack',
      zoomPreview: 'Perbesar pratinjau',
      matchesPreviewTitle: 'Sesuai pratinjau (pilihan bawaan)',
      matchesPreviewDesc:
        'Pilihan ini menghasilkan tampilan seperti contoh di atas. Ganti opsi di sebelah kanan untuk menyesuaikan.',
      customComboTitle: 'Kombinasi booth kustom',
      customComboDesc:
        'Hasil strip fotomu akan mengikuti pilihan barumu, bukan persis seperti gambar contoh.',
      resetDefaults: 'Atur ulang bawaan',
      receiptProps: 'Properti',
      receiptBackdrop: 'Latar',
      receiptPose: 'Pose',
      receiptMood: 'Nuansa',
      noneLabel: 'Tanpa properti',
      customizeHeading: 'Atur Booth Kamu',
      stepOf: (curr: number, total: number) => `Langkah ${curr} dari ${total}`,
      stepsAria: 'Langkah kustomisasi prompt',
      stepLabels: {
        props: 'Properti',
        backdrop: 'Latar',
        pose: 'Pose',
        mood: 'Nuansa',
      },
      propsIntro:
        'Pilih maksimal satu properti per slot. Gambar properti yang dipilih otomatis masuk ke paket unduhan bernomor agar Gemini menirunya secara akurat.',
      propSlots: {
        headwear: { title: 'Kepala', titleKo: '머리 소품', none: 'Tanpa hiasan kepala' },
        eyewear: { title: 'Kacamata', titleKo: '안경 & 선글라스', none: 'Tanpa kacamata' },
        accessory: { title: 'Tangan & Aksesori', titleKo: '손 소품', none: 'Tanpa aksesori tangan' },
      },
      noneSelected: 'Tidak dipilih',
      noneKo: '없음',
      backdropIntro:
        'Pilih tirai warna pastel atau wallpaper studio. Gambar latar yang dipilih ikut dimasukkan ke paket unduhan agar pencahayaannya menyatu alami.',
      backdropKind: {
        solid: 'Polos',
        wallpaper: 'Wallpaper',
      },
      poseIntro:
        'Pilih paket gaya pose. Gambar pose hanya panduan visual dan tetap berupa teks di dalam prompt agar Gemini menjaga wajah aslimu dari Image 1.',
      moodIntro: 'Atur pencahayaan flash booth dan nuansa warna film.',
      prevStep: 'Langkah sebelumnya',
      nextStep: (label: string) => `Lanjut: ${label}`,
      revealBtn: 'Tampilkan prompt · 찰칵!',
      promptReadyBelow: 'Prompt siap di bawah',
      readyHeading: 'Siap membuka prompt kamu?',
      readyDesc: (fileCount: number, totalImages: number) =>
        `Paket ini menyiapkan ${fileCount} file referensi bernomor plus foto selfiemu (total ${totalImages} gambar untuk Gemini).`,
      revealedHeading: 'Prompt & Paket File Kamu',
      revealedDesc:
        'Setiap perubahan opsi di atas otomatis memperbarui prompt dan urutan nomor file ini.',
      hidePrompt: 'Sembunyikan prompt',
      copyPrompt: 'Salin prompt',
      promptCopied: 'Prompt tersalin',
      packingZip: 'Mengemas ZIP...',
      zipSaved: 'ZIP tersimpan',
      downloadZip: (count: number) => `Unduh paket ZIP (${count} file)`,
      openGemini: 'Buka aplikasi Gemini',
      copyError:
        'Browser memblokir salin otomatis. Blok teks prompt di bawah lalu salin secara manual.',
      zipError: (detail: string) =>
        `Gagal membuat file ZIP (${detail}). Gunakan tombol Simpan file satu per satu di daftar bawah.`,
      compiledLabel: 'Prompt Gemini Siap Pakai',
      charCount: (n: number) => `${n} karakter`,
      attachmentHeading: (n: number) => `Urutan Lampiran Bernomor (${n} gambar)`,
      attachmentDesc:
        'Lampirkan file ini secara berurutan dalam satu pesan chat Gemini agar Image 1, Image 2, dan seterusnya cocok dengan prompt. Di HP, kamu bisa simpan gambar satu per satu tanpa ekstrak ZIP.',
      yourSelfie: 'Selfie Kamu',
      selfieFilename: '01-selfie-kamu (unggah dari perangkatmu)',
      uploadFirstBadge: 'Unggah dulu dari perangkatmu',
      saveFile: 'Simpan file',
      quickGuideHeading: 'Panduan cepat pakai di Gemini',
      quickGuideStep1Prefix: 'Unduh paket ZIP (atau simpan tiap file bernomor di atas) lalu buka ',
      quickGuideStep1Suffix: '.',
      quickGuideStep2: (refs: string) =>
        `Unggah foto selfie yang terang dan menghadap depan sebagai gambar pertama (Image 1), lalu lampirkan ${refs} secara berurutan.`,
      quickGuideStep3:
        'Tempel prompt yang sudah disalin lalu kirim. Akun Google gratis sudah mendapat kuota harian buat gambar di aplikasi Gemini.',
      lightboxTitle: (title: string) => `Pratinjau ${title}`,
      lightboxCloseAria: 'Tutup pratinjau penuh',
      lightboxHint: 'Klik di luar kotak atau tekan Esc untuk menutup.',
      announceUpdated: 'Prompt dan paket file diperbarui sesuai pilihan barumu.',
      announceReset: 'Semua opsi dikembalikan ke pilihan bawaan pratinjau.',
      announceRevealed: 'Prompt ditampilkan. Salin prompt lalu unduh paket referensi bernomor.',
      announceCopied: 'Prompt berhasil disalin.',
      announceCopyError: 'Gagal menyalin otomatis. Salin teks prompt secara manual.',
      announcePacking: 'Sedang mengemas paket referensi ZIP bernomor.',
      announceZipDone: 'Paket referensi ZIP berhasil diunduh.',
      announceFavAdded: (title: string) => `${title} disimpan ke favorit.`,
      announceFavRemoved: (title: string) => `${title} dihapus dari favorit.`,
    },
  },
  en: {
    nav: {
      brandSub: '감성네컷 Prompt Packs',
      packs: 'Prompt Packs',
      howTo: 'How to Use',
      howToFull: 'How to Use in Gemini',
      menu: 'Menu',
      closeMenu: 'Close menu',
      boothColor: 'Booth Color',
      language: 'Language',
    },
    gallery: {
      heading: 'Prompt Pack Collection',
      subheading:
        'Pick a strip format below, then swap props, backdrop, pose, and film mood before revealing the prompt.',
      saved: (n: number) => `Saved (${n})`,
      filterFormatAria: 'Filter by photo strip format',
      filterTagAria: 'Filter by vibe tag',
      tagsLabel: 'Tags:',
      clearFilters: 'Clear filters',
      liveCount: (shown: number, total: number) => `Showing ${shown} of ${total} prompt packs.`,
      emptySavedTitle: 'No saved packs yet',
      emptySavedDesc:
        'Tap the heart button on any pack card to keep your go-to booth strips in this browser.',
      emptyFilterTitle: 'No packs match this filter yet',
      emptyFilterDesc:
        'This v1 launch includes 3 sample packs (4-Cut, Single Polaroid, and Haru 2x2). Show all formats to browse available packs.',
      showAll: (total: number) => `Show all ${total} packs`,
      sampleBadge: 'SAMPLE',
      newBadge: 'NEW',
      savePackAria: (title: string) => `Save ${title} to favorites`,
      removePackAria: (title: string) => `Remove ${title} from saved packs`,
      cutCount: (n: number) => `${n} ${n === 1 ? 'cut' : 'cuts'}`,
      customizeCta: 'Customize this pack',
    },
    customizer: {
      samplePack: 'SAMPLE PACK',
      cutAndTotal: (cuts: number, totalImages: number) =>
        `${cuts} ${cuts === 1 ? 'cut' : 'cuts'} · ${totalImages} total Gemini images`,
      saved: 'Saved',
      savePack: 'Save pack',
      packPreview: 'Pack Preview',
      zoomPreview: 'Zoom preview',
      matchesPreviewTitle: 'Matches preview (default picks)',
      matchesPreviewDesc:
        'These options reproduce the sample look above. Swap any item on the right to customize.',
      customComboTitle: 'Custom booth combo',
      customComboDesc:
        'Your generated strip will reflect your new picks rather than the sample preview.',
      resetDefaults: 'Reset defaults',
      receiptProps: 'Props',
      receiptBackdrop: 'Backdrop',
      receiptPose: 'Pose',
      receiptMood: 'Mood',
      noneLabel: 'None',
      customizeHeading: 'Customize Your Booth',
      stepOf: (curr: number, total: number) => `Step ${curr} of ${total}`,
      stepsAria: 'Prompt customization steps',
      stepLabels: {
        props: 'Props',
        backdrop: 'Backdrop',
        pose: 'Pose',
        mood: 'Mood',
      },
      propsIntro:
        'Pick up to one item per slot. Selected prop images are added to your numbered download kit so Gemini reproduces their look accurately.',
      propSlots: {
        headwear: { title: 'Headwear', titleKo: '머리 소품', none: 'No headwear' },
        eyewear: { title: 'Eyewear', titleKo: '안경 & 선글라스', none: 'No eyewear' },
        accessory: { title: 'Hands & Extras', titleKo: '손 소품', none: 'No hands & extras' },
      },
      noneSelected: 'None selected',
      noneKo: '없음',
      backdropIntro:
        'Choose a pastel curtain or cute studio wallpaper. The chosen backdrop image is bundled into your download kit so lighting matches naturally.',
      backdropKind: {
        solid: 'Solid',
        wallpaper: 'Wallpaper',
      },
      poseIntro:
        'Pick a pose direction. Pose previews are visual guides only and stay text-only in the prompt so Gemini keeps your own face from Image 1.',
      moodIntro: 'Set the booth flash lighting and film color finish.',
      prevStep: 'Previous step',
      nextStep: (label: string) => `Next: ${label}`,
      revealBtn: 'Reveal prompt · 찰칵!',
      promptReadyBelow: 'Prompt ready below',
      readyHeading: 'Ready to develop your prompt?',
      readyDesc: (fileCount: number, totalImages: number) =>
        `Your kit prepares ${fileCount} numbered reference ${fileCount === 1 ? 'file' : 'files'} plus your selfie (${totalImages} images total for Gemini).`,
      revealedHeading: 'Your Custom Prompt & Kit',
      revealedDesc:
        'Changing any option above updates this prompt and file numbering automatically.',
      hidePrompt: 'Hide prompt',
      copyPrompt: 'Copy prompt',
      promptCopied: 'Prompt copied',
      packingZip: 'Packing ZIP...',
      zipSaved: 'Kit ZIP saved',
      downloadZip: (count: number) => `Download kit ZIP (${count} files)`,
      openGemini: 'Open Gemini app',
      copyError:
        'Browser blocked automatic copy. Select the prompt text in the box below and copy manually.',
      zipError: (detail: string) =>
        `Could not build the ZIP file (${detail}). Use the individual Save buttons in the checklist below instead.`,
      compiledLabel: 'Compiled Gemini Prompt',
      charCount: (n: number) => `${n} chars`,
      attachmentHeading: (n: number) => `Numbered Attachment Order (${n} images)`,
      attachmentDesc:
        'Attach these in order inside one Gemini chat message so Image 1, Image 2, and so on match the prompt. On phones, save individual files directly if you prefer not to unzip.',
      yourSelfie: 'Your Selfie',
      selfieFilename: '01-your-selfie (upload from your device)',
      uploadFirstBadge: 'Upload from your device first',
      saveFile: 'Save file',
      quickGuideHeading: 'Quick run checklist for Gemini',
      quickGuideStep1Prefix: 'Download the ZIP kit (or save each numbered file above) and open ',
      quickGuideStep1Suffix: '.',
      quickGuideStep2: (refs: string) =>
        `Attach a clear, front-facing selfie first (Image 1), then attach ${refs} in order.`,
      quickGuideStep3:
        'Paste the copied prompt and send. Free Google accounts get daily image generations built into the Gemini app.',
      lightboxTitle: (title: string) => `${title} preview`,
      lightboxCloseAria: 'Close preview lightbox',
      lightboxHint: 'Click outside this frame or press Esc to close.',
      announceUpdated: 'Prompt and kit updated for your new selection.',
      announceReset: 'Reset all options to preview defaults.',
      announceRevealed: 'Prompt revealed. Copy the prompt and download your numbered reference kit.',
      announceCopied: 'Prompt copied to clipboard.',
      announceCopyError: 'Could not copy automatically. Select the prompt text and copy manually.',
      announcePacking: 'Packing your numbered reference kit ZIP.',
      announceZipDone: 'Reference kit ZIP downloaded.',
      announceFavAdded: (title: string) => `Saved ${title} to favorites.`,
      announceFavRemoved: (title: string) => `Removed ${title} from favorites.`,
    },
  },
} as const;
