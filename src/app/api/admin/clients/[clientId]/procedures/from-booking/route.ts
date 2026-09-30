import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import { clientProceduresRepository } from "@/lib/repositories/clientProceduresRepository";
import { appRepository } from "@/lib/repositories/appRepository";

const createFromBookingSchema = z.object({
  bookingId: z.string().min(1)
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    await requireAdmin(request);
    const { clientId } = await params;
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

    const body = createFromBookingSchema.parse(await request.json());
    const booking = await appRepository.getBooking(body.bookingId);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          code: "booking_not_found",
          error: "Booking not found",
          message: "Booking not found"
        },
        { status: 404 }
      );
    }

    if (
      booking.clientId !== client.id &&
      booking.phone !== client.normalizedPhone &&
      booking.phone !== client.phone
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "booking_not_owned_by_client",
          error: "Booking does not belong to this client",
          message: "Booking does not belong to this client"
        },
        { status: 400 }
      );
    }

    const createdRecords = await clientProceduresRepository.createFromBooking(
      client.id,
      booking.id
    );
    const records = await clientProceduresRepository.listByClientId(client.id);

    return ok({ success: true, data: createdRecords, records });
  } catch (error) {
    return errorResponse(error);
  }
}
