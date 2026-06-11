#!/usr/bin/env bash
# Rebuild the web export and redeploy to GitHub Pages.
# Live URL: https://remelofrontal-dev.github.io/count-trainer/
set -euo pipefail
cd "$(dirname "$0")/.."

NOREPLY="263505833+remelofrontal-dev@users.noreply.github.com"

echo "→ Building web export…"
rm -rf dist
bunx expo export -p web

echo "→ Adding Pages safety files…"
cp dist/index.html dist/404.html   # SPA fallback
touch dist/.nojekyll               # keep Expo's _expo/ dir (Jekyll strips underscores)

echo "→ Publishing to gh-pages…"
rm -rf /tmp/ct-pages && mkdir -p /tmp/ct-pages
cp -r dist/. /tmp/ct-pages/
cd /tmp/ct-pages
git init -q -b gh-pages
git -c user.name="remelofrontal-dev" -c user.email="$NOREPLY" add -A
git -c user.name="remelofrontal-dev" -c user.email="$NOREPLY" commit -q -m "Deploy Count Trainer web $(date -u +%Y-%m-%dT%H:%MZ)"
git remote add origin git@github.com:remelofrontal-dev/count-trainer.git
git push -f origin gh-pages

echo "✓ Deployed → https://remelofrontal-dev.github.io/count-trainer/ (live in ~1 min)"
