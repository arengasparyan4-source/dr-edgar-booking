import { randomUUID } from "node:crypto";
import { appRepository } from "@/lib/repositories/appRepository";
import type { ClientProcedureRecord } from "@/types/domain";

type ProcedureInput = Omit<
  ClientProcedureRecord,
  "id" | "clientId" | "createdAt" | "updatedAt"
>;

const sortRecords = (records: ClientProcedureRecord[]) =>
  [...records].sort((a, b) =>
    `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`)
  );

export const clientProceduresRepository = {
  getClientHistory(clientId: string) {
    return this.listByClientId(clientId);
  },

  async listByClientId(clientId: string) {
    const data = await appRepository.getData();
    return sortRecords(
      data.clientProcedureRecords.filter((record) => record.clientId === clientId)
    );
  },

  async create(clientId: string, input: ProcedureInput) {
    const now = new Date().toISOString();
    const record: ClientProcedureRecord = {
      ...input,
      id: `procedure_${randomUUID()}`,
      clientId,
      currency: "AMD",
      createdAt: now,
      updatedAt: now
    };

    await appRepository.updateData((data) => ({
      ...data,
      clientProcedureRecords: [record, ...data.clientProcedureRecords]
    }));

    return record;
  },

  addClientHistoryRecord(clientId: string, input: ProcedureInput) {
    return this.create(clientId, input);
  },

  async createFromBooking(clientId: string, bookingId: string) {
    const data = await appRepository.getData();
    const booking = data.bookings.find((item) => item.id === bookingId);

    if (!booking) {
      throw new Error("Booking not found");
    }

    const existingRecords = data.clientProcedureRecords.filter(
      (record) => record.clientId === clientId && record.bookingId === bookingId
    );
    const existingServiceIds = new Set(
      existingRecords.map((record) => record.serviceId).filter(Boolean)
    );
    const now = new Date().toISOString();
    const recordsToCreate: ClientProcedureRecord[] = booking.servicesSnapshot
      .filter((service) => !existingServiceIds.has(service.id))
      .map((service) => ({
        id: `procedure_${randomUUID()}`,
        clientId,
        date: booking.date,
        serviceName: service.name.ru || service.name.en || service.name.hy,
        serviceId: service.id,
        price: service.price,
        currency: "AMD",
        comment: booking.comment,
        bookingId: booking.id,
        createdAt: now,
        updatedAt: now
      }));

    if (!recordsToCreate.length) {
      return existingRecords;
    }

    await appRepository.updateData((currentData) => ({
      ...currentData,
      clientProcedureRecords: [
        ...recordsToCreate,
        ...currentData.clientProcedureRecords
      ]
    }));

    return [...recordsToCreate, ...existingRecords];
  },

  async update(clientId: string, recordId: string, patch: Partial<ProcedureInput>) {
    let updatedRecord: ClientProcedureRecord | null = null;

    await appRepository.updateData((data) => ({
      ...data,
      clientProcedureRecords: data.clientProcedureRecords.map((record) => {
        if (record.clientId !== clientId || record.id !== recordId) {
          return record;
        }

        updatedRecord = {
          ...record,
          ...patch,
          id: record.id,
          clientId: record.clientId,
          currency: "AMD",
          createdAt: record.createdAt,
          updatedAt: new Date().toISOString()
        };

        return updatedRecord;
      })
    }));

    return updatedRecord;
  },

  updateClientHistoryRecord(
    clientId: string,
    recordId: string,
    patch: Partial<ProcedureInput>
  ) {
    return this.update(clientId, recordId, patch);
  },

  async delete(clientId: string, recordId: string) {
    let deleted = 0;

    await appRepository.updateData((data) => ({
      ...data,
      clientProcedureRecords: data.clientProcedureRecords.filter((record) => {
        const shouldDelete = record.clientId === clientId && record.id === recordId;
        if (shouldDelete) {
          deleted += 1;
        }
        return !shouldDelete;
      })
    }));

    return deleted;
  },

  deleteClientHistoryRecord(clientId: string, recordId: string) {
    return this.delete(clientId, recordId);
  }
};
