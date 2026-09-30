import { NextResponse, type NextRequest } from "next/server";
import { createBookingRequest } from "@/lib/bookings/createBookingRequest";
import { toPublicBookingConfirmation } from "@/lib/bookings/publicBooking";
import { errorResponse } from "@/lib/api/responses";
import { getClientKey } from "@/lib/admin/loginRateLimit";
import { bookingRateLimiter, tooManyRequestsResponse } from "@/lib/security/rateLimit";
import { bookingRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limit = bookingRateLimiter.hit(getClientKey(request));
  if (!limit.allowed) {
    console.warn("[api/booking] Rate limit reached", { clientKey: getClientKey(request) });
    return tooManyRequestsResponse(limit.retryAfterSeconds);
  }

  try {
    const payload = bookingRequestSchema.parse(await request.json());
    const { booking, warnings } = await createBookingRequest(payload);

    if (warnings.length) {
      // Diagnostics about Telegram/SMS/Calendar side effects stay server-side;
      // an anonymous caller has no use for them and they describe internals.
      console.warn("[api/booking] Booking created with warnings", {
        bookingId: booking.id,
        warnings
      });
    }

    return NextResponse.json(
      {
        success: true,
        booking: toPublicBookingConfirmation(booking),
        message: "Booking request created"
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[api/booking] Booking request failed", {
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return errorResponse(error, "Booking request failed");
  }
}
