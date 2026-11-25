#!/bin/sh
# 링크 미리보기 이미지: site/og/card.html → site/og.png (1200×630 @2x)
set -e
cd "$(dirname "$0")/../site"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=1200,630 --virtual-time-budget=2000 \
  --user-data-dir="${TMPDIR:-/tmp}/og-chrome" \
  --screenshot=og.png "file://$PWD/og/card.html"
