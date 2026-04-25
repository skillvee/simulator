/**
 * Idempotent provisioning for the v2 `scenario-data` Supabase Storage bucket.
 *
 * The data-artifact branch of the v2 pipeline uploads CSVs into this bucket.
 * Without it, all DA/DS scenario generation fails at upload time. Run this
 * once per environment after deploying the v2 pipeline:
 *
 *   npx tsx scripts/setup-scenario-data-bucket.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env."
  );
  process.exit(1);
}

const BUCKET = "scenario-data";

async function main() {
  const supabase = createClient(url!, key!, {
    auth: { persistSession: false },
  });

  const { data: existing, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.error(`Failed to list buckets: ${listErr.message}`);
    process.exit(1);
  }

  if (existing?.some((b) => b.name === BUCKET)) {
    console.log(`✓ Bucket "${BUCKET}" already exists.`);
    return;
  }

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    allowedMimeTypes: ["text/csv", "text/markdown", "application/json"],
  });

  if (error) {
    console.error(`Failed to create bucket: ${error.message}`);
    process.exit(1);
  }

  console.log(`✓ Created private bucket "${BUCKET}".`);
}

main().catch((err) => {
  console.error("setup-scenario-data-bucket failed:", err);
  process.exit(1);
});
