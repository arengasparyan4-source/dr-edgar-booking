import { appRepository } from "./appRepository";

export const portfolioRepository = {
  async list() {
    const data = await appRepository.getData();
    return data.portfolio.sort((a, b) => a.order - b.order);
  },
  update: appRepository.updatePortfolio
};
