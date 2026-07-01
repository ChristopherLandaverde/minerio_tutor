#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Sabiá — Linux dev environment setup
# ------------------------------------------------------------
# Installs the native system libraries Tauri v2 needs on Linux
# (the WebKitGTK stack). Node, Rust, and Bun are assumed already
# installed — see the README "Prerequisites" section.
#
# Supports Debian/Ubuntu-family distros (incl. Pop!_OS) via apt.
# For Fedora / Arch / other distros, see:
#   https://tauri.app/start/prerequisites/#linux
#
# Usage:
#   bash scripts/setup-linux.sh
# ============================================================

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script targets Debian/Ubuntu (apt)."
  echo "For your distro, follow: https://tauri.app/start/prerequisites/#linux"
  exit 1
fi

echo "==> Installing Tauri v2 Linux system libraries (needs sudo)…"
sudo apt-get update
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  librsvg2-dev \
  libayatana-appindicator3-dev \
  libxdo-dev \
  libssl-dev \
  build-essential curl wget file

echo ""
echo "==> Done. From this directory (fluent-mineiro/) run:"
echo "      npm install"
echo "      npm run tauri dev"
echo ""
echo "    First run compiles the Rust backend — expect a few minutes."
