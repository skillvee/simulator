/**
 * MediaRecorder writes WebM streams without a `Duration` element in the Info
 * section and without a `SeekHead`/`Cues` table. The result is a "non-seekable"
 * file: the browser shows a duration that grows as it buffers, and the user
 * can't scrub until the whole file has downloaded.
 *
 * Concatenating chunks with `Buffer.concat` preserves that broken metadata.
 * `makeWebmSeekable` walks the EBML, computes the real duration from cluster
 * timecodes, and rewrites the metadata block with `Duration` + `SeekHead` +
 * `Cues` so the browser can seek immediately via HTTP range requests.
 */

import { Decoder, Reader, tools } from "ts-ebml";
import { createLogger } from "@/lib/core";

const logger = createLogger("lib:media:webm-seekable");

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

function copyToOwnedView(input: Buffer): Uint8Array<ArrayBuffer> {
  const ab = new ArrayBuffer(input.byteLength);
  const view = new Uint8Array(ab);
  view.set(input);
  return view;
}

function looksLikeWebm(buf: Buffer): boolean {
  return (
    buf.length >= 4 &&
    buf[0] === 0x1a &&
    buf[1] === 0x45 &&
    buf[2] === 0xdf &&
    buf[3] === 0xa3
  );
}

/**
 * Rewrite a concatenated MediaRecorder WebM so it has proper Duration + Cues
 * and is seekable in the browser. Returns a `Uint8Array<ArrayBuffer>` (works
 * directly as a Blob/Supabase upload body); falls back to a copy of the input
 * buffer (and logs a warning) if the rewrite fails — a non-seekable file is
 * better than a failed merge.
 */
export async function makeWebmSeekable(
  input: Buffer
): Promise<Uint8Array<ArrayBuffer>> {
  if (!looksLikeWebm(input)) {
    return copyToOwnedView(input);
  }
  try {
    const decoder = new Decoder();
    const reader = new Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    const ab = bufferToArrayBuffer(input);
    const elms = decoder.decode(ab);
    for (const elm of elms) {
      reader.read(elm);
    }
    reader.stop();

    if (!reader.metadatas.length || reader.metadataSize <= 0) {
      logger.warn("WebM has no parseable metadata; skipping seekability fix", {
        inputSize: String(input.length),
      });
      return copyToOwnedView(input);
    }

    const refinedMetadata = tools.makeMetadataSeekable(
      reader.metadatas,
      reader.duration,
      reader.cues
    );

    const body = input.subarray(reader.metadataSize);
    const outAb = new ArrayBuffer(refinedMetadata.byteLength + body.byteLength);
    const outView = new Uint8Array(outAb);
    outView.set(new Uint8Array(refinedMetadata), 0);
    outView.set(body, refinedMetadata.byteLength);

    logger.info("WebM made seekable", {
      inputSize: String(input.length),
      outputSize: String(outView.length),
      durationTicks: String(reader.duration),
      cuePoints: String(reader.cues.length),
    });

    return outView;
  } catch (err) {
    logger.warn("Failed to rewrite WebM metadata; returning original buffer", {
      err: err instanceof Error ? err.message : String(err),
      inputSize: String(input.length),
    });
    return copyToOwnedView(input);
  }
}
