import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/api/responses";
import {
  ClientPhotoValidationError,
  getClientPhotoContentType,
  readClientPhotoFile
} from "@/lib/clients/clientPhotoStorage";
import { clientPhotosRepository } from "@/lib/repositories/clientPhotosRepository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ clientId: string; photoId: string }>;
};

const photoNotFoundResponse = () =>
  NextResponse.json(
    {
      success: false,
      code: "photo_not_found",
      error: "Photo not found",
      message: "Photo not found"
    },
    { status: 404 }
  );

/**
 * Streams a client photo to an authenticated admin.
 *
 * These files live outside public/ precisely so that this handler is the only
 * way to read them; the response is marked private and uncacheable so medical
 * images are not retained by shared caches or written to the browser's disk
 * cache after logout.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId, photoId } = await context.params;
    const photo = await clientPhotosRepository.getClientPhoto(photoId);

    if (!photo || photo.clientId !== clientId) {
      return photoNotFoundResponse();
    }

    const buffer = await readClientPhotoFile(photo.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": photo.mimeType || getClientPhotoContentType(photo.fileName),
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${encodeURIComponent(photo.fileName)}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    if (error instanceof ClientPhotoValidationError) {
      return photoNotFoundResponse();
    }

    return errorResponse(error);
  }
}
