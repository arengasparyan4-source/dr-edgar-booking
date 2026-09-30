import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import { setClientChannel } from "@/lib/messaging/setClientChannel";
import { clientsRepository } from "@/lib/repositories/clientsRepository";
import { splitClientFullName } from "./clientImport";
import { clientEditorSchema, clientPatchSchema } from "./clientSchemas";

export async function createManualClient(input: unknown) {
  const values = clientEditorSchema.parse(input);
  const normalizedPhone = normalizePhoneNumber(values.phone);

  if (!normalizedPhone) {
    throw new Error("Invalid phone");
  }

  const splitName = splitClientFullName(values.fullName);
  return clientsRepository.upsertClientByPhone({
    ...values,
    ...splitName,
    normalizedPhone,
    source: "manual"
  });
}

export async function updateManualClient(clientId: string, input: unknown) {
  const values = clientPatchSchema.parse(input);
  const existingClient = await clientsRepository.getClientById(clientId);

  if (!existingClient) {
    return null;
  }

  const phone = values.phone ?? existingClient.phone;
  const normalizedPhone = normalizePhoneNumber(phone);

  if (!normalizedPhone) {
    throw new Error("Invalid phone");
  }

  const fullName = values.fullName ?? existingClient.fullName;
  const splitName = splitClientFullName(fullName);
  const updated = await clientsRepository.updateClient(clientId, {
    ...values,
    ...splitName,
    fullName,
    phone,
    normalizedPhone
  });

  // Open bookings and queued messages follow the new channel.
  if (values.preferredChannel && values.preferredChannel !== existingClient.preferredChannel) {
    await setClientChannel(clientId, values.preferredChannel);
    return clientsRepository.getClientById(clientId);
  }

  return updated;
}
