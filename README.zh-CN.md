# music-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/@aimtao/music-cli.svg)](https://www.npmjs.com/package/@aimtao/music-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-green.svg)](https://nodejs.org/)

> 🎵 面向 Agent 的音乐 CLI — JSON 输出、批量管道、零配置

[English](README.md) | [中文](README.zh-CN.md)

---

## 特性

- 🎯 **多源下载** — YouTube、Bilibili、SoundCloud、Bandcamp、网易云
- 📝 **歌词嵌入** — 自动获取并写入 ID3 USLT 帧
- ⚡ **顺序探测** — 按优先级尝试各源，命中即停
- 🔧 **环境诊断** — `doctor` 检查 yt-dlp、ffmpeg、网络
- 📦 **零配置** — 开箱即用
- 🤖 **可脚本化** — 所有命令支持 `--json` 结构化输出

## 安装

```bash
npm install -g @aimtao/music-cli
```

或本地编译：

```bash
git clone <repo-url>
cd music-cli
bash setup.sh
```

需要 [yt-dlp](https://github.com/yt-dlp/yt-dlp)。[ffmpeg](https://ffmpeg.org/) 可选。

## 使用

```bash
# 下载歌曲
music-cli download "歌曲名" "歌手名"

# JSON 输出
music-cli download "歌曲名" "歌手名" --json

# 列出已下载
music-cli list

# 诊断环境
music-cli doctor
```

## 命令

| 命令 | 描述 |
|------|------|
| `download` | 下载歌曲 |
| `list` | 列出已下载歌曲 |
| `lyrics` | 获取歌词 |
| `doctor` | 诊断环境 |
| `sources` | 列出可用下载源 |
| `info` | 显示系统信息 |

## 配置

`./config.json`

```json
{
  "outputDir": "~/Music/music-cli",
  "sources": ["youtube", "bilibili", "soundcloud", "bandcamp", "netease"],
  "timeout": 10,
  "concurrency": 2,
  "embedLyrics": true
}
```

## 许可证

MIT

---

## AI / 脚本参考

所有命令支持 `--json` 输出结构化数据。

### download

```bash
music-cli download "歌曲名" "歌手名" --json
```

批量下载：

```bash
echo '[{"name":"歌曲1","artist":"歌手1"},{"name":"歌曲2","artist":"歌手2"}]' | music-cli download --json
```

成功：

```json
{
  "success": true,
  "file": "/Users/.../Music/music-cli/歌曲名 歌手名.mp3",
  "source": "youtube",
  "size": 3856029,
  "lyrics": { "success": true }
}
```

失败：

```json
{
  "success": false,
  "error": "All sources failed",
  "tried": ["youtube", "bilibili", "soundcloud", "bandcamp", "netease"]
}
```

源按顺序尝试：YouTube → Bilibili → SoundCloud → Bandcamp → 网易云。

### list

```bash
music-cli list --json
```

```json
{
  "success": true,
  "total": 5,
  "totalSize": 19281920,
  "songs": [
    { "name": "歌曲名 歌手名", "file": "/path/to/song.mp3", "size": 3856029, "hasLyrics": true }
  ]
}
```

### doctor

```bash
music-cli doctor --json
```

```json
{
  "success": true,
  "tools": { "node": "v20.0.0", "npm": "9.0.0", "yt-dlp": "2024.01.01", "ffmpeg": "6.0" },
  "network": { "youtube": { "reachable": true, "latency": 120 } }
}
```

### 配置项

| 键 | 类型 | 默认值 | 说明 |
|-----|------|---------|-------------|
| `outputDir` | string | `~/Downloads/music-cli` | 下载目录 |
| `sources` | string[] | 全部 5 个 | 启用的源 |
| `timeout` | number | 10 | 单源超时（秒） |
| `concurrency` | number | 2 | 并发探测数 |
| `embedLyrics` | boolean | true | 自动嵌入歌词 |

环境变量 `MUSIC_OUTPUT_DIR` 覆盖 `outputDir`。

### 输出文件

- MP3：`{outputDir}/{歌曲名} {歌手名}.mp3`
- 歌词：嵌入为 ID3v2.4 USLT（UTF-8），`.lrc` 嵌入后删除

### 退出码

- `0` — 成功
- `1` — 失败（查看 JSON 获取详情）
