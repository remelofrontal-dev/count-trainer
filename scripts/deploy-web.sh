#!/usr/bin/env bash
# Rebuild the web export and redeploy to GitHub Pages — ADDITIVELY.
# Live URL: https://remelofrontal-dev.github.io/count-trainer/
#
# Why additive: each Expo build emits a new hashed JS bundle. Browsers cache the
# old index.html (GitHub Pages ~10 min) which still points at the OLD bundle. If
# we wiped old bundles (force-push from scratch), those cached clients would 404
# the missing JS and the app would fail to load ("features don't pop up"). So we
# OVERLAY the new build onto the existing gh-pages, keeping old bundles alive
# until every cached index.html has expired. New visitors always get the newest.
set -euo pipefail
cd "$(dirname "$0")/.."

NOREPLY="263505833+remelofrontal-dev@users.noreply.github.com"
REPO="git@github.com:remelofrontal-dev/count-trainer.git"
WORK=/tmp/ct-pages

echo "→ Building web export…"
rm -rf dist
bunx expo export -p web

echo "→ Adding Pages safety files…"
cp dist/index.html dist/404.html   # SPA fallback
touch dist/.nojekyll               # keep Expo's _expo/ dir (Jekyll strips underscores)

echo "→ Fetching existing gh-pages (to overlay, not wipe)…"
rm -rf "$WORK"
if git clone -q --branch gh-pages --single-branch "$REPO" "$WORK" 2>/dev/null; then
  echo "  …cloned existing gh-pages (old bundles preserved)"
else
  echo "  …no existing gh-pages, starting fresh"
  mkdir -p "$WORK"
  git -C "$WORK" init -q -b gh-pages
  git -C "$WORK" remote add origin "$REPO"
fi

echo "→ Overlaying new build (keeps old hashed bundles)…"
# Refresh the entry files + add the new bundle; do NOT delete old _expo/* bundles.
cp -r dist/. "$WORK"/

# Optional prune: keep only the 6 most-recent JS bundles so cruft can't grow forever.
JSDIR="$WORK/_expo/static/js/web"
if [ -d "$JSDIR" ]; then
  ls -1t "$JSDIR"/AppEntry-*.js 2>/dev/null | tail -n +7 | xargs -r rm -f
fi

cd "$WORK"
git -c user.name="remelofrontal-dev" -c user.email="$NOREPLY" add -A
if git diff --cached --quiet; then
  echo "  …no changes to deploy"
else
  git -c user.name="remelofrontal-dev" -c user.email="$NOREPLY" \
    commit -q -m "Deploy Count Trainer web $(date -u +%Y-%m-%dT%H:%MZ)"
  git push -q origin gh-pages
fi

echo "✓ Deployed → https://remelofrontal-dev.github.io/count-trainer/ (live in ~1 min)"
echo "  Tip: hard-refresh (Cmd+Shift+R) once to clear any stale cache."
