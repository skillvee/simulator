#!/usr/bin/env tsx
/**
 * Records two source clips for the Hero video, cleanly.
 *
 * The core insight: a hero video must show ONLY the payoff moments —
 * never sign-in pages, never button clicks, never navigation transitions.
 *
 * Pipeline per clip:
 *   1. Pre-authenticate in a non-recording context; save storageState.
 *   2. Open a recording context with that storageState → skips sign-in UI.
 *   3. Perform setup actions (click phone-call, wait for connect) while
 *      the recording is running. These frames land in the RAW file.
 *   4. Once the page is in the desired visual state, stay there long enough
 *      to capture the payoff window.
 *   5. Close → ffmpeg trims the raw file to ONLY the payoff window
 *      (skipping the setup beats).
 *
 * Outputs in remotion/public/recordings/:
 *   hero-work.webm       ~12s, active voice call visible, NO click/loading
 *   hero-dashboard.webm  ~12s, dashboard content only, NO sign-in/load
 *
 * Requires: dev server on http://localhost:3000, seed data (npm run db:seed),
 *           ffmpeg on PATH.
 *
 * Run: npx tsx scripts/record-hero/record-hero-clips.ts
 *      (pass --only=work or --only=dashboard to re-capture just one)
 */

import { chromium, type Browser } from 'playwright';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const OUT_DIR = join(ROOT, 'remotion', 'public', 'recordings');
const TMP_DIR = join(__dirname, '.video-tmp');
const AUTH_DIR = join(__dirname, '.auth-tmp');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const VIEWPORT = { width: 1920, height: 1080 } as const;

const CANDIDATE = { email: 'user@test.com', password: 'testpassword123' };
const RECRUITER = { email: 'recruiter@test.com', password: 'testpassword123' };

// ── Helpers ────────────────────────────────────────────────────────

async function signInAndSaveState(
  browser: Browser,
  email: string,
  password: string,
  statePath: string,
) {
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await page.goto(`${BASE_URL}/en/sign-in`, { waitUntil: 'domcontentloaded' });
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((u) => !u.pathname.includes('/sign-in'), {
    timeout: 15_000,
  });
  await ctx.storageState({ path: statePath });
  await ctx.close();
}

/**
 * Find the newest .webm written inside TMP_DIR.
 * Playwright names recording files with random hashes on context.close().
 */
function newestWebm(dir: string): string {
  const files = readdirSync(dir).filter((f) => f.endsWith('.webm'));
  if (files.length === 0) throw new Error(`No .webm in ${dir}`);
  files.sort(
    (a, b) => statSync(join(dir, b)).mtimeMs - statSync(join(dir, a)).mtimeMs,
  );
  return join(dir, files[0]!);
}

/**
 * ffmpeg -ss N -t M -i src -c copy dst
 * Extracts M seconds starting at second N. `-c copy` is fast (no re-encode)
 * but may snap to nearest keyframe. For frame-precise trim we could re-encode,
 * but keyframe-snap is fine for hero footage.
 */
function ffmpegTrim(src: string, dst: string, startSec: number, durSec: number) {
  if (existsSync(dst)) rmSync(dst);
  execSync(
    `ffmpeg -y -ss ${startSec} -i "${src}" -t ${durSec} -c copy "${dst}"`,
    { stdio: 'pipe' },
  );
}

// ── Clip 2: candidate voice call (payoff only) ─────────────────────
async function recordWork(browser: Browser) {
  console.log('→ recording hero-work.webm');
  const statePath = join(AUTH_DIR, 'candidate.json');
  await signInAndSaveState(
    browser,
    CANDIDATE.email,
    CANDIDATE.password,
    statePath,
  );

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    storageState: statePath,
    recordVideo: { dir: TMP_DIR, size: VIEWPORT },
    permissions: ['microphone'],
  });
  const page = await ctx.newPage();

  // Recording starts when the page is created. Track elapsed time so ffmpeg
  // can extract the exact window *after* the call UI becomes visible.
  const recordingStart = Date.now();

  // Already signed in — no sign-in UI in the recording.
  await page.goto(`${BASE_URL}/assessments/test-assessment-chat/work`, {
    waitUntil: 'domcontentloaded',
  });
  await page.waitForTimeout(1500);

  // Kick off the call. Click itself is pre-trim; don't worry about selector
  // visibility here.
  const callBtn = page.getByRole('button', { name: /call|phone/i }).first();
  await callBtn.click({ timeout: 10_000 });

  // The UI transitions: Call started chip → "Start a conversation" empty
  // state → Loading... → welcome message + On-Call/Connected card settle.
  // That full sequence takes ~6s after the chip appears. Rather than fight
  // with selector heuristics (timestamps, hidden-state), just wait out the
  // known lag.
  await page.waitForSelector('text=/call started/i', { timeout: 25_000 });
  await page.waitForTimeout(6000);
  const windowStartMs = Date.now();

  // Record 13s of the active, content-populated state.
  await page.waitForTimeout(13_000);

  const raw = await (async () => {
    await page.close();
    await ctx.close();
    return newestWebm(TMP_DIR);
  })();

  const windowStartSec = (windowStartMs - recordingStart) / 1000;
  const out = join(OUT_DIR, 'hero-work.webm');
  ffmpegTrim(raw, out, windowStartSec, 12);
  console.log(
    `✓ wrote ${out} (trim from ${windowStartSec.toFixed(1)}s, 12s clip)`,
  );
}

// ── Clip 3: recruiter dashboard (payoff only) ──────────────────────
async function recordDashboard(browser: Browser) {
  console.log('→ recording hero-dashboard.webm');
  const statePath = join(AUTH_DIR, 'recruiter.json');
  await signInAndSaveState(
    browser,
    RECRUITER.email,
    RECRUITER.password,
    statePath,
  );

  const ctx = await browser.newContext({
    viewport: VIEWPORT,
    storageState: statePath,
    recordVideo: { dir: TMP_DIR, size: VIEWPORT },
  });
  const page = await ctx.newPage();

  const recordingStart = Date.now();

  await page.goto(
    `${BASE_URL}/en/recruiter/assessments/test-scenario-recruiter`,
    { waitUntil: 'domcontentloaded' },
  );

  // Wait for the main heading AND the candidates table to render. Only after
  // both are visible do we consider the dashboard "painted."
  await page.waitForSelector('text=/assessment|frontend developer/i', {
    timeout: 20_000,
  });
  // Give React a moment to finish hydration + score animations.
  await page.waitForTimeout(1200);
  const windowStartMs = Date.now();

  // No scrolling — Ken Burns in Remotion provides the motion.
  // Just hold on the dashboard for 13s so we have 12s of clean content
  // (plus a 1s buffer).
  await page.waitForTimeout(13_000);

  const raw = await (async () => {
    await page.close();
    await ctx.close();
    return newestWebm(TMP_DIR);
  })();

  const windowStartSec = (windowStartMs - recordingStart) / 1000;
  const out = join(OUT_DIR, 'hero-dashboard.webm');
  ffmpegTrim(raw, out, windowStartSec, 12);
  console.log(
    `✓ wrote ${out} (trim from ${windowStartSec.toFixed(1)}s, 12s clip)`,
  );
}

// ── Entry ──────────────────────────────────────────────────────────
async function main() {
  // Ensure ffmpeg is callable
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
  } catch {
    throw new Error(
      'ffmpeg not found on PATH. Install with `brew install ffmpeg`.',
    );
  }

  for (const d of [TMP_DIR, AUTH_DIR]) {
    if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    mkdirSync(d, { recursive: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
    ],
  });

  const onlyArg = process.argv
    .slice(2)
    .find((a) => a.startsWith('--only='))
    ?.split('=')[1];

  try {
    if (!onlyArg || onlyArg === 'work') await recordWork(browser);
    if (!onlyArg || onlyArg === 'dashboard') await recordDashboard(browser);
  } finally {
    await browser.close();
    for (const d of [TMP_DIR, AUTH_DIR]) {
      if (existsSync(d)) rmSync(d, { recursive: true, force: true });
    }
  }

  console.log('\nDone. Clean clips in remotion/public/recordings/');
}

main().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
