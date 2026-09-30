import { type NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { serviceSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return ok({ services: await appRepository.listServices(true) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const service = serviceSchema.parse({
      ...body,
      id: body.id || `service_${randomUUID()}`
    });
    const data = await appRepository.upsertService(service);
    return ok({ success: true, services: data.services });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);
    const serviceId = request.nextUrl.searchParams.get("id");

    if (!serviceId) {
      return NextResponse.json(
        {
          success: false,
          code: "service_id_required",
          error: "Service id is required",
          message: "Service id is required"
        },
        { status: 400 }
      );
    }

    const data = await appRepository.deleteService(serviceId);
    return ok({ success: true, services: data.services });
  } catch (error) {
    return errorResponse(error);
  }
}
