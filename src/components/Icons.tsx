import React from 'react';

interface IconProps {
  className?: string;
}

// Custom outlined booth-style icons matching our warm Korean sticker motif
export function CameraIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.2-2h5.4l1.2 2h1.6A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9Z" />
      <circle cx="12" cy="13" r="3.6" />
      <circle cx="17.2" cy="9.2" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FilmStripIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="2.5" width="12" height="19" rx="2" />
      <line x1="6" y1="7.5" x2="18" y2="7.5" />
      <line x1="6" y1="12.5" x2="18" y2="12.5" />
      <line x1="6" y1="17.5" x2="18" y2="17.5" />
    </svg>
  );
}

export function HeartIcon({
  className = 'w-5 h-5',
  filled = false,
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20.4C12 20.4 4 15.1 4 9.4A4.6 4.6 0 0 1 12 6.3a4.6 4.6 0 0 1 8 3.1c0 5.7-8 11-8 11Z" />
    </svg>
  );
}

export function CopyIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="11" height="12" rx="2" />
      <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12.5 9.8 17 19 7.5" />
    </svg>
  );
}

export function DownloadIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 4v11" />
      <path d="M7.5 11.5 12 16l4.5-4.5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function ExternalLinkIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 4h6v6" />
      <path d="M10 14 20 4" />
      <path d="M19 13.5V19a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H11" />
    </svg>
  );
}

export function ZoomIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
      <path d="M11 8.5v5M8.5 11h5" />
    </svg>
  );
}

export function CloseIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 6 18 18M18 6 6 18" />
    </svg>
  );
}

export function ResetIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12a8 8 0 1 1 2.3 5.6" />
      <path d="M4 17v-5h5" />
    </svg>
  );
}

export function MenuIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function LockIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="11" width="14" height="10" rx="2.5" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

export function PlusIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6.5 7l1 12.5A2 2 0 0 0 9.5 21h5a2 2 0 0 0 2-1.5L17.5 7" />
      <path d="M10 11.5v5.5M14 11.5v5.5" />
    </svg>
  );
}

export function UploadIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V5" />
      <path d="M7.5 9.5 12 5l4.5 4.5" />
      <path d="M4 19.5h16" />
    </svg>
  );
}

export function EyeIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function EyeOffIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a2.8 2.8 0 0 0 3.8 3.8" />
      <path d="M9.5 5.8A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.5 16.5 0 0 1-3.1 4" />
      <path d="M6.2 7.8C3.9 9.5 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.5 0 2.9-.3 4.1-.9" />
    </svg>
  );
}

export function LogOutIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9.5" />
    </svg>
  );
}
