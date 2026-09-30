import { appRepository } from "@/lib/repositories/appRepository";
import type {
  AppData,
  BookingStatus,
  Service,
  Settings,
  TimeSlot
} from "@/types/domain";
import {
  addDays,
  getDayOfWeek,
  intervalsOverlap,
  minutesFromTime,
  slotToInterval,
  subtractInterval,
  timeFromMinutes,
  type Interval
} from "./time";
import { getGoogleCalendarProvider } from "@/lib/google/googleCalendarProvider";
import type { SlotLowerBound } from "./bookingWindow";

type GetAvailabilityInput = {
  selectedServiceIds: string[];
  dateFrom: string;
  daysAhead?: number;
  limit?: number;
  excludeBookingId?: string;
  /** Slots starting before this clinic date/time are not returned. */
  notBefore?: SlotLowerBound;
  /** Last date (inclusive) to search; days after it are never returned. */
  lastDate?: string;
  /**
   * Services to size the slot with instead of looking selectedServiceIds up
   * among active services (e.g. an existing booking's servicesSnapshot).
   */
  services?: Service[];
};

export type Availability = {
  services: Service[];
  totalDurationMinutes: number;
  totalPrice: number;
  slots: TimeSlot[];
};

export const SLOT_TAKEN = "Slot is taken";
export const SLOT_UNAVAILABLE = "Selected slot is no longer available";

const slotStepMinutes = 30;
const busyStatuses: BookingStatus[] = [
  "pending",
  "confirmed",
  "reschedule_requested"
];

const calculateTotals = (services: Service[]) => ({
  totalDurationMinutes: services.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  ),
  totalPrice: services.reduce((sum, service) => sum + service.price, 0)
});

const resolveServices = (
  data: AppData,
  selectedServiceIds: string[],
  override?: Service[]
) => {
  if (override?.length) {
    return override;
  }

  const services = data.services.filter(
    (service) => service.active && selectedServiceIds.includes(service.id)
  );

  if (services.length !== selectedServiceIds.length || services.length === 0) {
    throw new Error("Invalid selected services");
  }

  return services;
};

const getSearchDays = (data: AppData, daysAhead?: number) =>
  daysAhead ?? data.settings.bookingHorizonDays ?? 7;

/** Google busy time for [dateFrom, dateTo]; network, so call it outside locks. */
export async function fetchGoogleBusy(
  settings: Settings,
  dateFrom: string,
  dateTo: string
) {
  return getGoogleCalendarProvider(settings).getBusyEvents(dateFrom, dateTo);
}

/**
 * Pure slot computation over a given data snapshot. Used both for listing
 * slots and, inside appRepository.updateData, for re-checking a slot against
 * the freshest data right before it is saved.
 */
export function computeAvailability(
  data: AppData,
  googleBusy: TimeSlot[],
  {
    selectedServiceIds,
    dateFrom,
    daysAhead,
    limit = 96,
    excludeBookingId,
    notBefore,
    lastDate,
    services: servicesOverride
  }: GetAvailabilityInput
): Availability {
  const daysToSearch = getSearchDays(data, daysAhead);
  const services = resolveServices(data, selectedServiceIds, servicesOverride);
  const { totalDurationMinutes, totalPrice } = calculateTotals(services);
  // The booking being re-checked may already have its own Google event (it was
  // confirmed before); that event must not block the booking's own time.
  const excludedBooking = excludeBookingId
    ? data.bookings.find((booking) => booking.id === excludeBookingId)
    : undefined;
  const ownGoogleEvent =
    excludedBooking?.googleCalendarEventId ? excludedBooking : undefined;
  const slots: TimeSlot[] = [];

  for (
    let dayOffset = 0;
    dayOffset < daysToSearch && slots.length < limit;
    dayOffset += 1
  ) {
    const date = addDays(dateFrom, dayOffset);
    const workingHours = data.workingHours.find(
      (item) => item.dayOfWeek === getDayOfWeek(date)
    );

    if (lastDate && date > lastDate) {
      break;
    }

    if (!workingHours?.enabled || (notBefore && date < notBefore.date)) {
      continue;
    }

    const earliestStart =
      notBefore && date === notBefore.date ? notBefore.minutes : 0;

    const workStart = minutesFromTime(workingHours.startTime);
    const workEnd = minutesFromTime(workingHours.endTime);
    const busyIntervals: Interval[] = [
      ...workingHours.breaks.map((breakTime) => ({
        start: minutesFromTime(breakTime.startTime),
        end: minutesFromTime(breakTime.endTime)
      })),
      ...data.blockedTimes
        .filter((blocked) => blocked.date === date)
        .map(slotToInterval),
      ...googleBusy
        .filter((busy) => busy.date === date)
        .map(slotToInterval)
        .flatMap((busy) =>
          ownGoogleEvent?.date === date
            ? subtractInterval(busy, slotToInterval(ownGoogleEvent))
            : [busy]
        ),
      ...data.bookings
        .filter(
          (booking) =>
            booking.id !== excludeBookingId &&
            booking.date === date &&
            busyStatuses.includes(booking.status)
        )
        .map(slotToInterval)
    ];

    for (
      let start = workStart;
      start + totalDurationMinutes <= workEnd && slots.length < limit;
      start += slotStepMinutes
    ) {
      const candidate = { start, end: start + totalDurationMinutes };
      const isBusy =
        candidate.start < earliestStart ||
        busyIntervals.some((busy) => intervalsOverlap(candidate, busy));

      if (!isBusy) {
        slots.push({
          date,
          startTime: timeFromMinutes(candidate.start),
          endTime: timeFromMinutes(candidate.end)
        });
      }
    }
  }

  return {
    services,
    totalDurationMinutes,
    totalPrice,
    slots
  };
}

export async function getAvailability(input: GetAvailabilityInput) {
  const data = await appRepository.getData();
  const dateTo = addDays(input.dateFrom, getSearchDays(data, input.daysAhead));
  const googleBusy = await fetchGoogleBusy(data.settings, input.dateFrom, dateTo);

  return computeAvailability(data, googleBusy, input);
}

export type SlotCheckInput = {
  selectedServiceIds: string[];
  slot: TimeSlot;
  excludeBookingId?: string;
  notBefore?: SlotLowerBound;
  services?: Service[];
};

/**
 * Throws unless `slot` is free in `data`. Synchronous on purpose: call it
 * inside appRepository.updateData so the check and the save see the same
 * data and no other write can slip in between (double booking, bug #3).
 *
 * SLOT_TAKEN when another active booking overlaps the slot (someone else just
 * got it), SLOT_UNAVAILABLE for every other reason (past, outside hours,
 * break, blocked time, Google event, malformed slot).
 */
export function assertSlotAvailableInData(
  data: AppData,
  googleBusy: TimeSlot[],
  { selectedServiceIds, slot, excludeBookingId, notBefore, services }: SlotCheckInput
): Availability {
  const availability = computeAvailability(data, googleBusy, {
    selectedServiceIds,
    dateFrom: slot.date,
    daysAhead: 1,
    limit: 96,
    excludeBookingId,
    notBefore,
    services
  });
  const isAvailable = availability.slots.some(
    (availableSlot) =>
      availableSlot.date === slot.date &&
      availableSlot.startTime === slot.startTime &&
      availableSlot.endTime === slot.endTime
  );

  if (isAvailable) {
    return availability;
  }

  const requested = slotToInterval(slot);
  const takenByBooking = data.bookings.some(
    (booking) =>
      booking.id !== excludeBookingId &&
      booking.date === slot.date &&
      busyStatuses.includes(booking.status) &&
      intervalsOverlap(requested, slotToInterval(booking))
  );

  throw new Error(takenByBooking ? SLOT_TAKEN : SLOT_UNAVAILABLE);
}

/** Google busy time for the day of `slot`, fetched before entering a lock. */
export async function fetchGoogleBusyForSlot(slot: TimeSlot) {
  const data = await appRepository.getData();
  return fetchGoogleBusy(data.settings, slot.date, addDays(slot.date, 1));
}

/**
 * Early, non-atomic check (fail fast before side effects such as a client
 * upsert). The authoritative check is assertSlotAvailableInData inside the
 * write that saves the booking.
 */
export async function assertSlotIsAvailable(input: SlotCheckInput) {
  const data = await appRepository.getData();
  const googleBusy = await fetchGoogleBusy(
    data.settings,
    input.slot.date,
    addDays(input.slot.date, 1)
  );

  return assertSlotAvailableInData(data, googleBusy, input);
}
