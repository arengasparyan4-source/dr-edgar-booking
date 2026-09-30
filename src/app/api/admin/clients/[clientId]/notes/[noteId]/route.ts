import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { clientNoteSchema } from "@/lib/clients/clientSchemas";
import { clientNotesRepository } from "@/lib/repositories/clientNotesRepository";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    await requireAdmin(request);
    const { clientId, noteId } = await params;
    const input = clientNoteSchema.partial().parse(await request.json());
    const note = await clientNotesRepository.update(clientId, noteId, input);

    if (!note) {
      return NextResponse.json(
        {
          success: false,
          code: "note_not_found",
          error: "Note not found",
          message: "Note not found"
        },
        { status: 404 }
      );
    }

    return ok({ success: true, note });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string; noteId: string }> }
) {
  try {
    await requireAdmin(request);
    const { clientId, noteId } = await params;
    const deleted = await clientNotesRepository.delete(clientId, noteId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          code: "note_not_found",
          error: "Note not found",
          message: "Note not found"
        },
        { status: 404 }
      );
    }

    return ok({ success: true, data: { deleted } });
  } catch (error) {
    return errorResponse(error);
  }
}
