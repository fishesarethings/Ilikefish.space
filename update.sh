#!/usr/bin/env bash
set -euo pipefail

# 1. Go to repo root
cd "$(dirname "$0")"

echo "📦 Pulling latest changes…"
git pull --ff-only origin main

# 2. Regenerate games/index.json
echo "🎮 Regenerating games/index.json…"
node scripts/generate-games-index.js

# 3. Regenerate precache-manifest.js
echo "⚙️  Regenerating precache-manifest.js…"
node scripts/gen-manifest.js

# 4. Stage all changes
echo "➕ Staging all changes…"
git add .

# 5. Commit & push if any changes
if git diff --cached --quiet; then
  echo "✅ No changes to commit."
else
  git commit -m "chore: auto-update games index & precache manifest"
  echo "🚀 Pushing to origin/main…"
  git push origin main
fi

echo "🎉 All done!"
