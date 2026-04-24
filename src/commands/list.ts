import { Command } from 'commander';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../utils/config';
import { outputJSON } from '../utils/output';
import { FileInfo } from '../types';
import { t } from '../utils/i18n';
import * as chalk from '../utils/chalk';

function hasEmbeddedLyrics(filePath: string): boolean {
  try {
    const out = execFileSync('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      filePath,
    ], { encoding: 'utf-8', timeout: 5000 });
    const tags = JSON.parse(out)?.format?.tags;
    return !!(tags?.lyrics || tags?.['lyrics-chi'] || tags?.LYRICS);
  } catch {
    return false;
  }
}

export const listCommand = new Command('list')
  .alias('ls')
  .description(t('cmd.list'))
  .option('-o, --output <dir>', 'Directory')
  .option('--json', t('download.json'), false)
  .action((options: any) => {
    const config = loadConfig();
    const dir = options.output || config.outputDir;

    if (!fs.existsSync(dir)) {
      if (options.json) {
        outputJSON({ success: true, total: 0, songs: [] });
      } else {
        console.log(`${chalk.yellow('⚠')} ${t('list.empty')}`);
      }
      return;
    }

    const audioExts = ['.mp3', '.m4a', '.opus', '.flac', '.wav', '.ogg'];
    const files = fs.readdirSync(dir).filter((f) => audioExts.some((ext) => f.endsWith(ext)));

    const songs: FileInfo[] = files.map((f) => {
      const filePath = path.join(dir, f);
      const stats = fs.statSync(filePath);
      const ext = path.extname(f);
      const baseName = path.basename(f, ext);

      return {
        name: baseName,
        file: filePath,
        size: stats.size,
        hasLyrics: ext === '.mp3' ? hasEmbeddedLyrics(filePath) : false,
      };
    });

    const totalSize = songs.reduce((acc, s) => acc + s.size, 0);

    if (options.json) {
      outputJSON({
        success: true,
        total: songs.length,
        totalSize,
        songs,
      });
    } else {
      console.log(`\n${chalk.cyan('📋')} ${t('list.title')}: ${songs.length} ${t('list.total')}, ${(totalSize / 1024 / 1024).toFixed(1)}MB\n`);
      songs.forEach((s) => {
        const size = (s.size / 1024 / 1024).toFixed(1);
        const lyrics = s.hasLyrics ? chalk.green('✓') : chalk.red('✗');
        console.log(`  ${lyrics} ${s.name} (${size}MB)`);
      });
      console.log();
    }
  });
