#!/bin/bash
set -e

# ── Colors ──
R='\033[0m'
D='\033[2m'
B='\033[1m'
RED='\033[38;5;203m'
GRN='\033[38;5;114m'
YLW='\033[38;5;215m'
CYN='\033[38;5;75m'
GRY='\033[38;5;243m'
WHT='\033[38;5;255m'
DIM='\033[38;5;240m'

# ── Detect OS ──
OS="$(uname -s)"
case "$OS" in
  Darwin)
    OS_LABEL="macOS"
    PKG_MGR="brew install"
    ;;
  Linux)
    OS_LABEL="Linux"
    if command -v apt &>/dev/null; then PKG_MGR="sudo apt install -y"
    elif command -v dnf &>/dev/null; then PKG_MGR="sudo dnf install -y"
    elif command -v pacman &>/dev/null; then PKG_MGR="sudo pacman -S --noconfirm"
    else PKG_MGR=""
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    OS_LABEL="Windows"
    PKG_MGR="winget install"
    if ! command -v winget &>/dev/null; then
      PKG_MGR="choco install"
      command -v choco &>/dev/null || PKG_MGR=""
    fi
    ;;
  *)
    OS_LABEL="$OS"
    PKG_MGR=""
    ;;
esac

# ── i18n ──
LANG_ENV="${LANG:-${LC_ALL:-en}}"
if [[ "$LANG_ENV" == zh* ]]; then
  T_TITLE="本地编译安装"
  T_SUBTITLE="多源音乐下载器 · ${OS_LABEL}"
  T_ENV="环境检测"
  T_BUILD="编译安装"
  T_INSTALL="安装依赖中..."
  T_CHECKING="检查依赖..."
  T_INSTALLED="依赖安装完成"
  T_COMPILE="编译 TypeScript..."
  T_COMPILED="编译成功"
  T_LINK="创建全局链接..."
  T_LINKED="全局链接已创建"
  T_LINK_EXISTS="已存在旧链接，覆盖..."
  T_LINK_TRY="权限不足，尝试 sudo..."
  T_LINK_FAIL="链接失败"
  T_READY="安装完成"
  T_READY_HINT="运行 music-cli --help 开始使用"
  T_EXAMPLE="试试看:"
  T_COMPILE_FAIL="编译失败"
  T_REQUIRED="必需"
  T_OPTIONAL="可选"
  T_ASK_INSTALL="是否自动安装以上依赖？[Y/n] "
  T_INSTALLING="正在安装"
  T_INSTALLED_DONE="安装完成"
  T_INSTALL_SKIP="已跳过自动安装"
  T_ABORT="缺少必要依赖，已终止"
else
  T_TITLE="local setup"
  T_SUBTITLE="Multi-source music downloader · ${OS_LABEL}"
  T_ENV="Environment"
  T_BUILD="Build"
  T_INSTALL="Installing dependencies..."
  T_CHECKING="Checking dependencies..."
  T_INSTALLED="Dependencies installed"
  T_COMPILE="Compiling TypeScript..."
  T_COMPILED="Compiled successfully"
  T_LINK="Linking globally..."
  T_LINKED="Linked"
  T_LINK_EXISTS="Old link exists, overwriting..."
  T_LINK_TRY="Trying with sudo..."
  T_LINK_FAIL="Link failed"
  T_READY="Ready."
  T_READY_HINT="Run music-cli --help to get started."
  T_EXAMPLE="Try it:"
  T_COMPILE_FAIL="Compile failed"
  T_REQUIRED="required"
  T_OPTIONAL="optional"
  T_ASK_INSTALL="Auto-install the above? [Y/n] "
  T_INSTALLING="Installing"
  T_INSTALLED_DONE="Installed"
  T_INSTALL_SKIP="Skipped auto-install"
  T_ABORT="Missing required dependencies, abort."
fi

# ── Step helpers ──
step() {
  printf "  ${CYN}○${R}  %s" "$1"
}

done_step() {
  printf "\r  ${GRN}●${R}  %s\n" "$1"
}

fail_step() {
  printf "\r  ${RED}●${R}  %s\n" "$1"
}

# ── Header ──
echo ""
printf "  ${B}${WHT}🎵 music-cli${R}  ${D}${T_TITLE}${R}\n"
printf "  ${DIM}${T_SUBTITLE}${R}\n"
echo ""

# ── Collect missing deps ──
MISSING=()       # (name label required/optional install_cmd)
NODE_OK=false
NPM_OK=false

# Node.js
if command -v node &>/dev/null; then
  VER=$(node -v)
  MAJOR=$(echo "$VER" | sed 's/v//' | cut -d. -f1)
  if [ "$MAJOR" -ge 16 ]; then
    NODE_OK=true
  fi
fi
if [ "$NODE_OK" = true ]; then
  printf "  ${GRN}●${R}  %-12s ${D}%s${R}\n" "node" "$VER"
else
  printf "  ${RED}○${R}  %-12s\n" "node"
  if [[ "$OS_LABEL" == "Windows" ]]; then
    MISSING+=("node|${T_REQUIRED}|winget install OpenJS.NodeJS.LTS")
  elif command -v nvm &>/dev/null || [ -f "$HOME/.nvm/nvm.sh" ]; then
    MISSING+=("node|${T_REQUIRED}|nvm install --lts")
  elif [ -n "$PKG_MGR" ]; then
    MISSING+=("node|${T_REQUIRED}|${PKG_MGR} nodejs")
  fi
fi

# npm
if command -v npm &>/dev/null; then
  NPM_OK=true
  printf "  ${GRN}●${R}  %-12s ${D}v%s${R}\n" "npm" "$(npm -v)"
else
  printf "  ${RED}○${R}  %-12s\n" "npm"
  MISSING+=("npm|${T_REQUIRED}|(comes with node)")
fi

# yt-dlp
if command -v yt-dlp &>/dev/null; then
  printf "  ${GRN}●${R}  %-12s ${D}%s${R}\n" "yt-dlp" "$(yt-dlp --version 2>/dev/null)"
else
  printf "  ${YLW}○${R}  %-12s\n" "yt-dlp"
  if [[ "$OS_LABEL" == "Windows" ]]; then
    MISSING+=("yt-dlp|${T_OPTIONAL}|winget install yt-dlp.yt-dlp")
  elif command -v pip &>/dev/null || command -v pip3 &>/dev/null; then
    MISSING+=("yt-dlp|${T_OPTIONAL}|pip install yt-dlp")
  elif [ -n "$PKG_MGR" ]; then
    MISSING+=("yt-dlp|${T_OPTIONAL}|${PKG_MGR} yt-dlp")
  fi
fi

# ffmpeg
if command -v ffmpeg &>/dev/null; then
  printf "  ${GRN}●${R}  %-12s ${D}%s${R}\n" "ffmpeg" "$(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  printf "  ${YLW}○${R}  %-12s\n" "ffmpeg"
  if [[ "$OS_LABEL" == "Windows" ]]; then
    MISSING+=("ffmpeg|${T_OPTIONAL}|winget install Gyan.FFmpeg")
  else
    [ -n "$PKG_MGR" ] && MISSING+=("ffmpeg|${T_OPTIONAL}|${PKG_MGR} ffmpeg")
  fi
fi

echo ""

# ── If nothing missing, skip to build ──
if [ ${#MISSING[@]} -eq 0 ]; then
  :
else
  # ── Ask user to auto-install ──
  printf "  ${DIM}${T_ASK_INSTALL}${R}"
  read -r REPLY
  REPLY="${REPLY:-Y}"

  if [[ "$REPLY" =~ ^[Yy]$ ]]; then
    echo ""
    for item in "${MISSING[@]}"; do
      IFS='|' read -r name _ cmd <<< "$item"
      step "${T_INSTALLING} ${name}..."
      if eval "$cmd" >/dev/null 2>&1; then
        done_step "${name}"
      else
        fail_step "${name}"
      fi
    done
    echo ""

    # Re-check critical: node + npm
    if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
      printf "  ${RED}${B}✗${R}  ${T_ABORT}\n"
      echo ""
      exit 1
    fi
  else
    # User declined — check if we can still proceed
    if [ "$NODE_OK" = false ] || [ "$NPM_OK" = false ]; then
      printf "\n  ${RED}${B}✗${R}  ${T_ABORT}\n"
      echo ""
      exit 1
    fi
    echo ""
    printf "  ${DIM}${T_INSTALL_SKIP}${R}\n"
    echo ""
  fi
fi

# ── Build ──
printf "  ${B}📦 ${T_BUILD}${R}\n"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

DEPS_LIST=()
if command -v node &>/dev/null && [ -f package.json ]; then
  while IFS= read -r line; do
    DEPS_LIST+=("$line")
  done < <(node -e "
    const pkg = require('./package.json');
    const deps = Object.entries(pkg.dependencies || {});
    const dev = Object.entries(pkg.devDependencies || {});
    deps.forEach(([n,v]) => console.log('dep\t' + n + '\t' + v));
    dev.forEach(([n,v]) => console.log('dev\t' + n + '\t' + v));
  " 2>/dev/null)
fi

show_deps() {
  local sym="$1"
  local color="$2"
  for line in "${DEPS_LIST[@]}"; do
    IFS=$'\t' read -r type name ver <<< "$line"
    if [ "$type" = "dep" ]; then
      printf "    ${DIM}${color}${sym}${R}  ${DIM}%-24s %s${R}\n" "$name" "$ver"
    else
      printf "    ${DIM}${color}${sym}${R}  ${DIM}%-24s %s  (dev)${R}\n" "$name" "$ver"
    fi
  done
}

# 检查是否需要安装：node_modules 不存在或 package.json 比 node_modules 新
NEED_INSTALL=true
if [ -d node_modules ] && [ -f package-lock.json ]; then
  if [ package.json -ot node_modules ] && [ package-lock.json -ot node_modules ]; then
    NEED_INSTALL=false
  fi
fi

N=${#DEPS_LIST[@]}

if [ "$NEED_INSTALL" = false ]; then
  step "${T_CHECKING}"
  done_step "${T_INSTALLED}"
  show_deps "●" "${GRN}"
else
  step "${T_INSTALL}"
  echo ""
  show_deps "○" "${YLW}"
  npm install --silent 2>/dev/null
  printf "\033[$((N + 1))A"
  done_step "${T_INSTALLED}"
  show_deps "●" "${GRN}"
fi

step "${T_COMPILE}"
if npm run build 2>/dev/null >/dev/null; then
  done_step "${T_COMPILED}"
else
  fail_step "${T_COMPILE_FAIL}"
  npm run build 2>&1 | tail -5 | while IFS= read -r line; do
    printf "      ${DIM}%s${R}\n" "$line"
  done
  exit 1
fi

step "${T_LINK}"
LINK_TARGET="$(npm root -g 2>/dev/null)/@aimtao/music-cli"
BIN_TARGET="$(npm prefix -g 2>/dev/null)/bin/music-cli"
if [ -L "$LINK_TARGET" ]; then
  done_step "${T_LINKED}"
elif npm link --silent 2>/dev/null; then
  done_step "${T_LINKED}"
elif [ -e "$BIN_TARGET" ]; then
  printf "\r  ${YLW}●${R}  ${T_LINK_EXISTS}\n"
  if npm link --force --silent 2>/dev/null; then
    done_step "${T_LINKED}"
  else
    fail_step "${T_LINK_FAIL}"
  fi
else
  printf "\r  ${YLW}●${R}  ${T_LINK_TRY}\n"
  if sudo npm link --silent 2>/dev/null; then
    done_step "${T_LINKED}"
  else
    fail_step "${T_LINK_FAIL}"
  fi
fi

# ── Done ──
echo ""
printf "  ${GRN}${B}🎉 ${T_READY}${R}  ${CYN}${T_READY_HINT}${R}\n"
echo ""
printf "  ${DIM}${T_EXAMPLE}${R}\n"
printf "  ${CYN}music-cli download \"东北民谣\" \"毛不易\"${R}\n"
echo ""
