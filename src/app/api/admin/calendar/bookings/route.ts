import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { autoCompletePastBookingsThrottled } from "@/lib/bookings/autoCompleteBookings";
import { errorResponse, ok } from "@/lib/api/responses";
import { earliestStartFromNow } from "@/lib/availability/bookingWindow";
import { buildCalendarSchedule } from "@/lib/availability/calendarSchedule";
import { fetchGoogleBusy } from "@/lib/availability/getAvailability";
import { addDays } from "@/lib/availability/time";
import { appRepository } from "@/lib/repositories/appRepository";

const calendarBookingsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await autoCompletePastBookingsThrottled();

    const parsed = calendarBookingsQuerySchema.safeParse({
      from: request.nextUrl.searchParams.get("from"),
      to: request.nextUrl.searchParams.get("to")
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          code: "date_range_required",
          error: "Valid from and to query params are required",
          message: "Valid from and to query params are required"
        },
        { status: 400 }
      );
    }

    const { from, to } = parsed.data;
    const data = await appRepository.getData();
    const bookings = data.bookings
      .filter((booking) => booking.date >= from && booking.date <= to)
      .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

    // Free slots are informational here; a Google outage must not break the
    // calendar, it only means Google busy time is not subtracted.
    const googleBusy = await fetchGoogleBusy(data.settings, from, addDays(to, 1)).catch(
      () => []
    );
    // The doctor may book anything that has not started yet (same rule as
    // manual booking), so free slots are counted from "now".
    const schedule = buildCalendarSchedule(
      data,
      googleBusy,
      from,
      to,
      earliestStartFromNow(0)
    );

    return ok({ bookings, schedule });
  } catch (error) {
    return errorResponse(error);
  }
}
