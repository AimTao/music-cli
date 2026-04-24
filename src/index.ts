import { Command } from 'commander';
import { loadConfig, getConfigPath } from './utils/config';
import { outputJSON } from './utils/output';
import { getLyrics } from './core/lyrics';
import { t, setLang, getLang } from './utils/i18n';
import * as path from 'path';
import * as fs from 'fs';
import * as chalk from './utils/chalk';

const pkg = require('../package.json');

const langIndex = process.argv.indexOf('--lang');
if (langIndex !== -1 && process.argv[langIndex + 1]) {
  const lang = process.argv[langIndex + 1];
  if (lang === 'zh' || lang === 'en') {
    setLang(lang);
  }
}

const program = new Command();

program
  .name('music-cli')
  .description(`${t('cmd.download')} - Agent-ready music CLI`)
  .version(pkg.version)
  .option('--lang <lang>', 'Set language (en/zh)', getLang());

import { downloadCommand } from './commands/download';
import { listCommand } from './commands/list';
import { doctorCommand } from './commands/doctor';
import { sourcesCommand } from './commands/sources';

program.addCommand(downloadCommand);
program.addCommand(listCommand);
program.addCommand(doctorCommand);
program.addCommand(sourcesCommand);

program
  .command('lyrics')
  .description(t('cmd.lyrics'))
  .argument('<name>', t('download.name'))
  .argument('[artist]', t('download.artist'), '')
  .option('--json', t('download.json'), false)
  .action(async (name: string, artist: string, options: any) => {
    const config = loadConfig();
    const result = await getLyrics(name, artist, config.outputDir);

    if (options.json) {
      outputJSON(result);
    } else if (result.success) {
      console.log(`${chalk.green('✓')} ${t('lyrics.saved')}: ${result.file}`);
    } else {
      console.log(`${chalk.yellow('⚠')} ${t('lyrics.not_found')}`);
    }
  });

program
  .command('info')
  .description(t('cmd.info'))
  .option('--json', t('download.json'), false)
  .action((options: any) => {
    const config = loadConfig();
    const dir = config.outputDir;

    let audioCount = 0;
    let lyricsCount = 0;
    let totalSize = 0;

    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      audioCount = files.filter((f) => f.endsWith('.mp3')).length;
      totalSize = files
        .filter((f) => f.endsWith('.mp3'))
        .reduce((acc, f) => acc + fs.statSync(path.join(dir, f)).size, 0);

      const lyricsDir = path.join(dir, 'lyrics');
      if (fs.existsSync(lyricsDir)) {
        lyricsCount = fs.readdirSync(lyricsDir).filter((f) => f.endsWith('.lrc')).length;
      }
    }

    const info = {
      version: pkg.version,
      outputDir: dir,
      configPath: getConfigPath(),
      stats: {
        audioFiles: audioCount,
        lyricsFiles: lyricsCount,
        totalSize,
      },
    };

    if (options.json) {
      outputJSON(info);
    } else {
      console.log(`\n${chalk.cyan('ℹ')} music-cli v${pkg.version}\n`);
      console.log(`  ${t('info.output')}: ${dir}`);
      console.log(`  ${t('info.config')}: ${info.configPath}`);
      console.log(`  ${t('info.audio')}: ${audioCount}`);
      console.log(`  ${t('info.lyrics')}: ${lyricsCount}`);
      console.log(`  ${t('info.total_size')}: ${(totalSize / 1024 / 1024).toFixed(1)}MB\n`);
    }
  });

program.parse();
