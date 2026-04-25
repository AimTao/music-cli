import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types';

const DEFAULT_OUTPUT_DIR = path.join(os.homedir(), 'Downloads', 'music-cli');

const DEFAULT_CONFIG: Config = {
  outputDir: DEFAULT_OUTPUT_DIR,
  sources: ['bilibili-api', 'youtube', 'bilibili', 'soundcloud', 'bandcamp', 'netease'],
  timeout: 8,
  concurrency: 2,
  embedLyrics: true,
};

function getConfigFile(): string {
  return path.join(process.cwd(), 'config.json');
}

export function loadConfig(): Config {
  const config = { ...DEFAULT_CONFIG };

  const configFile = getConfigFile();
  if (fs.existsSync(configFile)) {
    try {
      const userConfig = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
      Object.assign(config, userConfig);
    } catch {
      console.warn(`Warning: Failed to parse ${configFile}, using defaults`);
    }
  }

  if (process.env.MUSIC_OUTPUT_DIR) {
    config.outputDir = process.env.MUSIC_OUTPUT_DIR;
  }

  return config;
}

export function getConfigPath(): string {
  return getConfigFile();
}
