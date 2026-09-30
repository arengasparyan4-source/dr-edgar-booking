import type { Language } from "@/data/translations";
import type { SmsLog, SmsQueueItem, SmsTemplate } from "@/types/sms";

export type LocalizedText = Record<Language, string>;

/** Where a client prefers to receive reminders and other messages. */
export type MessageChannel = "sms" | "whatsapp" | "viber" | "telegram";

export type Service = {
  id: string;
  category: string;
  name: LocalizedText;
  description: LocalizedText;
  durationMinutes: number;
  price: number;
  active: boolean;
};

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "reschedule_requested"
  | "completed"
  | "no_show";

export type TimeSlot = {
  date: string;
  startTime: string;
  endTime: string;
};

export type RescheduleOption = TimeSlot & {
  id: string;
};

export type Booking = {
  id: string;
  clientId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  selectedServiceIds: string[];
  servicesSnapshot: Service[];
  totalDurationMinutes: number;
  totalPrice: number;
  date: string;
  startTime: string;
  endTime: string;
  comment?: string;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  /** When the doctor marked the visit as "client did not come". */
  noShowAt?: string;
  googleCalendarEventId?: string;
  telegramMessageId?: string;
  telegramChatId?: string;
  rescheduleOptions?: RescheduleOption[];
  /** The client's preferred channel when the booking was made (changed together with the client). */
  preferredChannel?: MessageChannel;
};

/**
 * What an anonymous visitor is allowed to learn about the booking they just
 * created. Deliberately a whitelist: the full Booking carries telegramChatId,
 * telegramMessageId, googleCalendarEventId, clientId and the internal booking
 * id, none of which belong in a public response.
 */
export type PublicBookingConfirmation = {
  /** Short human-quotable code derived from the booking id. */
  reference: string;
  status: BookingStatus;
  date: string;
  startTime: string;
  endTime: string;
  /** Names of the booked services, in every supported language. */
  services: LocalizedText[];
};

export type ClientStatus =
  | "active"
  | "sleeping"
  | "lost"
  | "new"
  | "vip"
  | "blacklist"
  | "inactive";

export type Client = {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  normalizedPhone: string;
  comment?: string;
  notes?: string;
  balance?: number;
  discount?: number;
  birthDate?: string;
  email?: string;
  address?: string;
  status: ClientStatus;
  isVip: boolean;
  isBlacklisted: boolean;
  source?: string;
  visitsCount?: number;
  lastVisitDate?: string;
  nextBookingDate?: string;
  /** Preferred message channel; "sms" when never chosen. */
  preferredChannel?: MessageChannel;
  createdAt: string;
  updatedAt: string;
};

export type ClientProcedureUnit = "ml" | "g" | "unit" | "other";

export type ClientProcedureRecord = {
  id: string;
  clientId: string;
  date: string;
  serviceName: string;
  serviceId?: string;
  preparationName?: string;
  preparationType?: string;
  amount?: string;
  unit?: ClientProcedureUnit;
  area?: string;
  price?: number;
  currency?: "AMD";
  doctorNotes?: string;
  comment?: string;
  bookingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientNote = {
  id: string;
  clientId: string;
  text: string;
  author?: string;
  pinned: boolean;
  date: string;
  createdAt: string;
  updatedAt: string;
};

export type ClientPhotoCategory = "before" | "after" | "document" | "other";

export type ClientPhoto = {
  id: string;
  clientId: string;
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: ClientPhotoCategory;
  procedureId?: string;
  bookingId?: string;
  date: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkingHours = {
  dayOfWeek: number;
  enabled: boolean;
  startTime: string;
  endTime: string;
  breaks: Array<{
    startTime: string;
    endTime: string;
  }>;
};

export type BlockedTime = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
};

export type PortfolioItem = {
  id: string;
  imageUrl: string;
  title: LocalizedText;
  order: number;
  active: boolean;
};

export type Settings = {
  address: string;
  phone: string;
  instagramUrl: string;
  googleCalendarId?: string;
  telegramChatId?: string;
  googleCalendarEnabled: boolean;
  bookingHorizonDays: number;
  /**
   * Minimum notice for a client booking, in minutes: slots starting earlier
   * than now + this value are not offered. Missing means the default (60).
   */
  minBookingLeadMinutes?: number;
  aboutDoctor: LocalizedText;
  /**
   * SMS controls. Auto-send is a hard safety gate: with a real provider no SMS
   * is dispatched unless smsAutoSendEnabled is true (the mock provider only
   * logs, so it is always safe). Reminders/birthday have their own toggles.
   */
  smsAutoSendEnabled?: boolean;
  smsReminderEnabled?: boolean;
  smsReminderOffsets?: number[];
  smsBirthdayAutoSendEnabled?: boolean;
};

export type PublicSettings = Pick<
  Settings,
  "address" | "phone" | "instagramUrl" | "aboutDoctor" | "bookingHorizonDays"
>;

export type AppData = {
  services: Service[];
  bookings: Booking[];
  clients: Client[];
  clientProcedureRecords: ClientProcedureRecord[];
  clientNotes: ClientNote[];
  clientPhotos: ClientPhoto[];
  workingHours: WorkingHours[];
  blockedTimes: BlockedTime[];
  portfolio: PortfolioItem[];
  settings: Settings;
  smsTemplates: SmsTemplate[];
  smsQueue: SmsQueueItem[];
  smsLogs: SmsLog[];
};

export type PublicSiteData = Pick<
  AppData,
  "services" | "workingHours" | "blockedTimes" | "portfolio"
> & {
  settings: PublicSettings;
  /** Today in the clinic zone, decided by the server (YYYY-MM-DD). */
  today?: string;
};
