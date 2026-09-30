import { appRepository } from "./appRepository";

export const settingsRepository = {
  async get() {
    const data = await appRepository.getData();
    return data.settings;
  },
  update: appRepository.updateSettings
};
