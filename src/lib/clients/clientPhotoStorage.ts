import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { stripImageMetadata } from "@/lib/images/stripImageMetadata";
import {
  allowedExtensionsByMimeType,
  hasValidImageSignature,
  imageTypeByExtension
} from "@/lib/images/imageTypes";

const MAX_CLIENT_PHOTO_SIZE = 5 * 1024 * 1024;

/**
 * Client photos are medical records, so they are stored OUTSIDE public/.
 * Anything under public/ is served by Next.js as static files with no auth at
 * all; these files must only ever be reachable through the admin-only route at
 * /api/admin/clients/[clientId]/photos/[photoId]/file.
 */
const uploadDirectory = path.join(process.cwd(), "storage", "client-photos");

export class ClientPhotoValidationError extends Error {}

const sanitizeClientId = (clientId: string) =>
  clientId.replace(/[^a-zA-Z0-9_-]/g, "_");

/**
 * Resolve a stored file name to an absolute path, refusing anything that would
 * escape the upload directory.
 */
const resolveStoredPath = (fileName: string) => {
  const safeFileName = path.basename(fileName);
  const targetPath = path.join(uploadDirectory, safeFileName);

  if (path.dirname(path.resolve(targetPath)) !== path.resolve(uploadDirectory)) {
    throw new ClientPhotoValidationError("Photo not found");
  }

  return targetPath;
};

export const getClientPhotoContentType = (fileName: string) =>
  imageTypeByExtension.get(path.extname(fileName).toLowerCase()) ??
  "application/octet-stream";

/** Public URL of a stored photo: the admin-only streaming route, not a static file. */
export const buildClientPhotoUrl = (clientId: string, photoId: string) =>
  `/api/admin/clients/${encodeURIComponent(clientId)}/photos/${encodeURIComponent(photoId)}/file`;

export async function saveClientPhotoFile(clientId: string, file: File) {
  if (file.size <= 0 || file.size > MAX_CLIENT_PHOTO_SIZE) {
    throw new ClientPhotoValidationError("File too large");
  }

  const extension = path.extname(file.name).toLowerCase();
  const allowedExtensions = allowedExtensionsByMimeType.get(file.type);
  if (!allowedExtensions?.includes(extension)) {
    throw new ClientPhotoValidationError("Invalid file type");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(file.type, buffer)) {
    throw new ClientPhotoValidationError("Invalid file type");
  }

  // Phone cameras embed GPS coordinates and device identifiers in EXIF; drop
  // them before the photo is written to disk. Lossless - pixels are untouched.
  const storedBuffer = stripImageMetadata(file.type, buffer);

  const fileName = `${sanitizeClientId(clientId)}_${Date.now()}_${randomUUID().slice(0, 8)}${extension}`;
  const targetPath = resolveStoredPath(fileName);

  await mkdir(uploadDirectory, { recursive: true });
  await writeFile(targetPath, storedBuffer);

  return {
    fileName,
    size: storedBuffer.length
  };
}

export async function readClientPhotoFile(fileName: string) {
  try {
    return await readFile(resolveStoredPath(fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new ClientPhotoValidationError("Photo not found");
    }

    throw error;
  }
}

export async function deleteClientPhotoFile(fileName: string) {
  try {
    await unlink(resolveStoredPath(fileName));
  } catch (error) {
    if (error instanceof ClientPhotoValidationError) {
      return;
    }

    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
