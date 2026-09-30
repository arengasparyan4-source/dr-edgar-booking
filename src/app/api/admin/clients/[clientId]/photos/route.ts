import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { clientPhotoMetadataSchema } from "@/lib/clients/clientPhotoSchemas";
import {
  buildClientPhotoUrl,
  ClientPhotoValidationError,
  deleteClientPhotoFile,
  saveClientPhotoFile
} from "@/lib/clients/clientPhotoStorage";
import { clientPhotosRepository } from "@/lib/repositories/clientPhotosRepository";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import type { ClientPhoto } from "@/types/domain";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

const readOptionalText = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : undefined;
};

const clientNotFoundResponse = () =>
  NextResponse.json(
    {
      success: false,
      code: "client_not_found",
      error: "Client not found",
      message: "Client not found"
    },
    { status: 404 }
  );

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return clientNotFoundResponse();
    }

    return ok({
      success: true,
      photos: await clientPhotosRepository.getClientPhotos(client.id)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  let savedFileName: string | undefined;

  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return clientNotFoundResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new ClientPhotoValidationError("Invalid file type");
    }

    const input = clientPhotoMetadataSchema.parse({
      category: readOptionalText(formData, "category"),
      procedureId: readOptionalText(formData, "procedureId"),
      bookingId: readOptionalText(formData, "bookingId"),
      date:
        readOptionalText(formData, "date") ?? new Date().toISOString().slice(0, 10),
      comment: readOptionalText(formData, "comment")
    });
    const storedFile = await saveClientPhotoFile(client.id, file);
    savedFileName = storedFile.fileName;

    const now = new Date().toISOString();
    const photoId = `photo_${randomUUID()}`;
    const photo: ClientPhoto = {
      id: photoId,
      clientId: client.id,
      // Not a static path: the file lives outside public/ and is only readable
      // through the admin-only streaming route.
      url: buildClientPhotoUrl(client.id, photoId),
      fileName: storedFile.fileName,
      originalName: file.name,
      mimeType: file.type,
      // Size on disk, which is smaller than file.size once EXIF is stripped.
      size: storedFile.size,
      category: input.category,
      procedureId: input.procedureId || undefined,
      bookingId: input.bookingId || undefined,
      date: input.date,
      comment: input.comment || undefined,
      createdAt: now,
      updatedAt: now
    };

    await clientPhotosRepository.addClientPhoto(photo);
    return ok({ success: true, photo });
  } catch (error) {
    if (savedFileName) {
      await deleteClientPhotoFile(savedFileName);
    }

    if (error instanceof ClientPhotoValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: error.message === "File too large" ? "file_too_large" : "invalid_file_type",
          error: error.message,
          message: error.message
        },
        { status: 400 }
      );
    }

    return errorResponse(error);
  }
}
