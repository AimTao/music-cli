# music-cli

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/music-cli.svg)](https://www.npmjs.com/package/music-cli)
[![Node.js](https://img.shields.io/badge/node-%3E%3D16-green.svg)](https://nodejs.org/)

> 🎵 Agent-ready music CLI — JSON output, batch pipe, zero config

[English](README.md) | [中文](README.zh-CN.md)

---

## Features

- 🎯 **Multi-source** — YouTube, Bilibili, SoundCloud, Bandcamp, Netease
- 📝 **Lyrics embedded** — Auto-fetch and write ID3 USLT into MP3
- ⚡ **Sequential probing** — Tries sources in order, stops at first hit
- 🔧 **Self-diagnosis** — `doctor` checks yt-dlp, ffmpeg, network
- 📦 **Zero config** — Works out of the box
- 🤖 **Scriptable** — All commands support `--json` for structured output

## Install

```bash
npm install -g music-cli
```

Or build from source:

```bash
git clone <repo-url>
cd music-cli
bash setup.sh
```

Requires [yt-dlp](https://github.com/yt-dlp/yt-dlp). Lyrics embedding requires `python3` with
[`mutagen`](https://mutagen.readthedocs.io/) installed. [ffmpeg](https://ffmpeg.org/) is optional.

## Usage

```bash
# Download a song
music-cli download "Song Name" "Artist Name"

# JSON output
music-cli download "Song Name" "Artist Name" --json

# List downloaded
music-cli list

# Diagnose environment
music-cli doctor
```

## Commands

| Command | Description |
|---------|-------------|
| `download` | Download songs |
| `list` | List downloaded songs |
| `lyrics` | Fetch lyrics |
| `doctor` | Diagnose environment |
| `sources` | List available sources |
| `info` | Show system info |

## Configuration

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

## License

MIT

---

## For AI / Scripts

All commands support `--json` for structured output.

### download

```bash
music-cli download "Song Name" "Artist" --json
```

Batch via stdin:

```bash
echo '[{"name":"Song 1","artist":"Artist 1"},{"name":"Song 2","artist":"Artist 2"}]' | music-cli download --json
```

Success:

```json
{
  "success": true,
  "file": "/Users/.../Music/music-cli/Song Name Artist.mp3",
  "source": "youtube",
  "size": 3856029,
  "lyrics": { "success": true }
}
```

Failure:

```json
{
  "success": false,
  "error": "All sources failed",
  "tried": ["youtube", "bilibili", "soundcloud", "bandcamp", "netease"]
}
```

Sources are tried sequentially: YouTube → Bilibili → SoundCloud → Bandcamp → Netease.

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
    { "name": "Song Name Artist", "file": "/path/to/song.mp3", "size": 3856029, "hasLyrics": true }
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

### Configuration reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `outputDir` | string | `~/Downloads/music-cli` | Download directory |
| `sources` | string[] | all 5 | Enabled sources |
| `timeout` | number | 10 | Per-source timeout (seconds) |
| `concurrency` | number | 2 | Parallel probe count |
| `embedLyrics` | boolean | true | Auto-embed lyrics into MP3 |

`MUSIC_OUTPUT_DIR` env var overrides `outputDir`.

### Output files

- MP3: `{outputDir}/{song} {artist}.mp3`
- Lyrics: embedded as ID3v2.4 USLT (UTF-8), `.lrc` deleted after embedding

### Exit codes

- `0` — Success
- `1` — Failure (check JSON for details)
