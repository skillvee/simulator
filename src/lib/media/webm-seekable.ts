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

import { createLogger } from "@/lib/core";

// `ts-ebml` is server-only: its CJS modules crash at evaluation time in the
// browser bundle (`tools.readVint` resolves to undefined). We import it lazily
// inside `makeWebmSeekable` so the module is never evaluated when this file is
// pulled into a client bundle via the `@/lib/media` barrel.

const logger = createLogger("lib:media:webm-seekable");

function asArrayBuffer(buf: Buffer): ArrayBuffer {
  // Avoid an N-byte copy when the Buffer fully owns its backing memory —
  // true for `Buffer.concat` output and `Buffer.from(blob.arrayBuffer())`,
  // which is how every caller produces the input. Pooled / sliced Buffers
  // (which share an underlying ArrayBuffer) fall back to a copy of just
  // the relevant window so the decoder doesn't see neighbouring bytes.
  if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
    return buf.buffer as ArrayBuffer;
  }
  return buf.buffer.slice(
    buf.byteOffset,
    buf.byteOffset + buf.byteLength
  ) as ArrayBuffer;
}

function asOwnedView(input: Buffer): Uint8Array<ArrayBuffer> {
  // Return a view over the input's existing buffer instead of copying.
  // The caller holds the returned Uint8Array, which keeps the underlying
  // memory alive — there's no need to duplicate it.
  return new Uint8Array(
    input.buffer as ArrayBuffer,
    input.byteOffset,
    input.byteLength
  );
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
  if (typeof window !== "undefined") {
    return asOwnedView(input);
  }
  if (!looksLikeWebm(input)) {
    return asOwnedView(input);
  }
  try {
    const { Decoder, Encoder, Reader, tools } = await import("ts-ebml");
    const decoder = new Decoder();
    const reader = new Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    const ab = asArrayBuffer(input);
    const elms = decoder.decode(ab);
    for (const elm of elms) {
      reader.read(elm);
    }
    reader.stop();

    if (!reader.metadatas.length || reader.metadataSize <= 0) {
      logger.warn("WebM has no parseable metadata; skipping seekability fix", {
        inputSize: String(input.length),
      });
      return asOwnedView(input);
    }

    // ts-ebml's `Encoder.encode` returns `Buffer.concat(parts).buffer`. For
    // small results that Buffer comes from Node's shared ~8KB pool, so the
    // returned ArrayBuffer is the whole pool — not just the encoded bytes —
    // and using `.byteLength` writes 8192 bytes of mostly-garbage to the file,
    // stripping the EBML header. Monkey-patch the encoder for the duration of
    // the (synchronous) `makeMetadataSeekable` call so `encode` returns an
    // ArrayBuffer of exactly the encoded length.
    const EncoderProto = (Encoder as unknown as {
      prototype: {
        encode: (elms: unknown[]) => ArrayBuffer;
        encodeChunk: (elm: unknown) => Buffer[];
      };
    }).prototype;
    const originalEncode = EncoderProto.encode;
    EncoderProto.encode = function (elms: unknown[]) {
      const parts: Buffer[] = elms.reduce<Buffer[]>(
        (lst, elm) => lst.concat(this.encodeChunk(elm)),
        []
      );
      const concatenated = Buffer.concat(parts);
      const out = new ArrayBuffer(concatenated.byteLength);
      new Uint8Array(out).set(concatenated);
      return out;
    };

    let refinedMetadata: ArrayBuffer;
    try {
      refinedMetadata = tools.makeMetadataSeekable(
        reader.metadatas,
        reader.duration,
        reader.cues
      );
    } finally {
      EncoderProto.encode = originalEncode;
    }

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
    return asOwnedView(input);
  }
}
