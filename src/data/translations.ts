export type Language = "hy" | "ru" | "en";

export const defaultLanguage: Language = "hy";

export const languageOptions: Array<{ code: Language; label: string; shortLabel: string }> = [
  { code: "hy", label: "Հայերեն", shortLabel: "Հայ" },
  { code: "ru", label: "Русский", shortLabel: "Рус" },
  { code: "en", label: "English", shortLabel: "Eng" }
];

export const categoryKeys = [
  "all",
  "consultation",
  "fillers",
  "lips",
  "botox",
  "biorevitalization",
  "collagen",
  "ultraformer",
  "mesotherapy",
  "skincare"
] as const;

export type CategoryKey = (typeof categoryKeys)[number];

export const translations = {
  hy: {
    common: {
      book: "Գրանցվել",
      instagram: "Instagram",
      call: "Զանգահարել",
      address: "Երևան, Սայաթ-Նովա 33",
      select: "Ընտրել",
      selected: "Ընտրված է",
      remove: "Հեռացնել",
      amd: "AMD",
      minutes: "րոպե",
      total: "Ընդամենը",
      duration: "Տևողություն",
      price: "Արժեք"
    },
    hero: {
      name: "Dr. Edgar",
      handle: "@dr.edgar__",
      specialization: "բժիշկ-կոսմետոլոգ",
      bio:
        "Էսթետիկ բժշկություն՝ նուրբ մոտեցմամբ, բժշկական ճշգրտությամբ և բնական արդյունքի հանդեպ բարձր պահանջով։",
      addressLabel: "Հասցե"
    },
    about: {
      title: "Բժշկի մասին",
      lead:
        "Dr. Edgar-ը համադրում է բժշկական փորձը, ժամանակակից կոսմետոլոգիական տեխնոլոգիաները և անհատական խորհրդատվությունը՝ յուրաքանչյուր այցը դարձնելով վստահելի, հանգիստ և պրեմիում փորձառություն։",
      body:
        "Բուժման պլանը կազմվում է անհատական գնահատումից հետո՝ հաշվի առնելով մաշկի վիճակը, դեմքի համամասնությունները և բնական արդյունքը պահպանելու սկզբունքը։",
      note:
        "Բնականություն, անվտանգություն և չափի զգացում՝ յուրաքանչյուր միջամտության հիմքում։",
      stats: [
        "15+ տարի փորձ",
        "3000+ գոհ այցելուներ",
        "Անհատական մոտեցում",
        "Պրեմիում դասի խնամք"
      ]
    },
    portfolio: {
      title: "Աշխատանքներ",
      subtitle: "Նախադիտում Instagram-ի ոճով",
      close: "Փակել"
    },
    services: {
      title: "Ծառայություններ",
      subtitle:
        "Ընտրեք մեկ կամ մի քանի պրոցեդուրա, իսկ համակարգը կհաշվի ընդհանուր տևողությունն ու արժեքը։",
      selectedTitle: "Ընտրված պրոցեդուրաներ",
      emptySelection: "Դեռ ընտրված պրոցեդուրա չկա։",
      findSlots: "Գտնել հասանելի ժամեր",
      findingSlots: "Փնտրում ենք հասանելի ժամեր...",
      categories: {
        all: "Բոլորը",
        consultation: "Խորհրդատվություն",
        fillers: "Ֆիլերներ",
        lips: "Շուրթեր",
        botox: "Բոտուլինոթերապիա",
        biorevitalization: "Բիոռևիտալիզացիա",
        collagen: "Կոլագենոթերապիա",
        ultraformer: "UltraFormer",
        mesotherapy: "Մեզոթերապիա",
        skincare: "Մաշկի խնամք"
      }
    },
    booking: {
      title: "Գրանցում",
      subtitle:
        "Ընտրեք հասանելի ժամը, լրացրեք տվյալները, և հայտը կուղարկվի բժշկին հաստատման։",
      serviceStep: "Քայլ 1. Ընտրեք ծառայություն",
      dateStep: "Քայլ 2. Ընտրեք օր",
      timeStep: "Քայլ 3. Ընտրեք ժամ",
      contactStep: "Քայլ 4. Կոնտակտային տվյալներ",
      contactStepHint: "Լրացրեք տվյալները, որպեսզի բժիշկը հաստատի այցը։",
      dateStepHint: "Ընտրեք օր առաջիկա հասանելի ժամանակահատվածից։",
      selectServicesFirst: "Նախ ընտրեք մեկ կամ մի քանի ծառայություն։",
      selectDateFirst: "Ընտրեք օր՝ հասանելի ժամերը տեսնելու համար։",
      noSlotsForDate:
        "Այս օրվա համար հասանելի ժամեր չկան։ Խնդրում ենք ընտրել այլ օր։",
      dayOff: "Հանգստյան օր",
      notSelected: "Դեռ ընտրված չէ",
      availableTimes: "Հասանելի ժամեր",
      findFirst:
        "Նախ ընտրեք պրոցեդուրաները և սեղմեք «Գտնել հասանելի ժամեր»։",
      noSlots:
        "Այս պահին հասանելի ժամեր չկան։ Խնդրում ենք փորձել այլ օր կամ կապ հաստատել մեզ հետ։",
      selectedSlot: "Ընտրված ժամ",
      firstName: "Անուն",
      lastName: "Ազգանուն",
      phone: "Հեռախոս",
      comment: "Մեկնաբանություն",
      firstNamePlaceholder: "Օրինակ՝ Անի",
      lastNamePlaceholder: "Օրինակ՝ Մանուկյան",
      phonePlaceholder: "+374 XX XXX XXX",
      commentPlaceholder:
        "Ցանկության դեպքում նշեք հարցը կամ նախընտրությունը",
      submit: "Ուղարկել հայտը",
      loading: "Ուղարկվում է...",
      success:
        "Ձեր հայտը հաջողությամբ ուղարկվել է և սպասում է բժշկի հաստատմանը։",
      error:
        "Չհաջողվեց ուղարկել հայտը։ Խնդրում ենք փորձել կրկին կամ զանգահարել։",
      slotTaken: "Այս ժամն արդեն զբաղեցրել են, ընտրեք այլ ժամ։",
      tooManyRequests: "Չափազանց շատ հարցումներ։ Խնդրում ենք փորձել մի քանի րոպեից կամ զանգահարել։",
      channelLabel: "Որտե՞ղ եք նախընտրում ստանալ հիշեցումները",
      channelHint: "Ընտրեք, թե որտեղ ձեզ համար հարմար է ստանալ հաստատումն ու հիշեցումները։"
    },
    footer: {
      title: "Dr. Edgar",
      subtitle: "Պրեմիում բժշկական էսթետիկա",
      rights: "Բոլոր իրավունքները պաշտպանված են։"
    },
    sticky: {
      label: "Գրանցվել"
    }
  },
  ru: {
    common: {
      book: "Записаться",
      instagram: "Instagram",
      call: "Позвонить",
      address: "Ереван, Саят-Нова 33",
      select: "Выбрать",
      selected: "Выбрано",
      remove: "Убрать",
      amd: "AMD",
      minutes: "мин",
      total: "Итого",
      duration: "Длительность",
      price: "Стоимость"
    },
    hero: {
      name: "Dr. Edgar",
      handle: "@dr.edgar__",
      specialization: "врач-косметолог",
      bio:
        "Эстетическая медицина с деликатным подходом, медицинской точностью и фокусом на естественный результат.",
      addressLabel: "Адрес"
    },
    about: {
      title: "О враче",
      lead:
        "Dr. Edgar сочетает медицинский опыт, современные косметологические технологии и персональную консультацию, чтобы каждый визит был спокойным, доверительным и премиальным.",
      body:
        "План процедур подбирается после индивидуальной оценки с учетом состояния кожи, пропорций лица и принципа естественного результата.",
      note: "Естественность, безопасность и чувство меры лежат в основе каждой процедуры.",
      stats: [
        "15+ лет опыта",
        "3000+ довольных пациентов",
        "Индивидуальный подход",
        "Уход премиум-класса"
      ]
    },
    portfolio: {
      title: "Работы",
      subtitle: "Превью в стиле Instagram",
      close: "Закрыть"
    },
    services: {
      title: "Услуги",
      subtitle:
        "Выберите одну или несколько процедур, а система рассчитает общую длительность и стоимость.",
      selectedTitle: "Выбранные процедуры",
      emptySelection: "Пока нет выбранных процедур.",
      findSlots: "Найти доступное время",
      findingSlots: "Ищем доступное время...",
      categories: {
        all: "Все",
        consultation: "Консультация",
        fillers: "Филлеры",
        lips: "Губы",
        botox: "Ботулинотерапия",
        biorevitalization: "Биоревитализация",
        collagen: "Коллагенотерапия",
        ultraformer: "UltraFormer",
        mesotherapy: "Мезотерапия",
        skincare: "Уход за кожей"
      }
    },
    booking: {
      title: "Заявка",
      subtitle:
        "Выберите доступное время, заполните данные, и заявка уйдет врачу на подтверждение.",
      serviceStep: "Шаг 1. Выберите услугу",
      dateStep: "Шаг 2. Выберите дату",
      timeStep: "Шаг 3. Выберите время",
      contactStep: "Шаг 4. Контактные данные",
      contactStepHint: "Заполните данные, чтобы врач подтвердил визит.",
      dateStepHint: "Выберите день из ближайшего периода записи.",
      selectServicesFirst: "Сначала выберите одну или несколько процедур.",
      selectDateFirst: "Выберите дату, чтобы увидеть доступное время.",
      noSlotsForDate:
        "На выбранный день свободного времени нет. Пожалуйста, выберите другую дату.",
      dayOff: "Выходной",
      notSelected: "Пока не выбрано",
      availableTimes: "Доступное время",
      findFirst: "Сначала выберите процедуры и нажмите «Найти доступное время».",
      noSlots:
        "Сейчас нет доступного времени. Пожалуйста, попробуйте другой день или свяжитесь с нами.",
      selectedSlot: "Выбранное время",
      firstName: "Имя",
      lastName: "Фамилия",
      phone: "Телефон",
      comment: "Комментарий",
      firstNamePlaceholder: "Например, Анна",
      lastNamePlaceholder: "Например, Манукян",
      phonePlaceholder: "+374 XX XXX XXX",
      commentPlaceholder: "При желании укажите вопрос или пожелание",
      submit: "Отправить заявку",
      loading: "Отправляем...",
      success: "Ваша заявка отправлена и ожидает подтверждения врача.",
      error:
        "Не удалось отправить заявку. Пожалуйста, попробуйте снова или позвоните.",
      slotTaken: "Это время только что заняли, выберите другое.",
      tooManyRequests: "Слишком много запросов. Попробуйте через несколько минут или позвоните.",
      channelLabel: "Куда вам удобнее получать напоминания?",
      channelHint: "Выберите, куда присылать подтверждение и напоминания о визите."
    },
    footer: {
      title: "Dr. Edgar",
      subtitle: "Премиальная медицинская эстетика",
      rights: "Все права защищены."
    },
    sticky: {
      label: "Записаться"
    }
  },
  en: {
    common: {
      book: "Book now",
      instagram: "Instagram",
      call: "Call",
      address: "Yerevan, Sayat-Nova 33",
      select: "Select",
      selected: "Selected",
      remove: "Remove",
      amd: "AMD",
      minutes: "min",
      total: "Total",
      duration: "Duration",
      price: "Price"
    },
    hero: {
      name: "Dr. Edgar",
      handle: "@dr.edgar__",
      specialization: "cosmetologist doctor",
      bio:
        "A refined medical aesthetic approach with clinical precision, calm confidence, and a natural-result philosophy.",
      addressLabel: "Address"
    },
    about: {
      title: "About Doctor",
      lead:
        "Dr. Edgar combines medical experience, modern aesthetic technologies, and individual consultation to make every visit calm, trusted, and premium.",
      body:
        "The procedure plan is built after an individual assessment, considering skin condition, facial proportions, and a natural-result principle.",
      note: "Natural balance, safety, and proportion guide every treatment.",
      stats: [
        "15+ years experience",
        "3000+ happy patients",
        "Personal approach",
        "Premium class care"
      ]
    },
    portfolio: {
      title: "Works",
      subtitle: "Instagram-style preview",
      close: "Close"
    },
    services: {
      title: "Services",
      subtitle:
        "Choose one or more procedures, and the system will calculate total duration and price.",
      selectedTitle: "Selected procedures",
      emptySelection: "No procedures selected yet.",
      findSlots: "Find available times",
      findingSlots: "Finding available times...",
      categories: {
        all: "All",
        consultation: "Consultation",
        fillers: "Fillers",
        lips: "Lips",
        botox: "Botulinum therapy",
        biorevitalization: "Biorevitalization",
        collagen: "Collagen therapy",
        ultraformer: "UltraFormer",
        mesotherapy: "Mesotherapy",
        skincare: "Skin care"
      }
    },
    booking: {
      title: "Booking request",
      subtitle:
        "Choose an available time, fill in your details, and the request will be sent for doctor confirmation.",
      serviceStep: "Step 1. Select service",
      dateStep: "Step 2. Select date",
      timeStep: "Step 3. Select time",
      contactStep: "Step 4. Contact details",
      contactStepHint: "Fill in your details so the doctor can confirm the visit.",
      dateStepHint: "Choose a day from the upcoming booking period.",
      selectServicesFirst: "Select one or more procedures first.",
      selectDateFirst: "Select a date to see available times.",
      noSlotsForDate:
        "No available times for this date. Please choose another day.",
      dayOff: "Day off",
      notSelected: "Not selected yet",
      availableTimes: "Available times",
      findFirst: "First choose procedures and tap \"Find available times\".",
      noSlots:
        "No available times right now. Please try another day or contact us.",
      selectedSlot: "Selected time",
      firstName: "First name",
      lastName: "Last name",
      phone: "Phone",
      comment: "Comment",
      firstNamePlaceholder: "For example, Ani",
      lastNamePlaceholder: "For example, Manukyan",
      phonePlaceholder: "+374 XX XXX XXX",
      commentPlaceholder: "Optionally add your question or preference",
      submit: "Send request",
      loading: "Sending...",
      success: "Your request has been sent and is waiting for doctor confirmation.",
      error: "Could not send the request. Please try again or call.",
      slotTaken: "This time was just taken, please choose another one.",
      tooManyRequests: "Too many requests. Please try again in a few minutes or call us.",
      channelLabel: "Where would you like to get reminders?",
      channelHint: "Choose where we send the confirmation and visit reminders."
    },
    footer: {
      title: "Dr. Edgar",
      subtitle: "Premium medical aesthetics",
      rights: "All rights reserved."
    },
    sticky: {
      label: "Book now"
    }
  }
} as const;
