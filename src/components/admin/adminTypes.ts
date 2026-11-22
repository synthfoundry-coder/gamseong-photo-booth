export interface StagedImageUpload {
  assetUrl: string; // e.g. /assets/library/props/cat-ears.png
  repoPath: string; // e.g. public/assets/library/props/cat-ears.png
  base64: string;
  dataUrl: string; // Used for instant preview in Admin before publishing
  width: number;
  height: number;
  byteSize: number;
}

export interface AdminSessionInfo {
  authenticated: boolean;
  authConfig: {
    configured: boolean;
    usingDevFallbackPassword: boolean;
    missingVars: string[];
  };
  storage: {
    mode: 'github' | 'local' | 'unconfigured';
    repoLabel: string;
    branch: string;
    missingVars: string[];
  };
}
