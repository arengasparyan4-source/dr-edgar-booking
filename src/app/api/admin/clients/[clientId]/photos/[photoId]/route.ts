import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { clientPhotoPatchSchema } from "@/lib/clients/clientPhotoSchemas";
import { deleteClientPhotoFile } from "@/lib/clients/clientPhotoStorage";
import { clientPhotosRepository } from "@/lib/repositories/clientPhotosRepository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ clientId: string; photoId: string }>;
};

async function getClientPhoto(clientId: string, photoId: string) {
  const photo = await clientPhotosRepository.getClientPhoto(photoId);
  if (!photo || photo.clientId !== clientId) {
    throw new Error("Photo not found");
  }

  return photo;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId, photoId } = await context.params;
    await getClientPhoto(clientId, photoId);
    const input = clientPhotoPatchSchema.parse(await request.json());
    const photo = await clientPhotosRepository.updateClientPhoto(photoId, {
      ...input,
      procedureId: input.procedureId || undefined,
      bookingId: input.bookingId || undefined,
      comment: input.comment || undefined
    });

    return ok({ success: true, photo });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId, photoId } = await context.params;
    const photo = await getClientPhoto(clientId, photoId);
    await clientPhotosRepository.deleteClientPhoto(photoId);
    await deleteClientPhotoFile(photo.fileName);

    return ok({ success: true, deleted: 1 });
  } catch (error) {
    return errorResponse(error);
  }
}
