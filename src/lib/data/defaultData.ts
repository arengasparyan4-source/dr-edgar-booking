import { defaultServices } from "@/data/services";
import { createDefaultSmsTemplates } from "@/lib/sms/templates";
import type {
  AppData,
  BlockedTime,
  PortfolioItem,
  Settings,
  WorkingHours
} from "@/types/domain";

export const defaultWorkingHours: WorkingHours[] = [
  { dayOfWeek: 0, enabled: false, startTime: "10:00", endTime: "18:00", breaks: [] },
  {
    dayOfWeek: 1,
    enabled: true,
    startTime: "10:00",
    endTime: "19:00",
    breaks: [{ startTime: "13:00", endTime: "14:00" }]
  },
  {
    dayOfWeek: 2,
    enabled: true,
    startTime: "10:00",
    endTime: "19:00",
    breaks: [{ startTime: "13:00", endTime: "14:00" }]
  },
  {
    dayOfWeek: 3,
    enabled: true,
    startTime: "10:00",
    endTime: "19:00",
    breaks: [{ startTime: "13:00", endTime: "14:00" }]
  },
  {
    dayOfWeek: 4,
    enabled: true,
    startTime: "10:00",
    endTime: "19:00",
    breaks: [{ startTime: "13:00", endTime: "14:00" }]
  },
  {
    dayOfWeek: 5,
    enabled: true,
    startTime: "10:00",
    endTime: "18:00",
    breaks: [{ startTime: "13:00", endTime: "14:00" }]
  },
  { dayOfWeek: 6, enabled: true, startTime: "11:00", endTime: "16:00", breaks: [] }
];

export const defaultBlockedTimes: BlockedTime[] = [];

const portfolioTitles: Array<PortfolioItem["title"]> = [
  {
    hy: "Շուրթերի կորեկցիա",
    ru: "Коррекция губ",
    en: "Lip correction"
  },
  {
    hy: "Դեմքի լիֆտինգ",
    ru: "Лифтинг лица",
    en: "Face lifting"
  },
  {
    hy: "Մաշկի խնամք",
    ru: "Уход за кожей",
    en: "Skin care"
  },
  {
    hy: "Բոտուլինոթերապիա",
    ru: "Ботулинотерапия",
    en: "Botulinum therapy"
  },
  {
    hy: "Բիոռևիտալիզացիա",
    ru: "Биоревитализация",
    en: "Biorevitalization"
  },
  {
    hy: "UltraFormer",
    ru: "UltraFormer",
    en: "UltraFormer"
  },
  {
    hy: "Ֆիլերային մոդելավորում",
    ru: "Филлерное моделирование",
    en: "Filler modeling"
  },
  {
    hy: "Մեզոթերապիա",
    ru: "Мезотерапия",
    en: "Mesotherapy"
  },
  {
    hy: "Կոլագենոթերապիա",
    ru: "Коллагенотерапия",
    en: "Collagen therapy"
  }
];

export const defaultPortfolio: PortfolioItem[] = portfolioTitles.map((title, index) => ({
  id: `work-${index + 1}`,
  imageUrl: "/images/doctor.jpg",
  title,
  order: index + 1,
  active: true
}));

export const defaultSettings: Settings = {
  address: "Երևան, Սայաթ-Նովա 33",
  phone: "+37400000000",
  instagramUrl: "https://www.instagram.com/dr.edgar__/",
  googleCalendarId: "",
  telegramChatId: "",
  googleCalendarEnabled: false,
  bookingHorizonDays: 7,
  minBookingLeadMinutes: 60,
  smsAutoSendEnabled: false,
  smsReminderEnabled: true,
  smsReminderOffsets: [1],
  smsBirthdayAutoSendEnabled: false,
  aboutDoctor: {
    hy:
      "Dr. Edgar-ը համադրում է բժշկական փորձը, ժամանակակից կոսմետոլոգիական տեխնոլոգիաները և անհատական խորհրդատվությունը՝ յուրաքանչյուր այցը դարձնելով վստահելի, հանգիստ և պրեմիում փորձառություն։",
    ru:
      "Dr. Edgar сочетает медицинский опыт, современные косметологические технологии и персональную консультацию, чтобы каждый визит был спокойным, доверительным и премиальным.",
    en:
      "Dr. Edgar combines medical experience, modern aesthetic technologies, and individual consultation to make every visit calm, trusted, and premium."
  }
};

export const createDefaultAppData = (): AppData => ({
  services: defaultServices,
  bookings: [],
  clients: [],
  clientProcedureRecords: [],
  clientNotes: [],
  clientPhotos: [],
  workingHours: defaultWorkingHours,
  blockedTimes: defaultBlockedTimes,
  portfolio: defaultPortfolio,
  settings: defaultSettings,
  smsTemplates: createDefaultSmsTemplates(),
  smsQueue: [],
  smsLogs: []
});
