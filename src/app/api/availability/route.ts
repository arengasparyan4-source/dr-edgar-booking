import { type NextRequest } from "next/server";
import { getAvailability } from "@/lib/availability/getAvailability";
import {
  assertDateInWindow,
  getPublicBookingWindow
} from "@/lib/availability/bookingWindow";
import { appRepository } from "@/lib/repositories/appRepository";
import { ok, errorResponse } from "@/lib/api/responses";
import { getClientKey } from "@/lib/admin/loginRateLimit";
import { availabilityRateLimiter, tooManyRequestsResponse } from "@/lib/security/rateLimit";
import { availabilityRequestSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const limit = availabilityRateLimiter.hit(getClientKey(request));
  if (!limit.allowed) {
    return tooManyRequestsResponse(limit.retryAfterSeconds);
  }

  try {
    const payload = availabilityRequestSchema.parse(await request.json());
    // The booking window is decided here, in the clinic zone, not by the
    // browser: no dates before today or after the horizon, no slots sooner
    // than the minimum notice.
    const { settings } = await appRepository.getData();
    const window = getPublicBookingWindow(settings);
    assertDateInWindow(payload.dateFrom, window);
    const availability = await getAvailability({
      ...payload,
      notBefore: window.notBefore,
      lastDate: window.lastDate
    });

    return ok({
      totalDurationMinutes: availability.totalDurationMinutes,
      totalPrice: availability.totalPrice,
      slots: availability.slots
    });
  } catch (error) {
    return errorResponse(error, "Availability request failed");
  }
}
