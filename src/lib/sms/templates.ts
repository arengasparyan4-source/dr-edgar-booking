import type { SmsTemplate, SmsTemplateVariables, SmsType } from "@/types/sms";

/**
 * Default clinic identity used when rendering templates. Kept as constants so
 * templates work out of the box; can be overridden per-message via variables.
 */
export const DEFAULT_DOCTOR_NAME = "Dr. Edgar";
export const DEFAULT_CLINIC_NAME = "Dr. Edgar";

/** Seed timestamp for default rows so createDefaultAppData stays deterministic. */
const SEED_TIMESTAMP = "2024-01-01T00:00:00.000Z";

/**
 * Default Armenian templates (the app is Armenian-first, matching the existing
 * booking SMS copy). Admins can edit the body later from /admin/sms.
 * Variables use {{name}} syntax and are optional — missing values render empty.
 */
const defaultTemplateSeeds: Array<Pick<SmsTemplate, "type" | "name" | "body">> = [
  {
    type: "booking_confirmation",
    name: "Հաստատման SMS",
    body:
      "Ձեր գրանցումը {{clinicName}}-ի մոտ հաստատված է {{date}}, ժամը {{time}}: Ծառայություններ՝ {{services}}: Խնդրում ենք հաշվի առնել, որ խորհրդատվության ընթացքում վերջնական պրոցեդուրան, գինը կամ տևողությունը կարող են փոփոխվել բժշկի առաջարկով:"
  },
  {
    type: "booking_reminder",
    name: "Հիշեցման SMS",
    body:
      "Հիշեցում՝ Դուք ունեք գրանցում {{doctorName}}-ի մոտ {{date}}, ժամը {{time}}:"
  },
  {
    type: "booking_cancelled",
    name: "Չեղարկման SMS",
    body:
      "Ձեր գրանցումը {{clinicName}}-ի մոտ {{date}} օրվա համար չեղարկվել է: Խնդրում ենք կապ հաստատել մեզ հետ՝ նոր հարմար ժամ ընտրելու համար:"
  },
  {
    type: "booking_rescheduled",
    name: "Ժամի փոփոխման SMS",
    body:
      "Ձեր գրանցումը {{clinicName}}-ի մոտ տեղափոխվել է {{date}}, ժամը {{time}}: {{customMessage}}"
  },
  {
    type: "birthday",
    name: "Ծննդյան SMS",
    body:
      "Շնորհավոր ծնունդդ: {{clinicName}} կլինիկան շնորհավորում է Ձեզ և առաջարկում հատուկ ծննդյան զեղչ {{discount}}:"
  },
  {
    type: "loyalty",
    name: "Լոյալության / առաջարկի SMS",
    body:
      "Հարգելի {{clientName}}, {{clinicName}} կլինիկան ունի հատուկ առաջարկ մշտական հաճախորդների համար: {{customMessage}}"
  }
];

export const createDefaultSmsTemplates = (): SmsTemplate[] =>
  defaultTemplateSeeds.map((seed) => ({
    id: `tmpl_${seed.type}`,
    type: seed.type,
    name: seed.name,
    language: "hy",
    body: seed.body,
    enabled: true,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  }));

const variablePattern = /\{\{\s*([a-zA-Z]+)\s*\}\}/g;

/**
 * Replace {{variables}} in a template body. Unknown or missing variables are
 * replaced with an empty string, and any resulting double spaces are collapsed
 * so the message reads cleanly even when optional fields are absent.
 */
export const renderTemplateBody = (
  body: string,
  variables: Partial<SmsTemplateVariables>
): string =>
  body
    .replace(variablePattern, (_match, name: string) => {
      const value = variables[name as keyof SmsTemplateVariables];
      return value === undefined || value === null ? "" : String(value);
    })
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();

export const AVAILABLE_TEMPLATE_VARIABLES: Array<keyof SmsTemplateVariables> = [
  "clientName",
  "phone",
  "date",
  "time",
  "services",
  "doctorName",
  "clinicName",
  "discount",
  "customMessage"
];

/** Types that map to an editable template shown in the admin UI. */
export const TEMPLATE_TYPES: SmsType[] = [
  "booking_confirmation",
  "booking_reminder",
  "booking_cancelled",
  "booking_rescheduled",
  "birthday",
  "loyalty"
];
