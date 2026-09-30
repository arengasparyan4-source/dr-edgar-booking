import { appRepository } from "./appRepository";

export const servicesRepository = {
  list: appRepository.listServices,
  upsert: appRepository.upsertService,
  delete: appRepository.deleteService
};
