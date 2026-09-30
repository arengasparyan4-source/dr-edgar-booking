import type { MessageChannel, PublicBookingConfirmation, TimeSlot } from "./domain";

export type LegacyBookingPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  service: string;
  date: string;
  time: string;
  comment: string;
};

export type BookingPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  selectedServiceIds: string[];
  selectedSlot: TimeSlot;
  comment: string;
  preferredChannel?: MessageChannel;
};

export type BookingRequest = BookingPayload;

export type BookingResponse = {
  success: boolean;
  /** Machine-readable error code, e.g. "slot_taken". */
  code?: string;
  /** Public projection only - never the full Booking record. */
  booking?: PublicBookingConfirmation;
  message?: string;
};

export type AvailabilityPayload = {
  selectedServiceIds: string[];
  dateFrom: string;
  daysAhead?: number;
  limit?: number;
};

export type AvailabilityResponse = {
  totalDurationMinutes: number;
  totalPrice: number;
  slots: TimeSlot[];
};
