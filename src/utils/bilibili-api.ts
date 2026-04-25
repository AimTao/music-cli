import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import { spawn } from 'child_process';

const BUVID3 = '888infoc';
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function httpGet(url: string, headers: Record<string, string>, timeout: number = 8000, binary: boolean = false): Promise<any> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location, headers, timeout, binary).then(resolve).catch(reject);
        return;
      }
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => {
        const body = Buffer.concat(chunks);
        if (binary) {
          resolve(body);
        } else {
          try {
            resolve(JSON.parse(body.toString()));
          } catch {
            reject(new Error(`Failed to parse JSON from ${url}`));
          }
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

export async function searchBilibili(keyword: string): Promise<string | null> {
  const encoded = encodeURIComponent(keyword);
  const url = `https://api.bilibili.com/x/web-interface/wbi/search/type?search_type=video&keyword=${encoded}&page=1&page_size=1`;
  const data = await httpGet(url, {
    'User-Agent': USER_AGENT,
    'Referer': 'https://search.bilibili.com/',
  });
  const results = data?.data?.result;
  if (results && results.length > 0) {
    return results[0].bvid || null;
  }
  return null;
}

export async function getVideoInfo(bvid: string): Promise<{ cid: number; title: string } | null> {
  const url = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const data = await httpGet(url, {
    'User-Agent': USER_AGENT,
    'Referer': 'https://www.bilibili.com/',
  });
  if (data?.data) {
    return { cid: data.data.cid, title: data.data.title };
  }
  return null;
}

export async function getAudioUrl(bvid: string, cid: number): Promise<string | null> {
  const params = `bvid=${bvid}&cid=${cid}&fnval=16&qn=30216`;
  const url = `https://api.bilibili.com/x/player/playurl?${params}`;
  const data = await httpGet(url, {
    'User-Agent': USER_AGENT,
    'Referer': `https://www.bilibili.com/video/${bvid}`,
    'Cookie': `buvid3=${BUVID3}; b_nut=100`,
  });
  const audioList = data?.data?.dash?.audio;
  if (audioList && audioList.length > 0) {
    return audioList[0].baseUrl;
  }
  return null;
}

export async function downloadAudio(audioUrl: string, outputPath: string, timeout: number = 120000): Promise<boolean> {
  const m4aPath = outputPath.replace(/\.mp3$/, '.m4a');

  try {
    const audioData = await httpGet(audioUrl, {
      'User-Agent': USER_AGENT,
      'Referer': 'https://www.bilibili.com/',
    }, timeout, true);

    if (!audioData || audioData.length < 100000) {
      return false;
    }

    fs.writeFileSync(m4aPath, audioData);

    return new Promise((resolve) => {
      const proc = spawn('ffmpeg', ['-i', m4aPath, '-ab', '192k', '-y', outputPath], {
        stdio: 'ignore',
        timeout: 60000,
      });
      proc.on('close', (code) => {
        try { fs.unlinkSync(m4aPath); } catch {}
        if (code === 0 && fs.existsSync(outputPath)) {
          const stats = fs.statSync(outputPath);
          resolve(stats.size > 100000);
        } else {
          resolve(false);
        }
      });
      proc.on('error', () => {
        try { fs.unlinkSync(m4aPath); } catch {}
        resolve(false);
      });
    });
  } catch {
    try { if (fs.existsSync(m4aPath)) fs.unlinkSync(m4aPath); } catch {}
    return false;
  }
}

export async function downloadFromBilibiliApi(
  query: string,
  outputPath: string,
  timeout: number = 30
): Promise<boolean> {
  const timeoutMs = timeout * 1000;

  try {
    const bvid = await searchBilibili(query);
    if (!bvid) return false;

    const info = await getVideoInfo(bvid);
    if (!info) return false;

    const audioUrl = await getAudioUrl(bvid, info.cid);
    if (!audioUrl) return false;

    return await downloadAudio(audioUrl, outputPath, timeoutMs);
  } catch {
    return false;
  }
}
