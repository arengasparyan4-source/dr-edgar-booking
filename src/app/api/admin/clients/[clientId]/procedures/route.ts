import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { procedureRecordSchema } from "@/lib/clients/clientSchemas";
import { clientProceduresRepository } from "@/lib/repositories/clientProceduresRepository";
import { clientsRepository } from "@/lib/repositories/clientsRepository";

type RouteContext = {
  params: Promise<{ clientId: string }>;
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
      records: await clientProceduresRepository.listByClientId(client.id)
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    const client = await clientsRepository.getClientById(clientId);

    if (!client) {
      return clientNotFoundResponse();
    }

    const input = procedureRecordSchema.parse(await request.json());
    const record = await clientProceduresRepository.create(client.id, input);

    return ok({ success: true, record });
  } catch (error) {
    return errorResponse(error);
  }
}
