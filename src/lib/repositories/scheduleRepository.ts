import { appRepository } from "./appRepository";

export const scheduleRepository = {
  async get() {
    const data = await appRepository.getData();
    return {
      workingHours: data.workingHours,
      blockedTimes: data.blockedTimes
    };
  },
  update: appRepository.updateSchedule
};
