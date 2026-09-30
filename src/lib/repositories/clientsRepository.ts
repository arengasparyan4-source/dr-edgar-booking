import { randomUUID } from "node:crypto";
import {
  buildClientDraft,
  type ClientImportRow,
  type DuplicateBehavior
} from "@/lib/clients/clientImport";
import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import { appRepository } from "@/lib/repositories/appRepository";
import type { Client, ClientStatus } from "@/types/domain";

export type ClientImportSummary = {
  added: number;
  updated: number;
  skipped: number;
  errors: number;
};

const sortClients = (clients: Client[]) =>
  [...clients].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

const clientStatuses = new Set<ClientStatus>([
  "active",
  "sleeping",
  "lost",
  "new",
  "vip",
  "blacklist",
  "inactive"
]);

const isClientStatus = (value: unknown): value is ClientStatus =>
  typeof value === "string" && clientStatuses.has(value as ClientStatus);

const normalizeStoredClient = (client: Client): Client => {
  const legacyClient = client as Client & {
    notes?: string;
  };
  const normalizedPhone =
    normalizePhoneNumber(client.normalizedPhone) ||
    normalizePhoneNumber(client.phone) ||
    client.normalizedPhone ||
    client.phone;
  const fullName =
    client.fullName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    client.phone;

  return {
    ...client,
    fullName,
    normalizedPhone,
    comment: client.comment ?? legacyClient.notes,
    notes: client.notes,
    balance: client.balance,
    discount: client.discount,
    birthDate: client.birthDate,
    email: client.email,
    address: client.address,
    status: isClientStatus(client.status) ? client.status : "active",
    isVip: Boolean(client.isVip || client.status === "vip"),
    isBlacklisted: Boolean(client.isBlacklisted || client.status === "blacklist"),
    source: client.source,
    visitsCount: client.visitsCount,
    lastVisitDate: client.lastVisitDate,
    nextBookingDate: client.nextBookingDate
  };
};

const mergeClient = (existing: Client, incoming: Omit<Client, "id" | "createdAt">): Client => ({
  ...existing,
  fullName: incoming.fullName || existing.fullName,
  firstName: incoming.firstName ?? existing.firstName,
  lastName: incoming.lastName ?? existing.lastName,
  phone: incoming.phone || existing.phone,
  normalizedPhone: existing.normalizedPhone,
  comment: incoming.comment ?? existing.comment,
  notes: incoming.notes ?? existing.notes,
  balance: incoming.balance ?? existing.balance,
  discount: incoming.discount ?? existing.discount,
  birthDate: incoming.birthDate ?? existing.birthDate,
  email: incoming.email ?? existing.email,
  address: incoming.address ?? existing.address,
  status: existing.status ?? incoming.status,
  isVip: existing.isVip || incoming.isVip,
  isBlacklisted: existing.isBlacklisted || incoming.isBlacklisted,
  source: existing.source ?? incoming.source,
  visitsCount: incoming.visitsCount ?? existing.visitsCount,
  lastVisitDate: incoming.lastVisitDate ?? existing.lastVisitDate,
  nextBookingDate: incoming.nextBookingDate ?? existing.nextBookingDate,
  // Only an explicit choice changes the channel.
  preferredChannel: incoming.preferredChannel ?? existing.preferredChannel ?? "sms",
  id: existing.id,
  createdAt: existing.createdAt,
  updatedAt: incoming.updatedAt
});

export const clientsRepository = {
  async listClients() {
    const data = await appRepository.getData();
    return sortClients(data.clients.map(normalizeStoredClient));
  },

  async getClientById(id: string) {
    const clients = await this.listClients();
    return clients.find((client) => client.id === id) ?? null;
  },

  async getClientByPhone(normalizedPhone: string) {
    const phone = normalizePhoneNumber(normalizedPhone) || normalizedPhone;
    const clients = await this.listClients();
    return clients.find((client) => client.normalizedPhone === phone) ?? null;
  },

  async createClient(client: Omit<Client, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    const normalizedPhone =
      normalizePhoneNumber(client.normalizedPhone) ||
      normalizePhoneNumber(client.phone);

    if (!normalizedPhone) {
      throw new Error("Invalid phone");
    }

    const existingClient = await this.getClientByPhone(normalizedPhone);
    if (existingClient) {
      const { client: updatedClient } = await this.upsertClientByPhone({
        ...client,
        normalizedPhone
      });
      return updatedClient;
    }

    const createdClient: Client = normalizeStoredClient({
      preferredChannel: "sms",
      ...client,
      id: `client_${randomUUID()}`,
      normalizedPhone,
      createdAt: now,
      updatedAt: now
    });

    await appRepository.updateData((data) => ({
      ...data,
      clients: [...data.clients.map(normalizeStoredClient), createdClient]
    }));

    return createdClient;
  },

  async updateClient(id: string, patch: Partial<Client>) {
    let updatedClient: Client | null = null;
    const now = new Date().toISOString();
    const phoneChanged =
      patch.phone !== undefined || patch.normalizedPhone !== undefined;
    const normalizedPatchPhone =
      normalizePhoneNumber(patch.normalizedPhone ?? "") ||
      normalizePhoneNumber(patch.phone ?? "");

    if (phoneChanged && !normalizedPatchPhone) {
      throw new Error("Invalid phone");
    }

    if (normalizedPatchPhone) {
      const duplicate = (await this.listClients()).find(
        (client) => client.id !== id && client.normalizedPhone === normalizedPatchPhone
      );

      if (duplicate) {
        throw new Error("Client with this phone already exists");
      }
    }

    await appRepository.updateData((data) => ({
      ...data,
      clients: data.clients.map((client) => {
        const normalizedClient = normalizeStoredClient(client);
        if (normalizedClient.id !== id) {
          return normalizedClient;
        }

        updatedClient = normalizeStoredClient({
          ...normalizedClient,
          ...patch,
          id: normalizedClient.id,
          normalizedPhone: normalizedPatchPhone ?? normalizedClient.normalizedPhone,
          createdAt: normalizedClient.createdAt,
          updatedAt: now
        });

        return updatedClient;
      })
    }));

    return updatedClient;
  },

  async upsertClientByPhone(
    client: Omit<Client, "id" | "createdAt" | "updatedAt">
  ): Promise<{ client: Client; created: boolean }> {
    const now = new Date().toISOString();
    const normalizedPhone =
      normalizePhoneNumber(client.normalizedPhone) ||
      normalizePhoneNumber(client.phone);

    if (!normalizedPhone) {
      throw new Error("Invalid phone");
    }

    let upsertedClient: Client | null = null;
    let created = false;

    await appRepository.updateData((data) => {
      const clients = data.clients.map(normalizeStoredClient);
      const existingIndex = clients.findIndex(
        (item) => item.normalizedPhone === normalizedPhone
      );
      const incomingClient = normalizeStoredClient({
        ...client,
        normalizedPhone,
        id: existingIndex >= 0 ? clients[existingIndex].id : `client_${randomUUID()}`,
        createdAt: existingIndex >= 0 ? clients[existingIndex].createdAt : now,
        updatedAt: now
      });

      if (existingIndex >= 0) {
        upsertedClient = mergeClient(clients[existingIndex], incomingClient);
        clients[existingIndex] = upsertedClient;
        return { ...data, clients };
      }

      created = true;
      upsertedClient = {
        ...incomingClient,
        preferredChannel: incomingClient.preferredChannel ?? "sms"
      };
      return { ...data, clients: [...clients, upsertedClient] };
    });

    if (!upsertedClient) {
      throw new Error("Client upsert failed");
    }

    return { client: upsertedClient, created };
  },

  async importRows(
    rows: ClientImportRow[],
    duplicateBehavior: DuplicateBehavior = "update"
  ): Promise<ClientImportSummary> {
    const now = new Date().toISOString();
    const summary: ClientImportSummary = {
      added: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    await appRepository.updateData((data) => {
      const clients = data.clients.map(normalizeStoredClient);
      const indexByPhone = new Map(
        clients.map((client, index) => [client.normalizedPhone, index])
      );
      const seenImportPhones = new Set<string>();

      for (const row of rows) {
        const draft = buildClientDraft(row.values);

        if (!draft.client || !draft.normalizedPhone || draft.errors.length > 0) {
          summary.errors += 1;
          continue;
        }

        if (seenImportPhones.has(draft.normalizedPhone)) {
          summary.skipped += 1;
          continue;
        }

        seenImportPhones.add(draft.normalizedPhone);

        const existingIndex = indexByPhone.get(draft.normalizedPhone);
        const incomingClient: Omit<Client, "id" | "createdAt"> = {
          ...draft.client,
          status: "active",
          isVip: false,
          isBlacklisted: false,
          updatedAt: now
        };

        if (existingIndex !== undefined) {
          if (duplicateBehavior === "skip") {
            summary.skipped += 1;
            continue;
          }

          clients[existingIndex] = mergeClient(clients[existingIndex], incomingClient);
          summary.updated += 1;
          continue;
        }

        const client: Client = {
          ...draft.client,
          id: randomUUID(),
          status: "active",
          isVip: false,
          isBlacklisted: false,
          createdAt: now,
          updatedAt: now
        };

        clients.push(client);
        indexByPhone.set(client.normalizedPhone, clients.length - 1);
        summary.added += 1;
      }

      return {
        ...data,
        clients
      };
    });

    return summary;
  },

  async deleteClientsByIds(clientIds: string[]) {
    const ids = new Set(clientIds);
    let deleted = 0;

    await appRepository.updateData((data) => {
      const clients = data.clients.filter((client) => {
        const shouldDelete = ids.has(client.id);
        if (shouldDelete) {
          deleted += 1;
        }
        return !shouldDelete;
      });

      return {
        ...data,
        clients
      };
    });

    return deleted;
  },

  async deleteAllClientsSafely() {
    let deleted = 0;

    await appRepository.updateData((data) => {
      deleted = data.clients.length;

      return {
        ...data,
        clients: []
      };
    });

    return deleted;
  }
};
