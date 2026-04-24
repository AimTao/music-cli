export interface Config {
  outputDir: string;
  sources: string[];
  timeout: number;
  concurrency: number;
  embedLyrics: boolean;
}

export interface Song {
  name: string;
  artist: string;
}

export interface DownloadResult {
  success: boolean;
  file?: string;
  source?: string;
  size?: number;
  duration?: number;
  lyrics?: LyricsResult;
  error?: string;
  tried?: string[];
}

export interface LyricsResult {
  success: boolean;
  file?: string;
  error?: string;
}

export interface ToolCheck {
  installed: boolean;
  version?: string;
}

export interface FileInfo {
  name: string;
  file: string;
  size: number;
  hasLyrics: boolean;
}

export interface DoctorResult {
  node: { version: string; ok: boolean };
  ytdlp: ToolCheck;
  ffmpeg: ToolCheck;
  python: ToolCheck;
  mutagen: ToolCheck;
  network: Record<string, { ok: boolean; latency?: number; error?: string }>;
  disk: { free: string; ok: boolean };
}

export interface SourceInfo {
  name: string;
  enabled: boolean;
  priority: number;
}
