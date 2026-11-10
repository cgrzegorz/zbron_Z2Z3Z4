#!/usr/bin/env bash
# Buduje aplikację i publikuje katalog dist/ na branchu gh-pages (GitHub Pages).
set -euo pipefail
cd "$(dirname "$0")/.."
REMOTE="$(git remote get-url origin)"
npm run build
cd dist
touch .nojekyll            # GitHub Pages nie przetwarza plików przez Jekyll
rm -rf .git
git init -q -b gh-pages
git add -A
git commit -q -m "Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push -f "$REMOTE" gh-pages
rm -rf .git
echo "Opublikowano na gh-pages."
