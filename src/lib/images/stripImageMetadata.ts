/**
 * Removes metadata (EXIF, XMP, IPTC, text comments) from an uploaded image.
 *
 * Client photos are taken on phones, which embed GPS coordinates, the device
 * serial and the capture timestamp in EXIF. That is personal data we have no
 * reason to keep once the picture is stored.
 *
 * The stripping is lossless and dependency-free: metadata lives in dedicated
 * container segments/chunks, so it is dropped by rewriting the container rather
 * than re-encoding the pixels. Colour-related segments (JFIF, ICC, Adobe) are
 * deliberately preserved so photos keep rendering identically.
 *
 * Every helper is defensive: on any unexpected byte layout the original buffer
 * is returned untouched. Losing metadata is a nice-to-have; corrupting a
 * doctor's before/after photo is not acceptable.
 */

/** JPEG APP/COM markers that carry metadata rather than decoding information. */
const JPEG_METADATA_MARKERS = new Set([
  0xe1, // APP1  - EXIF and XMP
  0xed, // APP13 - Photoshop IRB / IPTC
  0xfe // COM   - free-form comment
]);

/** PNG ancillary chunks that carry metadata rather than decoding information. */
const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

/** WebP chunks that carry metadata rather than decoding information. */
const WEBP_METADATA_CHUNKS = new Set(["EXIF", "XMP "]);

function stripJpegMetadata(buffer: Buffer): Buffer {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return buffer;
  }

  const parts: Buffer[] = [buffer.subarray(0, 2)];
  let offset = 2;

  while (offset + 4 <= buffer.length) {
    if (buffer[offset] !== 0xff) {
      return buffer; // Not a marker where one is required - leave the file alone.
    }

    const marker = buffer[offset + 1];

    // Start of scan: entropy-coded data follows and is not segment-structured.
    if (marker === 0xda) {
      parts.push(buffer.subarray(offset));
      return Buffer.concat(parts);
    }

    const segmentLength = buffer.readUInt16BE(offset + 2);
    if (segmentLength < 2 || offset + 2 + segmentLength > buffer.length) {
      return buffer;
    }

    if (!JPEG_METADATA_MARKERS.has(marker)) {
      parts.push(buffer.subarray(offset, offset + 2 + segmentLength));
    }

    offset += 2 + segmentLength;
  }

  return Buffer.concat(parts);
}

function stripPngMetadata(buffer: Buffer): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 8 || !buffer.subarray(0, 8).equals(signature)) {
    return buffer;
  }

  const parts: Buffer[] = [buffer.subarray(0, 8)];
  let offset = 8;

  while (offset + 12 <= buffer.length) {
    const dataLength = buffer.readUInt32BE(offset);
    const chunkType = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const chunkEnd = offset + 12 + dataLength;

    if (dataLength > buffer.length || chunkEnd > buffer.length) {
      return buffer;
    }

    if (!PNG_METADATA_CHUNKS.has(chunkType)) {
      parts.push(buffer.subarray(offset, chunkEnd));
    }

    offset = chunkEnd;

    if (chunkType === "IEND") {
      return Buffer.concat(parts);
    }
  }

  return buffer; // No IEND found - structure is not what we expect.
}

function stripWebpMetadata(buffer: Buffer): Buffer {
  if (
    buffer.length < 12 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return buffer;
  }

  const riffSize = buffer.readUInt32LE(4);
  const declaredEnd = Math.min(8 + riffSize, buffer.length);
  const parts: Buffer[] = [];
  let offset = 12;

  while (offset + 8 <= declaredEnd) {
    const chunkType = buffer.subarray(offset, offset + 4).toString("ascii");
    const chunkSize = buffer.readUInt32LE(offset + 4);
    // RIFF chunks are padded to an even length.
    const chunkEnd = offset + 8 + chunkSize + (chunkSize % 2);

    if (chunkEnd > declaredEnd) {
      return buffer;
    }

    if (!WEBP_METADATA_CHUNKS.has(chunkType)) {
      const chunk = Buffer.from(buffer.subarray(offset, chunkEnd));

      // VP8X advertises which optional chunks exist; clear the EXIF and XMP
      // flags so decoders do not look for chunks we just removed.
      if (chunkType === "VP8X" && chunk.length >= 9) {
        chunk[8] &= ~0x08; // EXIF
        chunk[8] &= ~0x04; // XMP
      }

      parts.push(chunk);
    }

    offset = chunkEnd;
  }

  if (!parts.length) {
    return buffer;
  }

  const body = Buffer.concat(parts);
  const header = Buffer.alloc(12);
  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(body.length + 4, 4);
  header.write("WEBP", 8, "ascii");

  return Buffer.concat([header, body]);
}

/**
 * Returns a copy of `buffer` without metadata, or the original buffer when the
 * format is unsupported or anything looks off.
 */
export function stripImageMetadata(mimeType: string, buffer: Buffer): Buffer {
  try {
    let stripped: Buffer;

    if (mimeType === "image/jpeg") {
      stripped = stripJpegMetadata(buffer);
    } else if (mimeType === "image/png") {
      stripped = stripPngMetadata(buffer);
    } else if (mimeType === "image/webp") {
      stripped = stripWebpMetadata(buffer);
    } else {
      return buffer;
    }

    // Never hand back something smaller than a plausible image or larger than
    // the input - both would mean the rewrite went wrong.
    if (stripped.length < 12 || stripped.length > buffer.length) {
      return buffer;
    }

    return stripped;
  } catch (error) {
    console.warn("[stripImageMetadata] Falling back to the original image", {
      mimeType,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return buffer;
  }
}
