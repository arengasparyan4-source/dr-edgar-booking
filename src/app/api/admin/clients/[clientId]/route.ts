import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { updateManualClient } from "@/lib/clients/clientEditor";
import { clientsRepository } from "@/lib/repositories/clientsRepository";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          code: "client_not_found",
          error: "Client not found",
          message: "Client not found"
        },
        { status: 404 }
      );
    }

    return ok({ client });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const client = await updateManualClient(clientId, await request.json());

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          code: "client_not_found",
          error: "Client not found",
          message: "Client not found"
        },
        { status: 404 }
      );
    }

    return ok({ success: true, client });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const deleted = await clientsRepository.deleteClientsByIds([clientId]);

    return ok({ success: true, deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
