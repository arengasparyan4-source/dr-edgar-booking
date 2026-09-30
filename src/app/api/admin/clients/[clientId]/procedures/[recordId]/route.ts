import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { procedureRecordSchema } from "@/lib/clients/clientSchemas";
import { clientProceduresRepository } from "@/lib/repositories/clientProceduresRepository";

type RouteContext = {
  params: Promise<{ clientId: string; recordId: string }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId, recordId } = await context.params;
    const patch = procedureRecordSchema.partial().parse(await request.json());
    const record = await clientProceduresRepository.update(clientId, recordId, patch);

    return ok({ success: true, record });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId, recordId } = await context.params;
    const deleted = await clientProceduresRepository.delete(clientId, recordId);

    return ok({ success: true, deleted });
  } catch (error) {
    return errorResponse(error);
  }
}

