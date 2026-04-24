import { spawn } from 'child_process';
import * as fs from 'fs';

export function downloadFromSource(
  source: string,
  query: string,
  outputPath: string,
  timeout: number = 10
): Promise<boolean> {
  return new Promise((resolve) => {
    const searchPrefixes: Record<string, string> = {
      youtube: 'ytsearch',
      bilibili: 'bilisearch',
      soundcloud: 'scsearch',
      bandcamp: 'bcsearch',
      netease: 'nesearch',
    };
    const searchPrefix = searchPrefixes[source] || 'ytsearch';
    const args = [
      '--no-playlist',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '128K',
      '--no-overwrites',
      '--ignore-errors',
      '--default-search', searchPrefix,
      '-o', outputPath,
      `${searchPrefix}1:${query}`,
    ];

    const proc = spawn('yt-dlp', args, {
      stdio: 'ignore',
      timeout: timeout * 1000,
    });

    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        if (stats.size > 100000) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    });

    proc.on('error', () => {
      resolve(false);
    });
  });
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, '_')
    .substring(0, 200);
}
