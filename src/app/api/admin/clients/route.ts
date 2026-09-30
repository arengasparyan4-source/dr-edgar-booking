import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { autoCompletePastBookingsThrottled } from "@/lib/bookings/autoCompleteBookings";
import { errorResponse, ok } from "@/lib/api/responses";
import { createManualClient } from "@/lib/clients/clientEditor";
import { clientsRepository } from "@/lib/repositories/clientsRepository";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    // Visit counters shown in the client list depend on finished visits.
    await autoCompletePastBookingsThrottled();
    return ok({ clients: await clientsRepository.listClients() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const { client, created } = await createManualClient(await request.json());

    return ok({ success: true, client, created });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as {
      clientIds?: unknown;
      deleteAll?: unknown;
      confirmation?: unknown;
    };

    if (body.deleteAll === true) {
      if (body.confirmation !== "DELETE CLIENTS") {
        return NextResponse.json(
          {
            success: false,
            code: "confirmation_required",
            error: "Confirmation text is required",
            message: "Confirmation text is required"
          },
          { status: 400 }
        );
      }

      const deleted = await clientsRepository.deleteAllClientsSafely();
      return ok({ success: true, deleted });
    }

    if (
      !Array.isArray(body.clientIds) ||
      body.clientIds.some((clientId) => typeof clientId !== "string")
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "client_ids_required",
          error: "clientIds are required",
          message: "clientIds are required"
        },
        { status: 400 }
      );
    }

    const deleted = await clientsRepository.deleteClientsByIds(body.clientIds);
    return ok({ success: true, deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
