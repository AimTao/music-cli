import { Command } from 'commander';
import { loadConfig } from '../utils/config';
import { downloadSong, downloadBatch } from '../core/downloader';
import { outputJSON } from '../utils/output';
import { Song } from '../types';
import { t } from '../utils/i18n';
import * as chalk from '../utils/chalk';

export const downloadCommand = new Command('download')
  .alias('d')
  .description(t('cmd.download'))
  .argument('[name]', t('download.name'))
  .argument('[artist]', t('download.artist'), '')
  .option('-s, --source <source>', t('download.source'))
  .option('-o, --output <dir>', t('download.output'))
  .option('--json', t('download.json'), false)
  .action(async (name: string, artist: string, options: any) => {
    const config = loadConfig();

    if (options.output) {
      config.outputDir = options.output;
    }

    if (options.source) {
      config.sources = [options.source];
    }

    if (name) {
      const result = await downloadSong(config, { name, artist }, options.json);

      if (options.json) {
        outputJSON(result);
      } else if (!result.success) {
        process.exit(1);
      }
    } else {
      if (process.stdin.isTTY) {
        console.log(`${chalk.yellow('⚠')} Usage: music-cli download <name> [artist]`);
        console.log(`  Or pipe JSON: echo '[{"name":"song","artist":"artist"}]' | music-cli download`);
        process.exit(1);
      }
      const chunks: string[] = [];
      process.stdin.on('data', (chunk) => chunks.push(chunk.toString()));
      process.stdin.on('end', async () => {
        try {
          const input = chunks.join('');
          const songs: Song[] = JSON.parse(input);

          const result = await downloadBatch(config, songs, options.json);

          if (options.json) {
            outputJSON(result);
          }
        } catch (e) {
          console.error(`${chalk.red('✗')} ${t('error.input_format')}`);
          process.exit(1);
        }
      });
    }
  });
