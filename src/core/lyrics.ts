import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';
import * as NodeID3 from 'node-id3';
import { LyricsResult } from '../types';
import { sanitizeFilename } from '../utils/ytdlp';

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
  const safeName = sanitizeFilename(query);
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

    const tags: any = { unsynchronisedLyrics: { language: 'chi', text: lyricsContent } };
    if (title) tags.title = title;
    if (artist) tags.artist = artist;

    const success = NodeID3.write(tags, mp3Path);
    if (success instanceof Error) return false;

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
