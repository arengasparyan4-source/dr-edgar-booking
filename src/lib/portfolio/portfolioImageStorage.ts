import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  allowedExtensionsByMimeType,
  hasValidImageSignature,
  imageTypeByExtension
} from "@/lib/images/imageTypes";

const MAX_PORTFOLIO_IMAGE_SIZE = 5 * 1024 * 1024;
const uploadDirectory = path.join(process.cwd(), "public", "uploads", "portfolio");
// Names produced by savePortfolioImageFile (plus older hand-placed files):
// no path separators, no dot-dot, only a known image extension.
const safeFileNamePattern = /^[A-Za-z0-9][A-Za-z0-9_-]*\.(jpe?g|png|webp)$/i;

/**
 * Public URL prefix for uploaded portfolio images.
 *
 * `next start` serves only files that were in public/ at build time, so an
 * image uploaded later answered 404 under /uploads/portfolio/ and the card
 * showed its empty (champagne) background instead. Uploads are therefore
 * served by the route handler at /media/portfolio/[fileName], which reads the
 * directory on every request. Old /uploads/portfolio/ URLs keep working via a
 * fallback rewrite in next.config.mjs.
 */
export const PORTFOLIO_MEDIA_PREFIX = "/media/portfolio/";

export class PortfolioImageValidationError extends Error {}

export async function readPortfolioImageFile(fileName: string) {
  if (!safeFileNamePattern.test(fileName)) {
    return null;
  }

  try {
    const buffer = await readFile(path.join(uploadDirectory, fileName));
    return {
      buffer,
      contentType:
        imageTypeByExtension.get(path.extname(fileName).toLowerCase()) ??
        "application/octet-stream"
    };
  } catch {
    return null;
  }
}

export async function savePortfolioImageFile(file: File) {
  if (file.size <= 0 || file.size > MAX_PORTFOLIO_IMAGE_SIZE) {
    throw new PortfolioImageValidationError("File too large");
  }

  const extension = path.extname(file.name).toLowerCase();
  const allowedExtensions = allowedExtensionsByMimeType.get(file.type);
  if (!allowedExtensions?.includes(extension)) {
    throw new PortfolioImageValidationError("Invalid file type");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(file.type, buffer)) {
    throw new PortfolioImageValidationError("Invalid file type");
  }

  const fileName = `portfolio_${Date.now()}_${randomUUID().slice(0, 8)}${extension}`;
  const targetPath = path.join(uploadDirectory, fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(targetPath, buffer);

  return {
    fileName,
    url: `${PORTFOLIO_MEDIA_PREFIX}${fileName}`
  };
}
