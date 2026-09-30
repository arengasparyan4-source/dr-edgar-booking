"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck2 } from "lucide-react";
import AboutDoctor from "@/components/AboutDoctor";
import BookingForm from "@/components/BookingForm";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import Portfolio from "@/components/Portfolio";
import Services from "@/components/Services";
import { defaultServices } from "@/data/services";
import { translations } from "@/data/translations";
import { useStoredLanguage } from "@/lib/i18n/languageStore";
import { defaultPortfolio, defaultSettings } from "@/lib/data/defaultData";
import type { AvailabilityResponse } from "@/types/booking";
import type { PublicSiteData, TimeSlot } from "@/types/domain";

const fallbackSiteData: PublicSiteData = {
  services: defaultServices,
  workingHours: [],
  blockedTimes: [],
  portfolio: defaultPortfolio,
  settings: defaultSettings
};

const toLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function HomePage() {
  // Remembered per browser; Armenian by default.
  const [language, setLanguage] = useStoredLanguage("dr_edgar_site_language");
  const [siteData, setSiteData] = useState<PublicSiteData>(fallbackSiteData);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  // "Today" is the clinic's today and comes from the server with the site
  // data; the browser clock is only a fallback when that request fails.
  const [todayDate, setTodayDate] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [isFindingSlots, setIsFindingSlots] = useState(false);
  const bookingRef = useRef<HTMLDivElement>(null);
  const availabilityRequestIdRef = useRef(0);

  const t = translations[language];
  const selectedServices = useMemo(
    () =>
      siteData.services.filter((service) =>
        selectedServiceIds.includes(service.id)
      ),
    [siteData.services, selectedServiceIds]
  );

  useEffect(() => {
    let isMounted = true;

    fetch("/api/site-data")
      .then((response) => response.json())
      .then((data: PublicSiteData) => {
        if (isMounted) {
          setSiteData(data);
          setTodayDate(data.today ?? toLocalDateKey(new Date()));
        }
      })
      .catch(() => {
        if (isMounted) {
          setSiteData(fallbackSiteData);
          setTodayDate(toLocalDateKey(new Date()));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const scrollToBooking = () => {
    bookingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resetAvailability = () => {
    availabilityRequestIdRef.current += 1;
    setIsFindingSlots(false);
    setSelectedSlot(null);
    setAvailability(null);
  };

  const loadAvailabilityForDate = async (serviceIds: string[], date: string) => {
    if (!serviceIds.length) {
      resetAvailability();
      return;
    }

    const requestId = availabilityRequestIdRef.current + 1;
    availabilityRequestIdRef.current = requestId;
    setIsFindingSlots(true);
    setAvailability(null);
    setSelectedSlot(null);

    try {
      const response = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedServiceIds: serviceIds,
          dateFrom: date,
          daysAhead: 1,
          limit: 96
        })
      });
      const data = (await response.json()) as AvailabilityResponse;

      if (!response.ok) {
        throw new Error("Availability failed");
      }

      if (availabilityRequestIdRef.current === requestId) {
        setAvailability(data);
      }
    } catch {
      if (availabilityRequestIdRef.current === requestId) {
        setAvailability({ totalDurationMinutes: 0, totalPrice: 0, slots: [] });
      }
    } finally {
      if (availabilityRequestIdRef.current === requestId) {
        setIsFindingSlots(false);
      }
    }
  };

  const toggleService = (serviceId: string) => {
    const nextServiceIds = selectedServiceIds.includes(serviceId)
      ? selectedServiceIds.filter((id) => id !== serviceId)
      : [...selectedServiceIds, serviceId];

    setSelectedServiceIds(nextServiceIds);

    if (selectedDate && nextServiceIds.length) {
      void loadAvailabilityForDate(nextServiceIds, selectedDate);
      return;
    }

    resetAvailability();
  };

  const selectBookingDate = (date: string) => {
    setSelectedDate(date);
    void loadAvailabilityForDate(selectedServiceIds, date);
  };

  const resetBookingFlow = () => {
    setSelectedServiceIds([]);
    setSelectedDate(null);
    resetAvailability();
  };

  const handleFindSlots = () => {
    if (!selectedServiceIds.length) {
      return;
    }

    window.setTimeout(scrollToBooking, 80);
  };

  return (
    <main className="relative overflow-x-clip pb-28 md:pb-0">
      <Hero
        language={language}
        settings={siteData.settings}
        onBookClick={() => {
          document
            .getElementById("services")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        onLanguageChange={setLanguage}
      />
      <AboutDoctor language={language} settings={siteData.settings} />
      <Portfolio language={language} items={siteData.portfolio} />
      <Services
        language={language}
        services={siteData.services}
        selectedServiceIds={selectedServiceIds}
        isFindingSlots={isFindingSlots}
        onToggleService={toggleService}
        onFindSlots={handleFindSlots}
      />
      <div ref={bookingRef}>
        <BookingForm
          language={language}
          services={siteData.services}
          workingHours={siteData.workingHours}
          selectedServiceIds={selectedServiceIds}
          bookingHorizonDays={siteData.settings.bookingHorizonDays}
          todayDate={todayDate}
          availability={availability}
          isFindingSlots={isFindingSlots}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          onSelectDate={selectBookingDate}
          onSelectSlot={setSelectedSlot}
          onBookingSent={resetBookingFlow}
          onSlotTaken={() => {
            if (selectedDate) {
              void loadAvailabilityForDate(selectedServiceIds, selectedDate);
            }
          }}
        />
      </div>
      <Footer
        language={language}
        settings={siteData.settings}
        onBookClick={scrollToBooking}
      />

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-champagne/60 bg-porcelain/94 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-16px_36px_rgba(32,28,26,0.12)] backdrop-blur-xl md:hidden">
        <button
          type="button"
          onClick={scrollToBooking}
          className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-4 text-sm font-semibold text-white shadow-premium transition active:scale-[0.99]"
        >
          <CalendarCheck2 className="h-5 w-5" aria-hidden="true" />
          <span>
            {selectedServices.length
              ? `${t.sticky.label} · ${selectedServices.length}`
              : t.common.book}
          </span>
        </button>
      </div>
    </main>
  );
}
