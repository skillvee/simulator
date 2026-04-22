#!/usr/bin/env bash
set -euo pipefail

echo "==> Installing Supabase CLI"
curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.deb -o /tmp/supabase.deb
sudo dpkg -i /tmp/supabase.deb
rm /tmp/supabase.deb

echo "==> npm install"
npm install

echo "==> Installing Playwright browsers + system deps (for Claude Code preview tools + Playwright scripts)"
npx playwright install --with-deps chromium

echo "==> Installing agent-browser CLI globally (used by tests/e2e/*)"
npm install -g agent-browser

echo "==> Done. Copy .env.example to .env.local and fill in secrets."
echo "    Browser verification available via:"
echo "      - Claude Code preview_* tools (headless Chromium)"
echo "      - agent-browser CLI (npm run test:e2e)"
echo "      - npx playwright test"
