type Lang = 'zh' | 'en';

function getSystemLang(): Lang {
  const langEnv = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || '';
  return langEnv.startsWith('zh') ? 'zh' : 'en';
}

const messages: Record<Lang, Record<string, string>> = {
  en: {
    'cmd.download': 'Download songs',
    'cmd.list': 'List downloaded songs',
    'cmd.lyrics': 'Fetch lyrics',
    'cmd.doctor': 'Diagnose environment',
    'cmd.sources': 'List available sources',
    'cmd.info': 'Show system info',

    'download.name': 'Song name',
    'download.artist': 'Artist name',
    'download.source': 'Download source (youtube/bilibili/soundcloud/bandcamp/netease)',
    'download.output': 'Output directory',
    'download.json': 'JSON output (AI friendly)',
    'download.downloading': 'Downloading',
    'download.trying': 'Trying',
    'download.complete': 'Download complete!',
    'download.failed': 'All sources failed',
    'download.exists': 'Song already exists',
    'download.skip': 'Skip download',
    'download.file': 'File',
    'download.source_label': 'Source',
    'download.size': 'Size',
    'download.duration': 'Duration',
    'download.lyrics': 'Lyrics',
    'download.lyrics_found': 'Embedded',
    'download.lyrics_not_found': 'Not found',
    'download.lyrics_embed_failed': 'Lyrics embed failed',
    'download.batch': 'Batch Download',
    'download.stats': 'Download Stats',
    'download.total': 'Total',
    'download.success': 'Success',
    'download.fail': 'Failed',
    'download.time': 'Time',

    'list.title': 'Downloaded Songs',
    'list.total': 'Total songs',
    'list.empty': 'No downloaded songs',

    'lyrics.saved': 'Lyrics saved',
    'lyrics.not_found': 'Lyrics not found',

    'doctor.title': 'Environment Diagnosis',
    'doctor.node': 'Node.js',
    'doctor.ytdlp': 'yt-dlp',
    'doctor.ffmpeg': 'ffmpeg',
    'doctor.python': 'python3',
    'doctor.mutagen': 'mutagen',
    'doctor.network': 'Network Connection',
    'doctor.disk': 'Disk Space',
    'doctor.installed': 'Installed',
    'doctor.not_installed': 'Not installed',

    'sources.title': 'Available Sources',
    'sources.priority': 'Priority',

    'info.output': 'Output Directory',
    'info.config': 'Config File',
    'info.audio': 'Audio Files',
    'info.lyrics': 'Lyrics Files',
    'info.total_size': 'Total Size',

    'error.input_format': 'Invalid input format, expected JSON array',
  },

  zh: {
    'cmd.download': '下载歌曲',
    'cmd.list': '列出已下载歌曲',
    'cmd.lyrics': '获取歌词',
    'cmd.doctor': '诊断环境',
    'cmd.sources': '列出可用下载源',
    'cmd.info': '显示系统信息',

    'download.name': '歌曲名称',
    'download.artist': '歌手名称',
    'download.source': '指定下载源 (youtube/bilibili/soundcloud/bandcamp/netease)',
    'download.output': '输出目录',
    'download.json': 'JSON输出 (AI友好)',
    'download.downloading': '下载中',
    'download.trying': '尝试',
    'download.complete': '下载完成!',
    'download.failed': '所有源都失败',
    'download.exists': '歌曲已存在',
    'download.skip': '跳过下载',
    'download.file': '文件',
    'download.source_label': '来源',
    'download.size': '大小',
    'download.duration': '耗时',
    'download.lyrics': '歌词',
    'download.lyrics_found': '已嵌入',
    'download.lyrics_not_found': '未找到',
    'download.lyrics_embed_failed': '歌词嵌入失败',
    'download.batch': '批量下载',
    'download.stats': '下载统计',
    'download.total': '总数',
    'download.success': '成功',
    'download.fail': '失败',
    'download.time': '总耗时',

    'list.title': '已下载歌曲',
    'list.total': '歌曲总数',
    'list.empty': '暂无下载记录',

    'lyrics.saved': '歌词已保存',
    'lyrics.not_found': '未找到歌词',

    'doctor.title': '环境诊断',
    'doctor.node': 'Node.js',
    'doctor.ytdlp': 'yt-dlp',
    'doctor.ffmpeg': 'ffmpeg',
    'doctor.python': 'python3',
    'doctor.mutagen': 'mutagen',
    'doctor.network': '网络连接',
    'doctor.disk': '磁盘空间',
    'doctor.installed': '已安装',
    'doctor.not_installed': '未安装',

    'sources.title': '可用下载源',
    'sources.priority': '优先级',

    'info.output': '输出目录',
    'info.config': '配置文件',
    'info.audio': '音频文件',
    'info.lyrics': '歌词文件',
    'info.total_size': '总大小',

    'error.input_format': '输入格式错误，应为JSON数组',
  },
};

let currentLang: Lang = getSystemLang();

export function setLang(lang: Lang): void {
  currentLang = lang;
}

export function t(key: string): string {
  return messages[currentLang][key] || key;
}

export function getLang(): Lang {
  return currentLang;
}
