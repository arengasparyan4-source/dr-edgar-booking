"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import {
  formatLongDate,
  formatMonthShort,
  formatNumber,
  formatWeekdayShort
} from "@/lib/i18n/formatDate";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  Send,
  UserRound
} from "lucide-react";
import { type Language, translations } from "@/data/translations";
import {
  PHONE_ERROR,
  normalizePhoneNumber
} from "@/lib/phone/armenianPhone";
import { addDays, getDayOfWeek } from "@/lib/availability/time";
import type {
  AvailabilityResponse,
  BookingPayload,
  BookingResponse
} from "@/types/booking";
import type { MessageChannel, Service, TimeSlot, WorkingHours } from "@/types/domain";
import { ChannelPicker } from "./ChannelIcon";

type BookingFormProps = {
  language: Language;
  services: Service[];
  workingHours: WorkingHours[];
  selectedServiceIds: string[];
  bookingHorizonDays: number;
  todayDate: string;
  availability: AvailabilityResponse | null;
  isFindingSlots: boolean;
  selectedDate: string | null;
  selectedSlot: TimeSlot | null;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slot: TimeSlot) => void;
  onBookingSent: () => void;
  /** The chosen time was taken meanwhile; reload the slots for the date. */
  onSlotTaken: () => void;
};

const initialForm = {
  firstName: "",
  lastName: "",
  phone: "",
  comment: ""
};

const formatPrice = formatNumber;

const parseDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
};

type StepSummaryProps = {
  index: number;
  title: string;
  detail: string;
  complete: boolean;
};

function StepSummary({ index, title, detail, complete }: StepSummaryProps) {
  return (
    <div className="flex gap-3 rounded-2xl bg-white/48 p-3 shadow-sm">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold ${
          complete ? "bg-ink text-white" : "bg-white/76 text-graphite"
        }`}
      >
        {complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : index}
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold">{title}</p>
        <p className="mt-1 break-words text-xs leading-5 text-graphite/70">
          {detail}
        </p>
      </div>
    </div>
  );
}

type SectionTitleProps = {
  index: number;
  title: string;
  children?: ReactNode;
};

function SectionTitle({ index, title, children }: SectionTitleProps) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
        {index}
      </span>
      <div className="min-w-0">
        <p className="break-words text-base font-semibold text-ink">{title}</p>
        {children ? (
          <p className="mt-1 break-words text-sm leading-6 text-graphite/70">
            {children}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function BookingForm({
  language,
  services,
  workingHours,
  selectedServiceIds,
  bookingHorizonDays,
  todayDate,
  availability,
  isFindingSlots,
  selectedDate,
  selectedSlot,
  onSelectDate,
  onSelectSlot,
  onBookingSent,
  onSlotTaken
}: BookingFormProps) {
  const t = translations[language];
  const [form, setForm] = useState(initialForm);
  const [channel, setChannel] = useState<MessageChannel>("sms");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "slotTaken" | "tooMany"
  >("idle");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedServiceIds.includes(service.id)),
    [services, selectedServiceIds]
  );

  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + service.durationMinutes,
    0
  );
  const totalPrice = selectedServices.reduce(
    (sum, service) => sum + service.price,
    0
  );


  const dateOptions = useMemo(() => {
    if (!todayDate) {
      return [];
    }

    const horizonDays = Math.max(7, bookingHorizonDays || 7);

    return Array.from({ length: horizonDays }, (_, index) => {
      const date = addDays(todayDate, index);
      const dateValue = parseDateKey(date);
      const dayHours = workingHours.find(
        (item) => item.dayOfWeek === getDayOfWeek(date)
      );

      return {
        date,
        weekday: formatWeekdayShort(dateValue, language),
        dayNumber: dateValue.getDate(),
        month: formatMonthShort(dateValue, language),
        isWorking: Boolean(dayHours?.enabled),
        workRange: dayHours?.enabled
          ? `${dayHours.startTime}-${dayHours.endTime}`
          : t.booking.dayOff
      };
    });
  }, [
    bookingHorizonDays,
    language,
    t.booking.dayOff,
    todayDate,
    workingHours
  ]);

  const visibleSlots = useMemo(
    () => availability?.slots.filter((slot) => slot.date === selectedDate) ?? [],
    [availability, selectedDate]
  );

  const selectedDateLabel = selectedDate
    ? formatLongDate(parseDateKey(selectedDate), language)
    : t.booking.notSelected;
  const selectedSlotLabel = selectedSlot
    ? `${selectedDateLabel} · ${selectedSlot.startTime}-${selectedSlot.endTime}`
    : t.booking.notSelected;

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setStatus("idle");
    if (field === "phone") {
      setPhoneError(null);
    }
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSelectDate = (date: string) => {
    setStatus("idle");
    onSelectDate(date);
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setStatus("idle");
    onSelectSlot(slot);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedSlot || !selectedServiceIds.length) {
      setStatus("error");
      return;
    }

    const normalizedPhone = normalizePhoneNumber(form.phone);

    if (!normalizedPhone) {
      setPhoneError(PHONE_ERROR);
      setStatus("idle");
      return;
    }

    setStatus("loading");

    const payload: BookingPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: normalizedPhone,
      selectedServiceIds,
      selectedSlot,
      comment: form.comment.trim(),
      preferredChannel: channel
    };

    try {
      const response = await fetch("/api/booking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const data = (await response.json().catch(() => null)) as
        | BookingResponse
        | null;

      // 409 slot_taken: someone booked this time a moment earlier (or it
      // became unavailable) - explain it and show the fresh slots.
      if (
        response.status === 409 &&
        (data?.code === "slot_taken" || data?.code === "slot_unavailable")
      ) {
        setStatus("slotTaken");
        onSlotTaken();
        return;
      }

      if (response.status === 429) {
        setStatus("tooMany");
        return;
      }

      if (!response.ok || data?.success !== true) {
        throw new Error(data?.message ?? "Booking request failed");
      }

      setStatus("success");
      setPhoneError(null);
      setForm(initialForm);
      setChannel("sms");
      onBookingSent();
    } catch {
      setStatus("error");
    }
  };

  return (
    <section
      id="booking"
      className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-16"
    >
      <div className="w-full max-w-full overflow-hidden rounded-3xl bg-ink shadow-premium lg:grid lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)]">
        <div className="min-w-0 bg-champagne-glow p-5 text-ink sm:p-7 lg:p-8 xl:p-10">
          <p className="text-sm font-semibold">{t.booking.title}</p>
          <h2 className="mt-3 break-words text-3xl font-semibold leading-tight sm:text-4xl">
            {t.booking.subtitle}
          </h2>

          <div className="mt-8 grid gap-3">
            <StepSummary
              index={1}
              title={t.booking.serviceStep}
              detail={
                selectedServices.length
                  ? `${selectedServices.length} · ${totalDuration} ${t.common.minutes}`
                  : t.services.emptySelection
              }
              complete={selectedServices.length > 0}
            />
            <StepSummary
              index={2}
              title={t.booking.dateStep}
              detail={selectedDateLabel}
              complete={Boolean(selectedDate)}
            />
            <StepSummary
              index={3}
              title={t.booking.timeStep}
              detail={selectedSlotLabel}
              complete={Boolean(selectedSlot)}
            />
            <StepSummary
              index={4}
              title={t.booking.contactStep}
              detail={t.booking.contactStepHint}
              complete={status === "success"}
            />
          </div>

          <div className="mt-6 min-w-0 rounded-2xl border border-white/35 bg-white/40 p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5" aria-hidden="true" />
              <span className="text-sm font-semibold">{t.common.total}</span>
            </div>
            <p className="mt-2 break-words text-base font-semibold">
              {totalDuration} {t.common.minutes} · {formatPrice(totalPrice)}{" "}
              {t.common.amd}
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="min-w-0 bg-porcelain p-4 sm:p-6 lg:p-8 xl:p-10"
        >
          <div className="min-w-0 rounded-3xl border border-champagne/60 bg-white/72 p-4 shadow-sm">
            <SectionTitle index={1} title={t.booking.serviceStep}>
              {t.services.subtitle}
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {selectedServices.length ? (
                selectedServices.map((service) => (
                  <span
                    key={service.id}
                    className="max-w-full break-words rounded-full bg-pearl px-3 py-2 text-xs font-semibold text-ink"
                  >
                    {service.name[language]}
                  </span>
                ))
              ) : (
                <span className="text-sm text-graphite/70">
                  {t.booking.selectServicesFirst}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 min-w-0 rounded-3xl border border-champagne/60 bg-white/72 p-4 shadow-sm">
            <SectionTitle index={2} title={t.booking.dateStep}>
              {t.booking.dateStepHint}
            </SectionTitle>
            <div className="max-w-full overflow-x-auto overscroll-x-contain pb-2">
              <div className="flex w-max min-w-full gap-2 px-1">
                {dateOptions.map((option) => {
                const isSelected = selectedDate === option.date;
                const isDisabled = !selectedServices.length || !option.isWorking;

                return (
                  <button
                    key={option.date}
                    type="button"
                    onClick={() => handleSelectDate(option.date)}
                    disabled={isDisabled}
                    data-testid={`booking-date-${option.date}`}
                    aria-pressed={isSelected}
                    className={`min-h-28 w-24 shrink-0 rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-ink bg-ink text-white shadow-soft"
                        : "border-champagne/70 bg-porcelain text-ink hover:border-ink/35"
                    } disabled:cursor-not-allowed disabled:border-champagne/45 disabled:bg-white/52 disabled:text-graphite/45`}
                  >
                    <span className="block text-xs font-semibold uppercase">
                      {option.weekday}
                    </span>
                    <span className="mt-2 block text-2xl font-semibold leading-none">
                      {option.dayNumber}
                    </span>
                    <span className="mt-1 block text-xs font-semibold">
                      {option.month}
                    </span>
                    <span className="mt-2 block text-[11px] font-semibold leading-4 opacity-80">
                      {option.workRange}
                    </span>
                  </button>
                );
                })}
              </div>
            </div>
            {!selectedServices.length ? (
              <p className="mt-2 rounded-2xl bg-pearl p-3 text-sm leading-6 text-graphite/70">
                {t.booking.selectServicesFirst}
              </p>
            ) : null}
          </div>

          <div className="mt-5 min-w-0 rounded-3xl border border-champagne/60 bg-white/72 p-4 shadow-sm">
            <SectionTitle index={3} title={t.booking.timeStep}>
              {selectedDate
                ? selectedDateLabel
                : t.booking.selectDateFirst}
            </SectionTitle>
            <div className="grid min-w-0 gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              {!selectedServices.length ? (
                <div className="rounded-2xl border border-champagne/60 bg-porcelain p-4 text-sm leading-6 text-graphite sm:col-span-2">
                  {t.booking.selectServicesFirst}
                </div>
              ) : !selectedDate ? (
                <div className="rounded-2xl border border-champagne/60 bg-porcelain p-4 text-sm leading-6 text-graphite sm:col-span-2">
                  {t.booking.selectDateFirst}
                </div>
              ) : isFindingSlots ? (
                <div className="rounded-2xl border border-champagne/60 bg-porcelain p-4 text-sm font-semibold text-graphite sm:col-span-2">
                  {t.services.findingSlots}
                </div>
              ) : visibleSlots.length ? (
                visibleSlots.map((slot) => {
                  const isSelected =
                    selectedSlot?.date === slot.date &&
                    selectedSlot.startTime === slot.startTime;

                  return (
                    <button
                      key={`${slot.date}-${slot.startTime}`}
                      type="button"
                      onClick={() => handleSelectSlot(slot)}
                      data-testid={`booking-slot-${slot.startTime}`}
                      className={`min-h-14 min-w-0 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
                        isSelected
                          ? "border-ink bg-ink text-white shadow-soft"
                          : "border-champagne/60 bg-white/82 text-ink hover:border-ink/40"
                      }`}
                    >
                      <span className="block break-words text-base">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span className="mt-1 block break-words text-xs opacity-75">
                        {selectedDateLabel}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-blush/50 bg-blush/14 p-4 text-sm leading-6 text-ink sm:col-span-2">
                  {t.booking.noSlotsForDate}
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 min-w-0 rounded-3xl border border-champagne/60 bg-white/72 p-4 shadow-sm">
            <SectionTitle index={4} title={t.booking.contactStep}>
              {t.booking.contactStepHint}
            </SectionTitle>

            <div className="grid min-w-0 gap-5 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
              <label className="min-w-0">
                <span className="field-label">{t.booking.firstName}</span>
                <div className="relative">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
                    aria-hidden="true"
                  />
                  <input
                    className="field-control min-h-12 pl-12"
                    value={form.firstName}
                    onChange={(event) =>
                      updateField("firstName", event.target.value)
                    }
                    placeholder={t.booking.firstNamePlaceholder}
                    autoComplete="given-name"
                    data-testid="booking-first-name"
                    required
                  />
                </div>
              </label>

              <label className="min-w-0">
                <span className="field-label">{t.booking.lastName}</span>
                <div className="relative">
                  <UserRound
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
                    aria-hidden="true"
                  />
                  <input
                    className="field-control min-h-12 pl-12"
                    value={form.lastName}
                    onChange={(event) =>
                      updateField("lastName", event.target.value)
                    }
                    placeholder={t.booking.lastNamePlaceholder}
                    autoComplete="family-name"
                    data-testid="booking-last-name"
                    required
                  />
                </div>
              </label>
            </div>

            <label className="mt-5 block min-w-0">
              <span className="field-label">{t.booking.phone}</span>
              <div className="relative">
                <Phone
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-sage"
                  aria-hidden="true"
                />
                <input
                  className="field-control min-h-12 pl-12"
                  value={form.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  placeholder={t.booking.phonePlaceholder}
                  autoComplete="tel"
                  data-testid="booking-phone"
                  aria-describedby={phoneError ? "booking-phone-error" : undefined}
                  aria-invalid={Boolean(phoneError)}
                  inputMode="tel"
                  type="tel"
                  required
                />
              </div>
              {phoneError ? (
                <p
                  id="booking-phone-error"
                  className="mt-2 text-sm font-semibold text-[#9f3f37]"
                >
                  {phoneError}
                </p>
              ) : null}
            </label>

            <fieldset className="mt-5 min-w-0" data-testid="booking-channel">
              <legend className="field-label">{t.booking.channelLabel}</legend>
              <p className="-mt-1 mb-3 text-xs leading-5 text-graphite/65">
                {t.booking.channelHint}
              </p>
              <ChannelPicker value={channel} onChange={setChannel} name="booking-channel" />
            </fieldset>

            <label className="mt-5 block min-w-0">
              <span className="field-label">{t.booking.comment}</span>
              <div className="relative">
                <MessageCircle
                  className="pointer-events-none absolute left-4 top-4 h-5 w-5 text-sage"
                  aria-hidden="true"
                />
                <textarea
                  className="field-control min-h-32 resize-none pl-12"
                  value={form.comment}
                  onChange={(event) => updateField("comment", event.target.value)}
                  placeholder={t.booking.commentPlaceholder}
                />
              </div>
            </label>
          </div>

          {status === "success" ? (
            <div className="mt-5 flex min-w-0 items-start gap-3 rounded-2xl border border-sage/35 bg-sage/12 p-4 text-sm leading-6 text-ink" data-testid="booking-success">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sage" />
              <span className="min-w-0 break-words">{t.booking.success}</span>
            </div>
          ) : null}

          {status === "error" ? (
            <div className="mt-5 rounded-2xl border border-blush/50 bg-blush/14 p-4 text-sm leading-6 text-ink">
              {t.booking.error}
            </div>
          ) : null}

          {status === "tooMany" ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-blush/50 bg-blush/14 p-4 text-sm leading-6 text-ink"
            >
              {t.booking.tooManyRequests}
            </div>
          ) : null}

          {status === "slotTaken" ? (
            <div
              role="alert"
              className="mt-5 rounded-2xl border border-blush/50 bg-blush/14 p-4 text-sm font-semibold leading-6 text-ink"
            >
              {t.booking.slotTaken}
            </div>
          ) : null}

          <button
            type="submit"
            data-testid="booking-submit"
            disabled={status === "loading" || !selectedSlot || !selectedServiceIds.length}
            className="mt-7 inline-flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 text-center text-sm font-semibold text-white shadow-premium transition hover:bg-clinic disabled:cursor-not-allowed disabled:opacity-55"
          >
            <Send className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {status === "loading" ? t.booking.loading : t.booking.submit}
            </span>
          </button>
        </form>
      </div>
    </section>
  );
}
