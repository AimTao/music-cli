import { Command } from 'commander';
import * as fs from 'fs';
import * as os from 'os';
import { execSync } from 'child_process';
import { outputJSON } from '../utils/output';
import { DoctorResult } from '../types';
import { t } from '../utils/i18n';
import * as chalk from '../utils/chalk';

async function checkNetwork(host: string): Promise<{ ok: boolean; latency?: number; error?: string }> {
  try {
    const start = Date.now();
    execSync(`curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 https://${host}`, {
      encoding: 'utf-8',
      stdio: 'ignore',
    });
    const latency = Date.now() - start;
    return { ok: true, latency };
  } catch (e: any) {
    return { ok: false, error: e.message?.substring(0, 50) };
  }
}

export const doctorCommand = new Command('doctor')
  .description(t('cmd.doctor'))
  .option('--json', t('download.json'), false)
  .action(async (options: any) => {
    const result: DoctorResult = {
      node: { version: process.version, ok: true },
      ytdlp: { installed: false },
      ffmpeg: { installed: false },
      python: { installed: false },
      mutagen: { installed: false },
      network: {},
      disk: { free: '', ok: false },
    };

    try {
      result.ytdlp.version = execSync('yt-dlp --version', { encoding: 'utf-8' }).trim();
      result.ytdlp.installed = true;
    } catch {}

    try {
      result.ffmpeg.version = execSync('ffmpeg -version', { encoding: 'utf-8' }).split('\n')[0];
      result.ffmpeg.installed = true;
    } catch {}

    try {
      result.python.version = execSync('python3 --version', { encoding: 'utf-8' }).trim();
      result.python.installed = true;
    } catch {}

    try {
      result.mutagen.version = execSync('python3 -c "import mutagen; print(mutagen.version_string)"', {
        encoding: 'utf-8',
      }).trim();
      result.mutagen.installed = true;
    } catch {}

    const hosts = ['youtube.com', 'bilibili.com', 'soundcloud.com', 'music.163.com'];
    for (const host of hosts) {
      result.network[host] = await checkNetwork(host);
    }

    try {
      const stats = fs.statfsSync(os.homedir());
      const freeGB = (stats.bavail * stats.bsize) / 1024 / 1024 / 1024;
      result.disk.free = `${freeGB.toFixed(1)}GB`;
      result.disk.ok = freeGB > 1;
    } catch {}

    if (options.json) {
      outputJSON(result);
    } else {
      console.log(`\n${chalk.cyan('🔍')} ${t('doctor.title')}\n`);
      console.log(`  ${result.node.ok ? '✓' : '✗'} ${t('doctor.node')} ${result.node.version}`);
      console.log(`  ${result.ytdlp.installed ? '✓' : '✗'} ${t('doctor.ytdlp')} ${result.ytdlp.version || t('doctor.not_installed')}`);
      console.log(`  ${result.ffmpeg.installed ? '✓' : '✗'} ${t('doctor.ffmpeg')} ${result.ffmpeg.installed ? t('doctor.installed') : t('doctor.not_installed')}`);
      console.log(`  ${result.python.installed ? '✓' : '✗'} ${t('doctor.python')} ${result.python.version || t('doctor.not_installed')}`);
      console.log(`  ${result.mutagen.installed ? '✓' : '✗'} ${t('doctor.mutagen')} ${result.mutagen.version || t('doctor.not_installed')}`);
      console.log(`\n${chalk.cyan('🌐')} ${t('doctor.network')}:`);
      for (const [host, info] of Object.entries(result.network)) {
        const status = info.ok ? `✓ ${info.latency}ms` : '✗';
        console.log(`  ${status} ${host}`);
      }
      console.log(`\n  ${result.disk.ok ? '✓' : '✗'} ${t('doctor.disk')}: ${result.disk.free}\n`);
    }
  });
