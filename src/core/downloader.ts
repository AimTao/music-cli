import * as fs from 'fs';
import * as path from 'path';
import { Config, Song, DownloadResult } from '../types';
import { downloadFromSource, sanitizeFilename } from '../utils/ytdlp';
import { getLyrics, embedLyricsToMp3 } from './lyrics';
import { t } from '../utils/i18n';
import * as chalk from '../utils/chalk';

const SOURCE_ORDER = ['youtube', 'bilibili', 'soundcloud', 'bandcamp', 'netease'];

const SOURCE_EMOJI: Record<string, string> = {
  youtube: '📺',
  bilibili: '📺',
  soundcloud: '☁️',
  bandcamp: '🎵',
  netease: '🎶',
  cache: '💾',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}m ${remaining}s`;
}

export async function downloadSong(
  config: Config,
  song: Song,
  quiet: boolean = false
): Promise<DownloadResult> {
  const query = song.artist ? `${song.name} ${song.artist}` : song.name;
  const safeName = sanitizeFilename(query);
  const outputPath = path.join(config.outputDir, `${safeName}.mp3`);

  fs.mkdirSync(config.outputDir, { recursive: true });

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    if (stats.size > 100000) {
      let lyricsResult;
      if (config.embedLyrics) {
        lyricsResult = await fetchAndEmbedLyrics(song, outputPath, config.outputDir);
      }
      if (!quiet) {
        console.log(`${chalk.cyan('⚡')} ${t('download.exists')}: ${chalk.bold(query)}`);
        console.log(`  ${chalk.gray('└─')} ${chalk.green('✓')} ${t('download.skip')}\n`);
      }
      return {
        success: true,
        file: outputPath,
        source: 'cache',
        size: stats.size,
        lyrics: lyricsResult,
      };
    }
  }

  const startTime = Date.now();

  if (!quiet) {
    console.log(`\n${chalk.cyan('🎵')} ${chalk.bold(t('download.downloading'))}: ${query}`);
    console.log(`${chalk.gray('├─')} ${t('download.trying')}: ${SOURCE_ORDER.slice(0, config.concurrency).join(', ')}`);
  }

  for (let i = 0; i < SOURCE_ORDER.length; i++) {
    const source = SOURCE_ORDER[i];
    if (!quiet) {
      console.log(`${chalk.gray('├─')} ${chalk.yellow('⏳')} ${t('download.trying')} ${source}...`);
    }
    const success = await downloadFromSource(source, query, outputPath, config.timeout);
    if (success) {
      const elapsed = Date.now() - startTime;
      return await finalizeDownload(config, song, outputPath, source, elapsed, quiet);
    }
  }

  if (!quiet) {
    console.log(`${chalk.gray('└─')} ${chalk.red('✗')} ${t('download.failed')}\n`);
  }

  return {
    success: false,
    error: t('download.failed'),
    tried: SOURCE_ORDER,
  };
}

async function finalizeDownload(
  config: Config,
  song: Song,
  outputPath: string,
  source: string,
  elapsed: number,
  quiet: boolean
): Promise<DownloadResult> {
  const stats = fs.statSync(outputPath);
  const emoji = SOURCE_EMOJI[source] || '📥';

  let lyricsResult;
  if (config.embedLyrics) {
    lyricsResult = await fetchAndEmbedLyrics(song, outputPath, config.outputDir);
  }

  if (!quiet) {
    console.log(`${chalk.gray('├─')} ${emoji} ${t('download.source_label')}: ${chalk.cyan(source)}`);
    console.log(`${chalk.gray('├─')} 📁 ${t('download.file')}: ${outputPath}`);
    console.log(`${chalk.gray('├─')} 💾 ${t('download.size')}: ${formatSize(stats.size)}`);
    console.log(`${chalk.gray('├─')} ⏱️  ${t('download.duration')}: ${formatDuration(elapsed)}`);
    if (lyricsResult?.success) {
      console.log(`${chalk.gray('└─')} 📝 ${t('download.lyrics')}: ${chalk.green(`✓ ${t('download.lyrics_found')}`)}`);
    } else {
      console.log(`${chalk.gray('└─')} 📝 ${t('download.lyrics')}: ${chalk.yellow(`✗ ${t('download.lyrics_not_found')}`)}`);
    }
    console.log(`${chalk.green('✅')} ${chalk.bold(t('download.complete'))}\n`);
  }

  return {
    success: true,
    file: outputPath,
    source,
    size: stats.size,
    lyrics: lyricsResult,
  };
}

async function fetchAndEmbedLyrics(
  song: Song,
  outputPath: string,
  outputDir: string
): Promise<DownloadResult['lyrics']> {
  const lyricsResult = await getLyrics(song.name, song.artist, outputDir, true);
  try {
    if (!lyricsResult.success || !lyricsResult.file) {
      return lyricsResult;
    }

    const embedded = await embedLyricsToMp3(outputPath, lyricsResult.file, song.name, song.artist);
    if (!embedded) {
      return { success: false, error: t('download.lyrics_embed_failed') };
    }

    return { success: true };
  } finally {
    if (lyricsResult.file && fs.existsSync(lyricsResult.file)) {
      fs.unlinkSync(lyricsResult.file);
    }

    const lyricsDir = lyricsResult.file ? path.dirname(lyricsResult.file) : '';
    if (lyricsDir && fs.existsSync(lyricsDir) && fs.readdirSync(lyricsDir).length === 0) {
      fs.rmdirSync(lyricsDir);
    }
  }
}

export async function downloadBatch(
  config: Config,
  songs: Song[],
  quiet: boolean = false
): Promise<{
  success: boolean;
  total: number;
  successCount: number;
  failCount: number;
  results: DownloadResult[];
}> {
  const results: DownloadResult[] = [];
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  if (!quiet) {
    console.log(`\n${chalk.cyan('📦')} ${chalk.bold(t('download.batch'))}: ${songs.length}\n`);
  }

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const query = song.artist ? `${song.name} ${song.artist}` : song.name;

    if (!quiet) {
      const percent = Math.round(((i + 1) / songs.length) * 100);
      const filled = Math.floor(percent / 5);
      const empty = 20 - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      process.stdout.write(
        `\r${chalk.gray('├─')} [${chalk.cyan(bar)}] ${percent}% (${i + 1}/${songs.length}) ${query.padEnd(30)}`
      );
    }

    const result = await downloadSong(config, song, true);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  const elapsed = Date.now() - startTime;

  if (!quiet) {
    console.log('\n');
    console.log(`${chalk.cyan('📊')} ${chalk.bold(t('download.stats'))}`);
    console.log(`${chalk.gray('├─')} ${t('download.total')}: ${songs.length}`);
    console.log(`${chalk.gray('├─')} ${chalk.green('✓')} ${t('download.success')}: ${successCount}`);
    console.log(`${chalk.gray('├─')} ${chalk.red('✗')} ${t('download.fail')}: ${failCount}`);
    console.log(`${chalk.gray('└─')} ⏱️  ${t('download.time')}: ${formatDuration(elapsed)}\n`);
  }

  return {
    success: failCount === 0,
    total: songs.length,
    successCount,
    failCount,
    results,
  };
}
