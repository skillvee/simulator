import { db } from "@/server/db";
import { supabaseAdmin, STORAGE_BUCKETS } from "@/lib/external";
import { makeWebmSeekable } from "@/lib/media/webm-seekable";

const EBML_HEADER = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]);
const CLUSTER_ID = new Uint8Array([0x1f, 0x43, 0xb6, 0x75]);

function findFirstClusterOffset(buffer: Uint8Array): number {
  for (let i = 0; i <= buffer.length - 4; i++) {
    if (
      buffer[i] === CLUSTER_ID[0] &&
      buffer[i + 1] === CLUSTER_ID[1] &&
      buffer[i + 2] === CLUSTER_ID[2] &&
      buffer[i + 3] === CLUSTER_ID[3]
    ) {
      return i;
    }
  }
  return -1;
}

function hasEbmlHeader(buffer: Uint8Array): boolean {
  if (buffer.length < 4) return false;
  return (
    buffer[0] === EBML_HEADER[0] &&
    buffer[1] === EBML_HEADER[1] &&
    buffer[2] === EBML_HEADER[2] &&
    buffer[3] === EBML_HEADER[3]
  );
}

async function remerge(assessmentId: string) {
  const recordingId = `${assessmentId}-screen`;
  const recording = await db.recording.findUnique({
    where: { id: recordingId },
    include: { segments: { orderBy: { segmentIndex: "asc" } } },
  });
  if (!recording) {
    console.log(`No recording for ${assessmentId}`);
    return;
  }
  const segments = recording.segments.filter((s) => s.chunkPaths.length > 0);
  if (segments.length === 0) {
    console.log(`No chunks for ${assessmentId}`);
    return;
  }

  const allChunks = segments.flatMap((segment, segIdx) =>
    segment.chunkPaths.map((path, chunkIdx) => ({
      path,
      segIdx,
      chunkIdx,
      isFirstSegment: segIdx === 0,
      isFirstChunkInSegment: chunkIdx === 0,
    }))
  );

  const buffers: Buffer[] = [];
  for (const chunk of allChunks) {
    const { data, error: dlError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKETS.RECORDINGS)
      .download(chunk.path);
    if (dlError || !data) {
      console.log(`  skipped ${chunk.path}: ${dlError?.message}`);
      continue;
    }
    let buf = Buffer.from(await data.arrayBuffer());
    if (!chunk.isFirstSegment && chunk.isFirstChunkInSegment && hasEbmlHeader(buf)) {
      const off = findFirstClusterOffset(buf);
      if (off > 0) buf = buf.subarray(off);
    }
    buffers.push(buf);
  }

  if (buffers.length === 0) {
    console.log(`All downloads failed for ${assessmentId}`);
    return;
  }

  const concatenated = Buffer.concat(buffers);
  const merged = await makeWebmSeekable(concatenated);
  const mergedPath = `${assessmentId}/merged.webm`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RECORDINGS)
    .upload(mergedPath, merged, { contentType: "video/webm", upsert: true });
  if (uploadError) {
    console.log(`Upload failed: ${uploadError.message}`);
    return;
  }

  const { data: signedData } = await supabaseAdmin.storage
    .from(STORAGE_BUCKETS.RECORDINGS)
    .createSignedUrl(mergedPath, 60 * 60 * 24 * 365);
  if (!signedData?.signedUrl) {
    console.log(`Failed to create signed URL`);
    return;
  }

  await db.recording.update({
    where: { id: recordingId },
    data: { storageUrl: signedData.signedUrl },
  });

  console.log(`Re-merged ${assessmentId}: size=${merged.length}, url updated`);
}

async function main() {
  const ids = process.argv.slice(2);
  if (ids.length === 0) {
    console.error("Usage: tsx scripts/remerge-recording.ts <assessmentId> [...]");
    process.exit(1);
  }
  for (const id of ids) {
    await remerge(id);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
