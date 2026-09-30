import { addDays, getDayOfWeek, minutesFromTime, timeFromMinutes } from "@/lib/availability/time";
import type { Interval } from "@/lib/availability/time";
import { renderTemplateBody, DEFAULT_CLINIC_NAME, DEFAULT_DOCTOR_NAME } from "@/lib/sms/templates";
import { clinicToUtc, nowInClinic } from "@/lib/time/clinicTime";
import type {
  AppData,
  BlockedTime,
  Booking,
  BookingStatus,
  Client,
  ClientNote,
  ClientPhoto,
  ClientPhotoCategory,
  ClientProcedureRecord,
  ClientProcedureUnit,
  ClientStatus,
  MessageChannel,
  Service
} from "@/types/domain";
import type { SmsLog, SmsQueueItem, SmsStatus, SmsType } from "@/types/sms";

/**
 * Demo data for the public showcase: 30 made-up clients with three months of
 * history and two weeks of upcoming bookings. Every name, phone number
 * (+37477000001 ... +37477000030) and e-mail (example.com) is invented.
 *
 * Pure and deterministic: the same `now` gives the same data, so
 * `npm run demo:setup` can be re-run and the tests can check the numbers.
 * Nothing here talks to Telegram, Google or an SMS gateway.
 */

export type DemoProfile =
  | "vip"
  | "regular"
  | "occasional"
  | "new"
  | "sleeping"
  | "lost"
  | "blacklist";

type DemoClientSeed = {
  firstName: string;
  lastName: string;
  profile: DemoProfile;
  channel: MessageChannel;
  birthDate?: string;
  email?: string;
  address?: string;
  comment?: string;
  discount?: number;
  balance?: number;
  /** Keys of DEMO_NOTES. */
  notes?: NoteKey[];
  /** Preferred services, first is the most frequent. */
  services: string[];
};

/** Phones are clearly fake: +374 77 000 0NN. */
export const demoPhone = (index: number) => `+37477${String(index + 1).padStart(6, "0")}`;

export const DEMO_CLIENTS: DemoClientSeed[] = [
  // Regulars with frequent visits; the first three carry a VIP mark.
  { firstName: "Անի", lastName: "Սարգսյան", profile: "vip", channel: "whatsapp", birthDate: "1988-03-14", email: "ani.sargsyan@example.com", address: "Երևան, Արաբկիր", discount: 10, comment: "Մշտական հաճախորդ, նախընտրում է առավոտյան ժամերը։", notes: ["sensitiveSkin", "happy"], services: ["botox-face", "bio-face", "lip-filler"] },
  { firstName: "Լիլիթ", lastName: "Հովհաննիսյան", profile: "vip", channel: "telegram", birthDate: "1985-11-02", discount: 10, notes: ["allergyLidocaine", "spf"], services: ["bio-face", "collagen-therapy", "botox-face"] },
  { firstName: "Ольга", lastName: "Смирнова", profile: "vip", channel: "viber", birthDate: "1979-06-21", email: "olga.smirnova@example.com", discount: 10, notes: ["botoxInterval"], services: ["ultraformer-face", "botox-face", "collagen-therapy"] },
  { firstName: "Mariam", lastName: "Grigoryan", profile: "vip", channel: "sms", birthDate: "1992-09-27", address: "Երևան, Կենտրոն", notes: ["eveningHours"], services: ["lip-filler", "mesotherapy", "bio-face"] },
  // Regular clients: a visit every three to four weeks.
  { firstName: "Артём", lastName: "Гаспарян", profile: "regular", channel: "telegram", birthDate: "1990-01-18", notes: ["eveningHours"], services: ["mesotherapy", "consultation-primary"] },
  { firstName: "Նարեկ", lastName: "Պետրոսյան", profile: "regular", channel: "sms", services: ["botox-face", "mesotherapy"] },
  { firstName: "Սոնա", lastName: "Մկրտչյան", profile: "regular", channel: "whatsapp", birthDate: "1994-04-30", notes: ["swelling"], services: ["lip-filler", "bio-face"] },
  { firstName: "Գայանե", lastName: "Ավետիսյան", profile: "regular", channel: "viber", balance: 15000, services: ["bio-face", "mesotherapy"] },
  { firstName: "Tatevik", lastName: "Harutyunyan", profile: "regular", channel: "whatsapp", email: "tatevik.h@example.com", notes: ["spf"], services: ["mesotherapy", "bio-face"] },
  { firstName: "Елена", lastName: "Кузнецова", profile: "regular", channel: "telegram", birthDate: "1983-12-08", notes: ["anticoagulants"], services: ["collagen-therapy", "bio-face"] },
  { firstName: "Արմինե", lastName: "Վարդանյան", profile: "regular", channel: "sms", services: ["botox-face", "bio-face"] },
  { firstName: "Нарине", lastName: "Акопян", profile: "regular", channel: "viber", notes: ["happy"], services: ["ultraformer-face", "mesotherapy"] },
  // Occasional visits.
  { firstName: "Կարինե", lastName: "Մարտիրոսյան", profile: "occasional", channel: "sms", services: ["mesotherapy", "consultation-primary"] },
  { firstName: "Hasmik", lastName: "Sahakyan", profile: "occasional", channel: "whatsapp", services: ["bio-face"] },
  { firstName: "Анна", lastName: "Морозова", profile: "occasional", channel: "telegram", notes: ["pregnancyPlan"], services: ["consultation-primary", "mesotherapy"] },
  { firstName: "Մանե", lastName: "Բաղդասարյան", profile: "occasional", channel: "sms", balance: 20000, services: ["lip-filler"] },
  { firstName: "Դավիթ", lastName: "Հակոբյան", profile: "occasional", channel: "viber", services: ["botox-face"] },
  // New clients: created in the last weeks.
  { firstName: "Սյուզաննա", lastName: "Ղազարյան", profile: "new", channel: "whatsapp", notes: ["firstVisit"], services: ["consultation-primary", "mesotherapy"] },
  { firstName: "Ева", lastName: "Минасян", profile: "new", channel: "telegram", services: ["consultation-primary", "bio-face"] },
  { firstName: "Էլեն", lastName: "Աբրահամյան", profile: "new", channel: "sms", notes: ["lipsWish"], services: ["consultation-primary", "lip-filler"] },
  { firstName: "Irina", lastName: "Volkova", profile: "new", channel: "viber", services: ["consultation-primary", "botox-face"] },
  { firstName: "Շուշան", lastName: "Դանիելյան", profile: "new", channel: "sms", services: ["consultation-primary"] },
  // No visit for half a year: worth a call.
  { firstName: "Ռուզաննա", lastName: "Ստեփանյան", profile: "sleeping", channel: "sms", notes: ["callBack"], services: ["bio-face"] },
  { firstName: "Gohar", lastName: "Simonyan", profile: "sleeping", channel: "whatsapp", services: ["mesotherapy"] },
  { firstName: "Наталья", lastName: "Соколова", profile: "sleeping", channel: "telegram", birthDate: "1976-08-05", services: ["botox-face"] },
  { firstName: "Աննա", lastName: "Գևորգյան", profile: "sleeping", channel: "viber", services: ["collagen-therapy"] },
  // No visit for more than a year.
  { firstName: "Մարինե", lastName: "Խաչատրյան", profile: "lost", channel: "sms", notes: ["moved"], services: ["lip-filler"] },
  { firstName: "Лусине", lastName: "Оганесян", profile: "lost", channel: "whatsapp", services: ["bio-face"] },
  // Blacklist: repeated no-shows.
  { firstName: "Վահե", lastName: "Առաքելյան", profile: "blacklist", channel: "sms", notes: ["noShows"], services: ["botox-face"] },
  { firstName: "Arsen", lastName: "Manukyan", profile: "blacklist", channel: "telegram", notes: ["noShows"], services: ["mesotherapy"] }
];

type NoteKey =
  | "allergyLidocaine"
  | "sensitiveSkin"
  | "eveningHours"
  | "swelling"
  | "spf"
  | "botoxInterval"
  | "pregnancyPlan"
  | "noShows"
  | "happy"
  | "anticoagulants"
  | "callBack"
  | "moved"
  | "firstVisit"
  | "lipsWish";

/** Short doctor's notes, in Armenian as the doctor writes them. */
const DEMO_NOTES: Record<NoteKey, { text: string; pinned?: boolean }> = {
  allergyLidocaine: { text: "Ալերգիա լիդոկաինի նկատմամբ։ Ցավազրկումը՝ միայն սառը կոմպրեսով։", pinned: true },
  sensitiveSkin: { text: "Մաշկը զգայուն է, հակված է կարմրության։ Խուսափել սպիրտ պարունակող միջոցներից։" },
  eveningHours: { text: "Նախընտրում է երեկոյան ժամերը՝ աշխատանքից հետո։" },
  swelling: { text: "Պրոցեդուրայից հետո թեթև այտուց, անցավ երկու օրում։ Բարդություններ չկան։" },
  spf: { text: "Առաջարկված է ամեն օր օգտագործել SPF 50, հատկապես ամռանը։" },
  botoxInterval: { text: "Հաջորդ բոտուլինոթերապիան՝ չորս ամսից ոչ շուտ։" },
  pregnancyPlan: { text: "Հղիություն է պլանավորում։ Ներարկային պրոցեդուրաները հետաձգել։", pinned: true },
  noShows: { text: "Երկու անգամ չի ներկայացել՝ առանց նախազգուշացնելու։ Գրանցել միայն կանխավճարով։", pinned: true },
  happy: { text: "Արդյունքից շատ գոհ է, մեզ խորհուրդ է տվել ընկերուհուն։" },
  anticoagulants: { text: "Ընդունում է հակամակարդիչներ։ Ներարկումներից առաջ ճշտել թերապևտի հետ։", pinned: true },
  callBack: { text: "Զանգահարել և առաջարկել բիորևիտալիզացիայի կրկնակի կուրս։" },
  moved: { text: "Տեղափոխվել է այլ քաղաք, այցերը՝ հազվադեպ։" },
  firstVisit: { text: "Առաջին այց։ Մաշկի տիպը՝ համակցված, կան պիգմենտային բծեր։ Առաջարկված է մեզոթերապիայի կուրս։" },
  lipsWish: { text: "Հարցնում էր շուրթերի կորեկցիայի մասին, ցանկանում է բնական արդյունք։" }
};

type ProcedureTemplate = {
  preparationName?: string;
  preparationType?: string;
  amount?: string;
  unit?: ClientProcedureUnit;
  area: string;
  notes: string[];
};

/** How the doctor records each service: preparation, dose, area and remarks. */
const PROCEDURE_TEMPLATES: Record<string, ProcedureTemplate> = {
  "lip-filler": {
    preparationName: "Juvederm Volbella",
    preparationType: "Հիալուրոնաթթվային ֆիլեր",
    amount: "1",
    unit: "ml",
    area: "Շուրթեր",
    notes: [
      "Կոնտուրի և ծավալի նուրբ շտկում, ասիմետրիան հարթեցված է։",
      "Թեթև այտուց, անցավ երեք օրում։ Վերահսկողական այց՝ երկու շաբաթից։"
    ]
  },
  "botox-face": {
    preparationName: "Botox (Allergan)",
    preparationType: "Բոտուլինային տոքսին",
    amount: "32",
    unit: "unit",
    area: "Ճակատ, քթարմատ, աչքերի արտաքին անկյուններ",
    notes: [
      "Միմիկան պահպանված է։ Չորս ժամ չպառկել և չմերսել դեմքը։",
      "Ռեակցիա չի եղել։ Վերահսկողական այց՝ 14 օրից։"
    ]
  },
  "bio-face": {
    preparationName: "Profhilo",
    preparationType: "Բիորևիտալիզանտ",
    amount: "2",
    unit: "ml",
    area: "Դեմք, պարանոց",
    notes: [
      "Կուրսի առաջին պրոցեդուրան, հաջորդը՝ չորս շաբաթից։",
      "Մաշկը ավելի խոնավ է և փայլուն։ Պապուլներն անցան մեկ օրում։"
    ]
  },
  "collagen-therapy": {
    preparationName: "Collost 7%",
    preparationType: "Կոլագենային գել",
    amount: "1.5",
    unit: "ml",
    area: "Աչքերի շրջան",
    notes: ["Մաշկի խտությունը նկատելիորեն լավացել է։", "Թեթև կապտուկ ներարկման տեղում, անցավ երեք օրում։"]
  },
  mesotherapy: {
    preparationName: "Hyalual 1.1%",
    preparationType: "Մեզոկոկտեյլ",
    amount: "2",
    unit: "ml",
    area: "Դեմք",
    notes: [
      "Թեթև կարմրություն, անցավ նույն օրը։",
      "Առաջարկված է երեք պրոցեդուրայի կուրս՝ երկու շաբաթ ընդմիջումով։"
    ]
  },
  "ultraformer-face": {
    area: "Դեմքի օվալ, ենթակզակային շրջան",
    notes: ["Ցավազրկող քսուք՝ 30 րոպե առաջ։ Վերջնական արդյունքը՝ երկու-երեք ամսում։"]
  },
  "consultation-primary": {
    area: "Դեմք",
    notes: [
      "Մաշկի տիպը՝ համակցված։ Առաջարկված է բիորևիտալիզացիայի կուրս։",
      "Քննարկվել են ցուցումներն ու հակացուցումները, պլանը համաձայնեցված է։"
    ]
  }
};

/** Comments clients leave in the online form. */
const BOOKING_COMMENTS = [
  "Կցանկանայի նախ խորհրդատվություն ստանալ։",
  "Առաջին անգամ եմ գալիս։",
  "Можно ближе к вечеру?",
  "Եթե հնարավոր է, առավոտյան ժամերին։"
];

const DOCTOR = "Dr. Edgar";

export type DemoPhotoFile = {
  fileName: string;
  /** Picks the colours of the generated abstract picture. */
  seed: number;
  kind: "texture" | "document";
};

export type DemoDataResult = {
  data: AppData;
  photoFiles: DemoPhotoFile[];
};

/** Small deterministic PRNG (mulberry32). */
const createRandom = (seed: number) => {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability: number) => next() < probability,
    pick: <T>(items: T[]) => items[Math.floor(next() * items.length)]
  };
};

type PlannedVisit = {
  client: Client;
  seed: DemoClientSeed;
  /** Days from today; negative is the past. */
  offset: number;
  kind: "visit" | "cancelled" | "no_show" | "reschedule";
  serviceIds: string[];
};

const iso = (date: string, time: string) => clinicToUtc(date, time).toISOString();

export function buildDemoData(base: AppData, now: Date = new Date()): DemoDataResult {
  const random = createRandom(20260930);
  const clinicNow = nowInClinic(now);
  const today = clinicNow.date;
  const nowIso = now.toISOString();
  const services = new Map(base.services.map((service) => [service.id, service]));
  const fallbackService = base.services.find((service) => service.active) ?? base.services[0];
  const serviceFor = (id: string): Service => services.get(id) ?? fallbackService;

  // A half-day off for a seminar, so the calendar shows a blocked period.
  let seminarDate = addDays(today, 9);
  while (!isWorkingDay(base, seminarDate)) {
    seminarDate = addDays(seminarDate, 1);
  }
  const blockedTimes: BlockedTime[] = [
    ...base.blockedTimes.filter((item) => !item.id.startsWith("blocked_demo_")),
    {
      id: "blocked_demo_seminar",
      date: seminarDate,
      startTime: "14:00",
      endTime: "19:00",
      reason: "Մասնագիտական սեմինար"
    }
  ];

  // ---- clients -----------------------------------------------------------
  const clients: Client[] = DEMO_CLIENTS.map((seed, index) => {
    const statusByProfile: Record<DemoProfile, ClientStatus> = {
      vip: "active",
      regular: "active",
      occasional: "active",
      new: "new",
      sleeping: "active",
      lost: "active",
      blacklist: "blacklist"
    };
    const createdDaysAgo: Record<DemoProfile, number> = {
      vip: random.int(500, 900),
      regular: random.int(200, 600),
      occasional: random.int(120, 400),
      new: random.int(3, 18),
      sleeping: random.int(400, 700),
      lost: random.int(600, 900),
      blacklist: random.int(100, 150)
    };
    const createdDate = addDays(today, -createdDaysAgo[seed.profile]);
    const phone = demoPhone(index);

    return {
      id: `client_demo_${String(index + 1).padStart(2, "0")}`,
      fullName: `${seed.firstName} ${seed.lastName}`,
      firstName: seed.firstName,
      lastName: seed.lastName,
      phone,
      normalizedPhone: phone,
      comment: seed.comment,
      balance: seed.balance,
      discount: seed.discount,
      birthDate: seed.birthDate,
      email: seed.email,
      address: seed.address,
      status: statusByProfile[seed.profile],
      isVip: seed.profile === "vip" && index < 3,
      isBlacklisted: seed.profile === "blacklist",
      source: seed.profile === "new" || seed.profile === "occasional" ? "booking" : "excel",
      visitsCount: 0,
      preferredChannel: seed.channel,
      createdAt: iso(createdDate, "12:00"),
      updatedAt: nowIso
    };
  });

  // Visits before the three-month window ("imported history"): only counted
  // in visitsCount / lastVisitDate, like clients imported from Excel.
  const history = new Map<string, { visits: number; lastDate?: string }>();

  // ---- visit plan ----------------------------------------------------------
  const plan: PlannedVisit[] = [];
  const add = (
    client: Client,
    seed: DemoClientSeed,
    offset: number,
    kind: PlannedVisit["kind"] = "visit",
    serviceIds?: string[]
  ) => {
    const visitNumber = plan.filter((visit) => visit.client.id === client.id).length;
    const main = seed.services[visitNumber % seed.services.length];
    const ids =
      serviceIds ??
      (random.chance(0.15) && main !== "consultation-primary"
        ? ["consultation-primary", main]
        : [main]);
    plan.push({ client, seed, offset, kind, serviceIds: ids });
  };

  DEMO_CLIENTS.forEach((seed, index) => {
    const client = clients[index];

    switch (seed.profile) {
      case "vip": {
        history.set(client.id, { visits: random.int(8, 14), lastDate: addDays(today, -random.int(100, 125)) });
        for (let offset = -random.int(84, 90); offset < -2; offset += random.int(12, 16)) {
          add(client, seed, offset, random.chance(0.15) ? "cancelled" : "visit");
        }
        add(client, seed, random.int(0, 6));
        if (random.chance(0.6)) {
          add(client, seed, random.int(8, 13));
        }
        break;
      }
      case "regular": {
        history.set(client.id, { visits: random.int(2, 6), lastDate: addDays(today, -random.int(95, 140)) });
        for (let offset = -random.int(80, 90); offset < -3; offset += random.int(22, 30)) {
          add(client, seed, offset, random.chance(0.18) ? "cancelled" : "visit");
        }
        add(client, seed, random.int(0, 13), random.chance(0.12) ? "cancelled" : "visit");
        break;
      }
      case "occasional": {
        history.set(client.id, { visits: random.int(1, 3), lastDate: addDays(today, -random.int(150, 170)) });
        add(client, seed, -random.int(20, 85));
        if (random.chance(0.5)) {
          add(client, seed, random.int(1, 13));
        }
        break;
      }
      case "new": {
        const createdDaysAgo = Math.round((now.getTime() - Date.parse(client.createdAt)) / 86_400_000);
        if (createdDaysAgo > 6 && random.chance(0.6)) {
          add(client, seed, -random.int(1, createdDaysAgo - 2), "visit", ["consultation-primary"]);
        }
        add(client, seed, random.int(1, 13));
        break;
      }
      case "sleeping": {
        history.set(client.id, { visits: random.int(2, 4), lastDate: addDays(today, -random.int(200, 330)) });
        if (random.chance(0.4)) {
          add(client, seed, -random.int(30, 80), "cancelled");
        }
        break;
      }
      case "lost": {
        history.set(client.id, { visits: random.int(1, 3), lastDate: addDays(today, -random.int(400, 560)) });
        break;
      }
      case "blacklist": {
        history.set(client.id, { visits: 0 });
        add(client, seed, -random.int(80, 88));
        add(client, seed, -random.int(45, 55), "no_show");
        add(client, seed, -random.int(15, 25), "no_show");
        break;
      }
    }
  });

  // A few no-shows and a reschedule request among the regulars.
  const regulars = plan.filter((visit) => visit.seed.profile === "regular");
  regulars.filter((visit) => visit.offset < -5 && visit.kind === "visit").slice(0, 2).forEach((visit) => {
    visit.kind = "no_show";
  });
  const upcomingRegular = regulars.find((visit) => visit.offset >= 2 && visit.kind === "visit");
  if (upcomingRegular) {
    upcomingRegular.kind = "reschedule";
  }

  // Keep the next two weeks and today busy enough to look like a real diary.
  const activePool = clients.filter((_, index) =>
    ["vip", "regular", "occasional", "new"].includes(DEMO_CLIENTS[index].profile)
  );
  for (let offset = 0; offset <= 13; offset += 1) {
    const date = addDays(today, offset);
    if (!isWorkingDay(base, date)) {
      continue;
    }
    const wanted = offset === 0 ? 5 : 4;
    let count = plan.filter((visit) => visit.offset === offset).length;
    let guard = 0;
    while (count < wanted && guard < 20) {
      guard += 1;
      const client = random.pick(activePool);
      if (plan.some((visit) => visit.client.id === client.id && visit.offset === offset)) {
        continue;
      }
      add(client, DEMO_CLIENTS[clients.indexOf(client)], offset, random.chance(0.1) ? "cancelled" : "visit");
      count += 1;
    }
  }

  // ---- bookings ------------------------------------------------------------
  const occupied = new Map<string, Interval[]>();
  const bookings: Booking[] = [];

  plan.sort((a, b) => a.offset - b.offset || a.client.id.localeCompare(b.client.id));
  plan.forEach((visit, index) => {
    const selected = visit.serviceIds.map(serviceFor);
    const duration = selected.reduce((sum, service) => sum + service.durationMinutes, 0);
    const placed = placeVisit(base, blockedTimes, occupied, random, today, visit.offset, duration);
    if (!placed) {
      return;
    }

    const { date, start } = placed;
    const startTime = timeFromMinutes(start);
    const endTime = timeFromMinutes(start + duration);
    // Today's visits that have already started are confirmed (or finished).
    const inPast = date < today || (date === today && start + duration <= clinicNow.minutes);
    const started = date === today && start <= clinicNow.minutes;
    const status =
      started && !inPast && visit.kind === "visit"
        ? "confirmed"
        : bookingStatusFor(visit.kind, inPast, visit.seed.profile, random);
    const createdDate = addDays(date, -random.int(2, 9));
    const createdAt = new Date(
      Math.min(Date.parse(iso(createdDate, "10:15")), now.getTime() - 3_600_000)
    ).toISOString();
    const confirmedAt =
      status === "pending"
        ? undefined
        : new Date(Math.min(Date.parse(createdAt) + 2 * 3_600_000, now.getTime())).toISOString();
    const finishedAt = iso(date, endTime);

    bookings.push({
      id: `booking_demo_${String(index + 1).padStart(3, "0")}`,
      clientId: visit.client.id,
      firstName: visit.client.firstName ?? "",
      lastName: visit.client.lastName ?? "",
      phone: visit.client.normalizedPhone,
      selectedServiceIds: selected.map((service) => service.id),
      servicesSnapshot: selected,
      totalDurationMinutes: duration,
      totalPrice: selected.reduce((sum, service) => sum + service.price, 0),
      date,
      startTime,
      endTime,
      comment:
        visit.client.source === "booking" && random.chance(0.35)
          ? random.pick(BOOKING_COMMENTS)
          : "",
      status,
      createdAt,
      updatedAt: status === "completed" || status === "no_show" ? finishedAt : confirmedAt ?? createdAt,
      confirmedAt,
      cancelledAt:
        status === "cancelled"
          ? new Date(Math.min(Date.parse(iso(addDays(date, -1), "18:00")), now.getTime())).toISOString()
          : undefined,
      completedAt: status === "completed" ? finishedAt : undefined,
      noShowAt: status === "no_show" ? finishedAt : undefined,
      preferredChannel: visit.client.preferredChannel
    });
  });
  bookings.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));

  // ---- visit counters --------------------------------------------------------
  for (const client of clients) {
    const own = bookings.filter((booking) => booking.clientId === client.id);
    const completedDates = own.filter((booking) => booking.status === "completed").map((b) => b.date);
    const past = history.get(client.id) ?? { visits: 0 };
    const lastDates = [past.lastDate, ...completedDates].filter((value): value is string => Boolean(value)).sort();
    const upcoming = own
      .filter((booking) => ["pending", "confirmed", "reschedule_requested"].includes(booking.status))
      .map((booking) => booking.date)
      .sort();

    client.visitsCount = past.visits + completedDates.length;
    client.lastVisitDate = lastDates.at(-1);
    client.nextBookingDate = upcoming[0];
    // The client existed before their first booking request.
    const firstCreated = own.map((booking) => booking.createdAt).sort()[0];
    if (firstCreated && firstCreated < client.createdAt) {
      client.createdAt = new Date(Date.parse(firstCreated) - 86_400_000).toISOString();
    }
  }

  // ---- procedures, notes, photos ---------------------------------------------
  const procedures: ClientProcedureRecord[] = [];
  const addProcedure = (client: Client, date: string, serviceId: string, bookingId?: string, price?: number) => {
    const service = serviceFor(serviceId);
    const template = PROCEDURE_TEMPLATES[service.id] ?? PROCEDURE_TEMPLATES["consultation-primary"];
    const stamp = iso(date, "19:30");
    const record: ClientProcedureRecord = {
      id: `procedure_demo_${String(procedures.length + 1).padStart(3, "0")}`,
      clientId: client.id,
      date,
      serviceName: service.name.hy,
      serviceId: service.id,
      preparationName: template.preparationName,
      preparationType: template.preparationType,
      amount: template.amount,
      unit: template.unit,
      area: template.area,
      price: price ?? service.price,
      currency: "AMD",
      doctorNotes: random.pick(template.notes),
      bookingId,
      createdAt: stamp,
      updatedAt: stamp
    };
    procedures.push(record);
    return record;
  };

  for (const booking of bookings) {
    if (booking.status !== "completed" || !booking.clientId || !random.chance(0.7)) {
      continue;
    }
    const client = clients.find((item) => item.id === booking.clientId)!;
    for (const service of booking.servicesSnapshot) {
      addProcedure(client, booking.date, service.id, booking.id, service.price);
    }
  }
  // Older procedures for clients who have not been back for a while.
  DEMO_CLIENTS.forEach((seed, index) => {
    const lastDate = history.get(clients[index].id)?.lastDate;
    if ((seed.profile === "sleeping" || seed.profile === "lost") && lastDate) {
      addProcedure(clients[index], lastDate, seed.services[0]);
    }
  });
  procedures.sort((a, b) => b.date.localeCompare(a.date));

  const notes: ClientNote[] = [];
  DEMO_CLIENTS.forEach((seed, index) => {
    const client = clients[index];
    (seed.notes ?? []).forEach((key, noteIndex) => {
      const note = DEMO_NOTES[key];
      const lastVisit = client.lastVisitDate && client.lastVisitDate <= today ? client.lastVisitDate : undefined;
      const date = lastVisit ? addDays(lastVisit, -noteIndex * 21) : addDays(today, -1);
      const stamp = iso(date, "20:00");
      notes.push({
        id: `note_demo_${String(notes.length + 1).padStart(3, "0")}`,
        clientId: client.id,
        text: note.text,
        author: DOCTOR,
        pinned: Boolean(note.pinned),
        date,
        createdAt: stamp,
        updatedAt: stamp
      });
    });
  });

  // Before/after pictures for a few visual procedures, plus one consent form.
  const photos: ClientPhoto[] = [];
  const photoFiles: DemoPhotoFile[] = [];
  const addPhoto = (
    client: Client,
    date: string,
    category: ClientPhotoCategory,
    comment: string,
    kind: DemoPhotoFile["kind"],
    procedure?: ClientProcedureRecord
  ) => {
    const number = String(photos.length + 1).padStart(2, "0");
    const id = `photo_demo_${number}`;
    const fileName = `${client.id}_demo_${number}.png`;
    const stamp = iso(date, "20:10");
    photoFiles.push({ fileName, seed: photos.length + 1, kind });
    photos.push({
      id,
      clientId: client.id,
      url: `/api/admin/clients/${encodeURIComponent(client.id)}/photos/${encodeURIComponent(id)}/file`,
      fileName,
      originalName: `demo-${category}-${number}.png`,
      mimeType: "image/png",
      size: 0,
      category,
      procedureId: procedure?.id,
      bookingId: procedure?.bookingId,
      date,
      comment,
      createdAt: stamp,
      updatedAt: stamp
    });
  };
  const photoProcedures = procedures
    .filter((record) => ["lip-filler", "bio-face", "ultraformer-face", "collagen-therapy"].includes(record.serviceId ?? ""))
    .filter((record, index, list) => list.findIndex((item) => item.clientId === record.clientId) === index)
    .slice(0, 5);
  for (const record of photoProcedures) {
    const client = clients.find((item) => item.id === record.clientId)!;
    addPhoto(client, record.date, "before", "Մինչև պրոցեդուրան", "texture", record);
    addPhoto(client, addDays(record.date, 14) <= today ? addDays(record.date, 14) : record.date, "after", "Պրոցեդուրայից երկու շաբաթ անց", "texture", record);
  }
  addPhoto(clients[1], clients[1].lastVisitDate ?? today, "document", "Տեղեկացված համաձայնության ձև", "document");

  // ---- messages --------------------------------------------------------------
  const { queue, logs } = buildDemoMessages(base, clients, bookings, today, now, random);

  return {
    data: {
      ...base,
      blockedTimes,
      clients,
      bookings,
      clientProcedureRecords: procedures,
      clientNotes: notes,
      clientPhotos: photos,
      smsQueue: queue,
      smsLogs: logs
    },
    photoFiles
  };
}

function bookingStatusFor(
  kind: PlannedVisit["kind"],
  inPast: boolean,
  profile: DemoProfile,
  random: ReturnType<typeof createRandom>
): BookingStatus {
  if (kind === "cancelled") {
    return "cancelled";
  }
  if (inPast) {
    return kind === "no_show" ? "no_show" : "completed";
  }
  if (kind === "reschedule") {
    return "reschedule_requested";
  }
  if (profile === "new") {
    return random.chance(0.6) ? "pending" : "confirmed";
  }
  return random.chance(0.75) ? "confirmed" : "pending";
}

const isWorkingDay = (data: AppData, date: string) =>
  Boolean(data.workingHours.find((day) => day.dayOfWeek === getDayOfWeek(date))?.enabled);

/** Working intervals of a day: hours minus breaks and blocked times. */
function freeWindows(data: AppData, blockedTimes: BlockedTime[], date: string): Interval[] {
  const day = data.workingHours.find((item) => item.dayOfWeek === getDayOfWeek(date));
  if (!day?.enabled) {
    return [];
  }

  let windows: Interval[] = [{ start: minutesFromTime(day.startTime), end: minutesFromTime(day.endTime) }];
  const cuts = [
    ...day.breaks,
    ...blockedTimes.filter((item) => item.date === date)
  ].map((item) => ({ start: minutesFromTime(item.startTime), end: minutesFromTime(item.endTime) }));

  for (const cut of cuts) {
    windows = windows.flatMap((window) =>
      window.start < cut.end && cut.start < window.end
        ? [
            { start: window.start, end: Math.min(window.end, cut.start) },
            { start: Math.max(window.start, cut.end), end: window.end }
          ].filter((piece) => piece.start < piece.end)
        : [window]
    );
  }

  return windows;
}

/**
 * Finds a free start on a 30-minute grid, trying the planned day first and
 * then the neighbouring days on the same side of today. Visits never overlap
 * each other, breaks or blocked times.
 */
function placeVisit(
  data: AppData,
  blockedTimes: BlockedTime[],
  occupied: Map<string, Interval[]>,
  random: ReturnType<typeof createRandom>,
  today: string,
  offset: number,
  duration: number
): { date: string; start: number } | null {
  const tries = [0, 1, -1, 2, -2, 3, -3, 4, -4];

  for (const shift of tries) {
    const dayOffset = offset + shift;
    // Stay within the demo window and on the planned side of today.
    if (dayOffset > 13 || dayOffset < -92 || (offset < 0 && dayOffset > 0) || (offset >= 0 && dayOffset < 0)) {
      continue;
    }
    const date = addDays(today, dayOffset);
    const taken = occupied.get(date) ?? [];
    const candidates: number[] = [];

    for (const window of freeWindows(data, blockedTimes, date)) {
      for (let start = window.start; start + duration <= window.end; start += 30) {
        const end = start + duration;
        if (taken.some((item) => item.start < end && start < item.end)) {
          continue;
        }
        candidates.push(start);
      }
    }

    if (candidates.length > 0) {
      const start = random.pick(candidates);
      occupied.set(date, [...taken, { start, end: start + duration }]);
      return { date, start };
    }
  }

  return null;
}

function buildDemoMessages(
  base: AppData,
  clients: Client[],
  bookings: Booking[],
  today: string,
  now: Date,
  random: ReturnType<typeof createRandom>
) {
  const queue: SmsQueueItem[] = [];
  const logs: SmsLog[] = [];
  const nowMs = now.getTime();
  const templateBody = (type: SmsType) =>
    base.smsTemplates.find((template) => template.type === type && template.enabled)?.body ?? "";
  const clientById = new Map(clients.map((client) => [client.id, client]));
  const providerFor = (channel: MessageChannel) => (channel === "sms" ? "mock" : `${channel}-demo`);

  const addMessage = (
    type: SmsType,
    client: Client,
    booking: Booking | undefined,
    scheduledAt: string,
    status: SmsStatus,
    extra: { customMessage?: string; discount?: string; error?: string } = {}
  ) => {
    const channel = client.preferredChannel ?? "sms";
    const message = renderTemplateBody(templateBody(type), {
      clientName: client.fullName,
      phone: client.normalizedPhone,
      date: booking?.date ?? "",
      time: booking?.startTime ?? "",
      services: booking?.servicesSnapshot.map((service) => service.name.hy).join(", ") ?? "",
      doctorName: DEFAULT_DOCTOR_NAME,
      clinicName: DEFAULT_CLINIC_NAME,
      discount: extra.discount ?? "",
      customMessage: extra.customMessage ?? ""
    });
    const number = String(queue.length + 1).padStart(3, "0");
    const done = status === "sent" || status === "failed";
    const item: SmsQueueItem = {
      id: `sms_demo_${number}`,
      type,
      channel,
      clientId: client.id,
      bookingId: booking?.id,
      phone: client.normalizedPhone,
      message,
      scheduledAt,
      status,
      attempts: done ? 1 : 0,
      lastError: extra.error,
      providerMessageId: status === "sent" ? `demo_${number}` : undefined,
      createdAt: new Date(Math.min(Date.parse(scheduledAt), nowMs) - 60_000).toISOString(),
      updatedAt: new Date(Math.min(Date.parse(scheduledAt), nowMs)).toISOString(),
      sentAt: status === "sent" ? scheduledAt : undefined
    };
    queue.push(item);

    if (done || status === "skipped") {
      logs.push({
        id: `smslog_demo_${number}`,
        queueItemId: item.id,
        type,
        channel,
        clientId: client.id,
        bookingId: booking?.id,
        phone: client.normalizedPhone,
        message,
        status,
        provider: providerFor(channel),
        providerResponse:
          status === "sent"
            ? channel === "sms"
              ? "logged by mock provider (no real SMS sent)"
              : `demo: ${channel} is not connected, message only logged`
            : undefined,
        error: extra.error,
        createdAt: scheduledAt
      });
    }
  };

  const recent = bookings.filter((booking) => booking.date >= addDays(today, -30));
  for (const booking of recent) {
    const client = booking.clientId ? clientById.get(booking.clientId) : undefined;
    if (!client || !booking.confirmedAt) {
      continue;
    }
    if (client.isBlacklisted) {
      addMessage("booking_confirmation", client, booking, booking.confirmedAt, "skipped", {
        error: "Client is blacklisted"
      });
      continue;
    }

    const failed = random.chance(0.05);
    addMessage("booking_confirmation", client, booking, booking.confirmedAt, failed ? "failed" : "sent", {
      error: failed ? "Delivery failed: subscriber unavailable (demo data)" : undefined
    });

    const reminderAt = clinicToUtc(addDays(booking.date, -1), "09:00").toISOString();
    if (booking.status === "cancelled") {
      addMessage("booking_cancelled", client, booking, booking.cancelledAt ?? booking.confirmedAt, "sent");
      if (Date.parse(reminderAt) > nowMs) {
        addMessage("booking_reminder", client, booking, reminderAt, "cancelled");
      }
    } else if (booking.status !== "pending" && booking.status !== "reschedule_requested") {
      addMessage("booking_reminder", client, booking, reminderAt, Date.parse(reminderAt) <= nowMs ? "sent" : "scheduled");
    }
  }

  // Birthday greeting and a loyalty offer for the VIP clients.
  const birthdayClient = clients.find((client) => client.birthDate && client.isVip);
  if (birthdayClient) {
    addMessage("birthday", birthdayClient, undefined, clinicToUtc(addDays(today, -12), "10:00").toISOString(), "sent", {
      discount: "15%"
    });
  }
  clients
    .filter((client) => client.isVip)
    .forEach((client) =>
      addMessage("loyalty", client, undefined, clinicToUtc(addDays(today, -21), "11:00").toISOString(), "sent", {
        customMessage: "Այս ամիս՝ 10% զեղչ բիորևիտալիզացիայի կուրսի համար։"
      })
    );

  queue.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  logs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { queue, logs };
}
