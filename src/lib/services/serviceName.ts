import type { Language } from "@/lib/i18n/translations";
import type { Service } from "@/types/domain";

const normalize = (value?: string) => value?.trim().toLocaleLowerCase() ?? "";

export const getLocalizedServiceName = (service: Service, language: Language) => {
  const names = [
    service.name[language],
    service.name.hy,
    service.name.ru,
    service.name.en,
    ...Object.values(service.name)
  ];

  return names.find((name) => name.trim())?.trim() ?? service.id;
};

export const findServiceForProcedure = (
  services: Service[],
  serviceId?: string,
  serviceName?: string,
  language: Language = "hy"
) => {
  if (serviceId) {
    const serviceById = services.find((service) => service.id === serviceId);

    if (serviceById) {
      return serviceById;
    }
  }

  const expectedName = normalize(serviceName);

  if (!expectedName) {
    return null;
  }

  return (
    services.find((service) => {
      const names = [
        getLocalizedServiceName(service, language),
        service.name.hy,
        service.name.ru,
        service.name.en,
        ...Object.values(service.name)
      ];

      return names.some((name) => normalize(name) === expectedName);
    }) ?? null
  );
};
