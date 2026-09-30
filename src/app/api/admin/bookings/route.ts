import { type NextRequest, NextResponse } from "next/server";
import { autoCompletePastBookingsThrottled } from "@/lib/bookings/autoCompleteBookings";
import { cancelBooking } from "@/lib/bookings/cancelBooking";
import { changeBookingDateTime } from "@/lib/bookings/changeBookingDateTime";
import { confirmBooking } from "@/lib/bookings/confirmBooking";
import { updateBookingDetails } from "@/lib/bookings/updateBookingDetails";
import { notifyStatusChange } from "@/lib/bookings/notifyStatusChange";
import { setBookingChannel } from "@/lib/messaging/setClientChannel";
import { updateBookingStatus } from "@/lib/bookings/updateBookingStatus";
import {
  showRescheduleOptions,
  suggestReschedule
} from "@/lib/bookings/suggestReschedule";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { messageChannelSchema, timeSlotSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    // Opening the admin (dashboard/bookings/calendar) closes finished visits.
    await autoCompletePastBookingsThrottled();
    return ok({ bookings: await appRepository.listBookings() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = (await request.json()) as {
      action?: string;
      bookingId?: string;
      comment?: string;
      selectedServiceIds?: string[];
      slotId?: string;
      slot?: unknown;
      channel?: unknown;
    };

    if (!body.bookingId) {
      return NextResponse.json(
        {
          success: false,
          code: "booking_id_required",
          error: "bookingId is required",
          message: "bookingId is required"
        },
        { status: 400 }
      );
    }

    if (body.action === "confirm") {
      return ok({ success: true, ...(await confirmBooking(body.bookingId)) });
    }

    if (body.action === "cancel") {
      return ok({ success: true, ...(await cancelBooking(body.bookingId)) });
    }

    if (body.action === "showReschedule") {
      return ok({
        success: true,
        slots: await showRescheduleOptions(body.bookingId)
      });
    }

    if (body.action === "suggestReschedule") {
      return ok({
        success: true,
        ...(await suggestReschedule(body.bookingId, body.slotId))
      });
    }

    if (body.action === "changeDateTime") {
      const slot = timeSlotSchema.parse(body.slot);
      return ok({
        success: true,
        ...(await changeBookingDateTime(body.bookingId, slot))
      });
    }

    if (body.action === "updateDetails") {
      return ok({
        success: true,
        ...(await updateBookingDetails(body.bookingId, {
          selectedServiceIds: body.selectedServiceIds,
          comment: body.comment
        }))
      });
    }

    if (body.action === "complete") {
      const booking = await updateBookingStatus(body.bookingId, "completed", {
        completedAt: new Date().toISOString(),
        noShowAt: undefined
      });
      return ok({
        success: true,
        booking,
        warnings: await notifyStatusChange(booking)
      });
    }

    if (body.action === "setChannel") {
      const channel = messageChannelSchema.parse(body.channel);
      return ok({
        success: true,
        booking: await setBookingChannel(body.bookingId, channel)
      });
    }

    if (body.action === "noShow") {
      const booking = await updateBookingStatus(body.bookingId, "no_show", {
        noShowAt: new Date().toISOString()
      });
      return ok({
        success: true,
        booking,
        warnings: await notifyStatusChange(booking)
      });
    }

    return NextResponse.json(
      {
        success: false,
        code: "unsupported_action",
        error: "Unsupported action",
        message: "Unsupported action"
      },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
