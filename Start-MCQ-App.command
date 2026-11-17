#!/bin/bash
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js is not installed."
  echo "Please download and install Node.js v22 or newer from https://nodejs.org/"
  read -p "Press Enter to close..."
  exit 1
fi

node start-local.mjs
