/**
 * Backfill: rewrite existing merged.webm files in Supabase storage so they're
 * seekable in the browser. MediaRecorder produces WebM without a Duration
 * element or Cues table, so the previous binary-concat merge produced files
 * the browser couldn't scrub. This script downloads each merged.webm, runs
 * it through `makeWebmSeekable`, and re-uploads the fixed version.
 *
 * Usage:
 *   npx tsx scripts/backfill-recording-seekability.ts            # dry run, all
 *   npx tsx scripts/backfill-recording-seekability.ts --apply    # write changes
 *   npx tsx scripts/backfill-recording-seekability.ts <id> --apply
 */
import { db } from "../src/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "../src/lib/external";
import { makeWebmSeekable } from "../src/lib/media/webm-seekable";

async function processOne(assessmentId: string, apply: boolean) {
  const path = `${assessmentId}/merged.webm`;
  const { data, error: dlError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RECORDINGS)
    .download(path);

  if (dlError || !data) {
    console.log(`  skip ${assessmentId}: download failed (${dlError?.message ?? "no data"})`);
    return { ok: false };
  }

  const original = Buffer.from(await data.arrayBuffer());
  const fixed = await makeWebmSeekable(original);

  if (fixed === original || fixed.length === original.length) {
    console.log(`  ${assessmentId}: no change (${original.length} bytes)`);
    return { ok: true, changed: false };
  }

  console.log(
    `  ${assessmentId}: ${original.length} -> ${fixed.length} bytes${apply ? " (uploading)" : " (dry-run)"}`
  );

  if (!apply) return { ok: true, changed: true };

  const { error: upError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RECORDINGS)
    .upload(path, fixed, { contentType: "video/webm", upsert: true });

  if (upError) {
    console.log(`  upload failed for ${assessmentId}: ${upError.message}`);
    return { ok: false };
  }

  // Refresh signed URL on the Recording row so admin playback picks it up
  const { data: signed } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RECORDINGS)
    .createSignedUrl(path, 60 * 60 * 24 * 365);

  if (signed?.signedUrl) {
    await db.recording.update({
      where: { id: `${assessmentId}-screen` },
      data: { storageUrl: signed.signedUrl },
    });
  }

  return { ok: true, changed: true };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const explicitIds = args.filter((a) => !a.startsWith("--"));

  let assessmentIds: string[];
  if (explicitIds.length > 0) {
    assessmentIds = explicitIds;
  } else {
    const recordings = await db.recording.findMany({
      where: { id: { endsWith: "-screen" } },
      select: { assessmentId: true },
    });
    assessmentIds = recordings.map((r) => r.assessmentId);
  }

  console.log(
    `Processing ${assessmentIds.length} recording(s) ${apply ? "(APPLY)" : "(DRY RUN — pass --apply to write)"}`
  );

  let changed = 0;
  let failed = 0;
  for (const id of assessmentIds) {
    const r = await processOne(id, apply);
    if (!r.ok) failed++;
    else if (r.changed) changed++;
  }

  console.log(`\nDone. changed=${changed} failed=${failed} total=${assessmentIds.length}`);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await db.$disconnect();
  process.exit(1);
});
