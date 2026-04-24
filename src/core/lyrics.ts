import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import { execFileSync } from 'child_process';
import { LyricsResult } from '../types';

function fetch(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function stripLrcTimestamps(lrcText: string): string {
  if (!lrcText) return '';
  return lrcText
    .split('\n')
    .map((line) => line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim())
    .filter((line) => line && !line.match(/^\[.*:.*\]$/))
    .join('\n');
}

async function searchAndFetchLyrics(songName: string, artist: string): Promise<string> {
  try {
    const query = encodeURIComponent(`${songName} ${artist}`);
    const searchUrl = `https://music.163.com/api/search/get?s=${query}&type=1&limit=1`;
    const searchData = JSON.parse(await fetch(searchUrl));

    if (searchData.code === 200 && searchData.result?.songs?.length > 0) {
      const songId = searchData.result.songs[0].id;
      const lyricUrl = `https://music.163.com/api/song/lyric?id=${songId}&lv=1`;
      const lyricData = JSON.parse(await fetch(lyricUrl));

      if (lyricData.code === 200) {
        return stripLrcTimestamps(lyricData.lrc?.lyric || '');
      }
    }
  } catch {}
  return '';
}

export async function getLyrics(
  songName: string,
  artist: string,
  outputDir: string,
  temporary: boolean = false
): Promise<LyricsResult> {
  const lyricsDir = temporary
    ? fs.mkdtempSync(path.join(os.tmpdir(), 'music-cli-lyrics-'))
    : path.join(outputDir, 'lyrics');
  fs.mkdirSync(lyricsDir, { recursive: true });

  const query = artist ? `${songName} - ${artist}` : songName;
  const safeName = query.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
  const lrcPath = path.join(lyricsDir, `${safeName}.lrc`);

  if (fs.existsSync(lrcPath)) {
    return { success: true, file: lrcPath };
  }

  const lyrics = await searchAndFetchLyrics(songName, artist);
  if (!lyrics) {
    if (temporary && fs.existsSync(lyricsDir)) {
      fs.rmdirSync(lyricsDir);
    }
    return { success: false, error: '未找到歌词' };
  }

  fs.writeFileSync(lrcPath, lyrics, 'utf-8');
  return { success: true, file: lrcPath };
}

export async function embedLyricsToMp3(mp3Path: string, lrcPath: string, title?: string, artist?: string): Promise<boolean> {
  try {
    const lyricsContent = stripLrcTimestamps(fs.readFileSync(lrcPath, 'utf-8')).trim();
    if (!lyricsContent) return false;

    const pyScript = `
import sys, json
from mutagen.id3 import ID3, USLT, TIT2, TPE1, ID3NoHeaderError

args = json.loads(sys.argv[1])
mp3 = args['mp3']
lyrics = args['lyrics']
title = args.get('title', '')
artist = args.get('artist', '')

try:
    tags = ID3(mp3)
except ID3NoHeaderError:
    tags = ID3()

for key in list(tags.keys()):
    if key.startswith('USLT') or key.startswith('SYLT') or key in {
        'TXXX:LYRICS',
        'TXXX:UNSYNCEDLYRICS',
        'TXXX:SYNCEDLYRICS',
        'TXXX:lyrics',
        'TXXX:lyrics-chi',
    }:
        del tags[key]

tags.add(USLT(encoding=1, lang='chi', desc='', text=lyrics))
if title:
    tags.add(TIT2(encoding=1, text=title))
if artist:
    tags.add(TPE1(encoding=1, text=artist))
tags.save(mp3, v2_version=3)
print('ok')
`;

    const args = JSON.stringify({
      mp3: mp3Path,
      lyrics: lyricsContent,
      ...(title ? { title } : {}),
      ...(artist ? { artist } : {}),
    });

    const result = execFileSync('python3', ['-c', pyScript, args], {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim();

    if (result !== 'ok') return false;

    fs.unlinkSync(lrcPath);
    const lyricsDir = path.dirname(lrcPath);
    if (fs.existsSync(lyricsDir) && fs.readdirSync(lyricsDir).length === 0) {
      fs.rmdirSync(lyricsDir);
    }

    return true;
  } catch {
    return false;
  }
}
