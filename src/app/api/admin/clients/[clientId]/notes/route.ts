import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { clientNoteSchema } from "@/lib/clients/clientSchemas";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import { clientNotesRepository } from "@/lib/repositories/clientNotesRepository";

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin(request);
    const { clientId } = await params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return clientNotFoundResponse();
    }

    return ok({
      success: true,
      notes: await clientNotesRepository.listByClientId(client.id)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin(request);
    const { clientId } = await params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return clientNotFoundResponse();
    }

    const input = clientNoteSchema.parse(await request.json());
    const note = await clientNotesRepository.create(client.id, input);
    return ok({ success: true, note });
  } catch (error) {
    return errorResponse(error);
  }
}
