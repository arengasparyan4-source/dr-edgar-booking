import { appRepository } from "@/lib/repositories/appRepository";
import type { ClientPhoto } from "@/types/domain";

const sortPhotos = (photos: ClientPhoto[]) =>
  [...photos].sort((a, b) =>
    `${b.date} ${b.createdAt}`.localeCompare(`${a.date} ${a.createdAt}`)
  );

export const clientPhotosRepository = {
  async getClientPhotos(clientId: string) {
    const data = await appRepository.getData();
    return sortPhotos(data.clientPhotos.filter((photo) => photo.clientId === clientId));
  },

  async getClientPhoto(photoId: string) {
    const data = await appRepository.getData();
    return data.clientPhotos.find((photo) => photo.id === photoId) ?? null;
  },

  async addClientPhoto(photo: ClientPhoto) {
    await appRepository.updateData((data) => ({
      ...data,
      clientPhotos: [photo, ...data.clientPhotos]
    }));

    return photo;
  },

  async updateClientPhoto(photoId: string, patch: Partial<ClientPhoto>) {
    let updatedPhoto: ClientPhoto | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      clientPhotos: data.clientPhotos.map((photo) => {
        if (photo.id !== photoId) {
          return photo;
        }

        updatedPhoto = {
          ...photo,
          ...patch,
          id: photo.id,
          clientId: photo.clientId,
          url: photo.url,
          fileName: photo.fileName,
          originalName: photo.originalName,
          mimeType: photo.mimeType,
          size: photo.size,
          createdAt: photo.createdAt,
          updatedAt: new Date().toISOString()
        };

        return updatedPhoto;
      })
    }));

    return updatedPhoto;
  },

  async deleteClientPhoto(photoId: string) {
    let deletedPhoto: ClientPhoto | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      clientPhotos: data.clientPhotos.filter((photo) => {
        if (photo.id === photoId) {
          deletedPhoto = photo;
          return false;
        }

        return true;
      })
    }));

    return deletedPhoto;
  }
};
