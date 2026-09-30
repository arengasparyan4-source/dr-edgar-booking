import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of two secrets.
 *
 * Both values are hashed to a fixed 32-byte digest first, for two reasons:
 * timingSafeEqual throws when the buffers differ in length, and comparing the
 * raw strings would leak the expected length through that very exception.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const digestA = createHash("sha256").update(a, "utf8").digest();
  const digestB = createHash("sha256").update(b, "utf8").digest();

  return timingSafeEqual(digestA, digestB);
}
