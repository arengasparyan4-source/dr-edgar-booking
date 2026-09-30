import { describe, expect, it } from "vitest";
import { rescheduleSms } from "@/lib/bookings/messages";
import { isDispatchAllowed } from "@/lib/sms/smsService";
import {
  AVAILABLE_TEMPLATE_VARIABLES,
  createDefaultSmsTemplates,
  renderTemplateBody
} from "@/lib/sms/templates";
import { createDefaultAppData } from "@/lib/data/defaultData";

describe("renderTemplateBody", () => {
  it("fills variables, with or without spaces inside the braces", () => {
    expect(renderTemplateBody("Բարև {{clientName}}, {{ date }} ժամը {{time}}", {
      clientName: "Անի",
      date: "2026-10-01",
      time: "10:30"
    })).toBe("Բարև Անի, 2026-10-01 ժամը 10:30");
  });

  it("drops missing and unknown variables without leaving double spaces", () => {
    expect(renderTemplateBody("Զեղչ {{discount}} Ձեզ {{unknown}} համար", {})).toBe("Զեղչ Ձեզ համար");
    expect(renderTemplateBody("  {{customMessage}}  \nՇնորհակալություն ", {})).toBe("\nՇնորհակալություն".trim());
  });

  it("every default template only uses known variables and renders fully", () => {
    const known = new Set<string>(AVAILABLE_TEMPLATE_VARIABLES);
    const templates = createDefaultSmsTemplates();
    expect(new Set(templates.map((template) => template.type))).toEqual(
      new Set(["booking_confirmation", "booking_reminder", "booking_cancelled", "booking_rescheduled", "birthday", "loyalty"])
    );
    for (const template of templates) {
      const used = [...template.body.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((match) => match[1]);
      used.forEach((name) => expect(known.has(name)).toBe(true));
      const rendered = renderTemplateBody(template.body, {
        clientName: "Անի Սարգսյան",
        date: "2026-10-01",
        time: "10:30",
        services: "Մեզոթերապիա",
        doctorName: "Dr. Edgar",
        clinicName: "Dr. Edgar",
        discount: "10%",
        customMessage: "Սպասում ենք Ձեզ։"
      });
      expect(rendered).not.toMatch(/\{\{|\}\}/);
    }
  });
});

describe("rescheduleSms", () => {
  it("lists the offered slots in order", () => {
    const text = rescheduleSms([
      { date: "2026-10-01", startTime: "10:00", endTime: "11:00" },
      { date: "2026-10-02", startTime: "15:30", endTime: "16:30" }
    ]);
    expect(text).toContain("1. 2026-10-01 10:00-11:00");
    expect(text).toContain("2. 2026-10-02 15:30-16:30");
  });
});

describe("isDispatchAllowed (safety gate)", () => {
  const settings = createDefaultAppData().settings;

  it("log-only providers are always safe: mock SMS and demo WhatsApp/Viber/Telegram", () => {
    for (const channel of ["sms", "whatsapp", "viber", "telegram"] as const) {
      expect(isDispatchAllowed({ ...settings, smsAutoSendEnabled: false }, channel)).toBe(true);
    }
  });
});
