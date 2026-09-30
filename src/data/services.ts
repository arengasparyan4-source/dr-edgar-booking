import type { Service } from "@/types/domain";
import type { CategoryKey } from "./translations";

export const defaultServices: Service[] = [
  {
    id: "consultation-primary",
    category: "consultation",
    durationMinutes: 30,
    price: 15000,
    active: true,
    name: {
      hy: "Կոսմետոլոգիական խորհրդատվություն",
      ru: "Консультация косметолога",
      en: "Cosmetology consultation"
    },
    description: {
      hy: "Անհատական խորհրդատվություն՝ մաշկի վիճակի գնահատմամբ և բուժման պլանով։",
      ru: "Индивидуальная консультация с оценкой состояния кожи и планом процедур.",
      en: "Personal consultation with skin assessment and treatment planning."
    }
  },
  {
    id: "lip-filler",
    category: "lips",
    durationMinutes: 60,
    price: 85000,
    active: true,
    name: {
      hy: "Շուրթերի կորեկցիա ֆիլերով",
      ru: "Коррекция губ филлером",
      en: "Lip filler correction"
    },
    description: {
      hy: "Նուրբ ծավալ, հստակ կոնտուր և բնական համաչափություն։",
      ru: "Деликатный объем, четкий контур и естественная симметрия.",
      en: "Soft volume, defined contour, and natural symmetry."
    }
  },
  {
    id: "face-contour",
    category: "fillers",
    durationMinutes: 75,
    price: 120000,
    active: true,
    name: {
      hy: "Դեմքի կոնտուրային մոդելավորում",
      ru: "Контурное моделирование лица",
      en: "Facial contour modeling"
    },
    description: {
      hy: "Դեմքի համաչափության և ծավալների վերականգնում պրեմիում ֆիլերներով։",
      ru: "Восстановление пропорций и объемов лица premium-филлерами.",
      en: "Restoring facial proportions and volume with premium fillers."
    }
  },
  {
    id: "botox-face",
    category: "botox",
    durationMinutes: 45,
    price: 70000,
    active: true,
    name: {
      hy: "Բոտուլինոթերապիա դեմքի համար",
      ru: "Ботулинотерапия лица",
      en: "Facial botulinum therapy"
    },
    description: {
      hy: "Միմիկ կնճիռների մեղմացում՝ պահպանելով բնական արտահայտչականությունը։",
      ru: "Смягчение мимических морщин с сохранением естественной мимики.",
      en: "Softening expression lines while preserving natural movement."
    }
  },
  {
    id: "bio-face",
    category: "biorevitalization",
    durationMinutes: 60,
    price: 65000,
    active: true,
    name: {
      hy: "Դեմքի բիոռևիտալիզացիա",
      ru: "Биоревитализация лица",
      en: "Facial biorevitalization"
    },
    description: {
      hy: "Խոնավեցում, փայլ և մաշկի որակի վերականգնում ներարկային մեթոդով։",
      ru: "Увлажнение, сияние и улучшение качества кожи инъекционным методом.",
      en: "Hydration, glow, and skin quality renewal with injectable care."
    }
  },
  {
    id: "collagen-therapy",
    category: "collagen",
    durationMinutes: 60,
    price: 90000,
    active: true,
    name: {
      hy: "Կոլագենոթերապիա",
      ru: "Коллагенотерапия",
      en: "Collagen therapy"
    },
    description: {
      hy: "Մաշկի էլաստիկության և խտության խթանում կոլագենային ծրագրով։",
      ru: "Стимуляция плотности и эластичности кожи коллагеновой программой.",
      en: "Supporting skin firmness and elasticity with collagen therapy."
    }
  },
  {
    id: "ultraformer-face",
    category: "ultraformer",
    durationMinutes: 90,
    price: 180000,
    active: true,
    name: {
      hy: "UltraFormer դեմքի լիֆտինգ",
      ru: "UltraFormer лифтинг лица",
      en: "UltraFormer face lifting"
    },
    description: {
      hy: "Ոչ վիրահատական լիֆտինգ՝ դեմքի օվալի և մաշկի ձգության համար։",
      ru: "Безоперационный лифтинг для овала лица и упругости кожи.",
      en: "Non-surgical lifting for facial contour and skin firmness."
    }
  },
  {
    id: "mesotherapy",
    category: "mesotherapy",
    durationMinutes: 45,
    price: 55000,
    active: true,
    name: {
      hy: "Մեզոթերապիա",
      ru: "Мезотерапия",
      en: "Mesotherapy"
    },
    description: {
      hy: "Անհատական կոկտեյլներ՝ մաշկի թարմացման և սնուցման համար։",
      ru: "Индивидуальные коктейли для обновления и питания кожи.",
      en: "Personalized cocktails for skin renewal and nourishment."
    }
  },
  {
    id: "skin-care-premium",
    category: "skincare",
    durationMinutes: 75,
    price: 45000,
    active: true,
    name: {
      hy: "Premium մաշկի խնամք",
      ru: "Premium уход за кожей",
      en: "Premium skin care"
    },
    description: {
      hy: "Խորը մաքրում, հանգստացում և փայլ՝ պրոֆեսիոնալ խնամքով։",
      ru: "Глубокое очищение, восстановление и сияние с профессиональным уходом.",
      en: "Deep cleansing, calming, and glow with professional care."
    }
  }
];

export const services = defaultServices;

export const getServiceById = (serviceId: string, source = services) =>
  source.find((service) => service.id === serviceId);

export const isKnownCategory = (category: string): category is Exclude<CategoryKey, "all"> =>
  category !== "all";
