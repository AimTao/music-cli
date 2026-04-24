import { Command } from 'commander';
import { execSync } from 'child_process';
import { outputJSON } from '../utils/output';
import { loadConfig } from '../utils/config';
import { SourceInfo } from '../types';
import { t } from '../utils/i18n';
import * as chalk from '../utils/chalk';

const SOURCE_INFO: Record<string, { name: string; url: string }> = {
  youtube: { name: 'YouTube', url: 'youtube.com' },
  bilibili: { name: 'Bilibili', url: 'bilibili.com' },
  soundcloud: { name: 'SoundCloud', url: 'soundcloud.com' },
  bandcamp: { name: 'Bandcamp', url: 'bandcamp.com' },
  netease: { name: 'Netease', url: 'music.163.com' },
};

export const sourcesCommand = new Command('sources')
  .description(t('cmd.sources'))
  .option('--json', t('download.json'), false)
  .action(async (options: any) => {
    const config = loadConfig();
    const sources: SourceInfo[] = [];

    for (let i = 0; i < config.sources.length; i++) {
      const source = config.sources[i];
      const info = SOURCE_INFO[source] || { name: source, url: '' };

      let reachable = false;
      try {
        execSync(`curl -s -o /dev/null --connect-timeout 3 https://${info.url}`, {
          stdio: 'ignore',
        });
        reachable = true;
      } catch {}

      sources.push({
        name: info.name,
        enabled: reachable,
        priority: i + 1,
      });
    }

    if (options.json) {
      outputJSON({ success: true, sources });
    } else {
      console.log(`\n${chalk.cyan('🎯')} ${t('sources.title')}:\n`);
      sources.forEach((s) => {
        console.log(`  ✓ [${t('sources.priority')}${s.priority}] ${s.name}`);
      });
      console.log();
    }
  });
