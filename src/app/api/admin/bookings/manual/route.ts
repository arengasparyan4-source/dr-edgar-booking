import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { createManualBooking } from "@/lib/bookings/createManualBooking";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const booking = await createManualBooking(await request.json());

    return ok({ success: true, booking });
  } catch (error) {
    return errorResponse(error);
  }
}

