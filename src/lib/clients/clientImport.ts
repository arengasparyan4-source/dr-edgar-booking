import { readSpreadsheetRows } from "./spreadsheetRows";
import { normalizePhoneNumber } from "@/lib/phone/armenianPhone";
import type { Client } from "@/types/domain";

export type ClientImportField =
  | "fullName"
  | "phone"
  | "comment"
  | "balance"
  | "discount"
  | "birthDate"
  | "email"
  | "address";

export type ClientImportIssueCode =
  | "phoneRequired"
  | "invalidPhone"
  | "duplicateClient"
  | "duplicateInFile";

export type ClientImportIssue = {
  code: ClientImportIssueCode;
  message: string;
};

export type ClientImportDraft = {
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone: string;
  normalizedPhone: string;
  comment?: string;
  balance?: number;
  discount?: number;
  birthDate?: string;
  email?: string;
  address?: string;
  source?: string;
};

export type ClientImportRow = {
  rowNumber: number;
  values: Partial<Record<ClientImportField, string>>;
  client?: ClientImportDraft;
  normalizedPhone?: string;
  errors: ClientImportIssue[];
  warnings: ClientImportIssue[];
  duplicateClientId?: string;
};

export type ClientImportPreview = {
  detectedColumns: string[];
  mappedFields: Partial<Record<ClientImportField, string>>;
  rows: ClientImportRow[];
  previewRows: ClientImportRow[];
  summary: {
    totalRows: number;
    validRows: number;
    errorRows: number;
    duplicateRows: number;
  };
};

export type DuplicateBehavior = "update" | "skip";

export const clientImportFields: ClientImportField[] = [
  "fullName",
  "phone",
  "comment",
  "balance",
  "discount",
  "birthDate",
  "email",
  "address"
];

const issueMessages: Record<ClientImportIssueCode, string> = {
  phoneRequired: "Phone required",
  invalidPhone: "Invalid phone",
  duplicateClient: "Duplicate client",
  duplicateInFile: "Duplicate client"
};

const issue = (code: ClientImportIssueCode): ClientImportIssue => ({
  code,
  message: issueMessages[code]
});

const normalizeHeader = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

const aliasSet = (aliases: string[]) => new Set(aliases.map(normalizeHeader));

const fieldAliases: Record<ClientImportField, Set<string>> = {
  fullName: aliasSet(["Имя и фамилия", "ФИО", "Անուն Ազգանուն", "Full Name"]),
  phone: aliasSet(["Телефон", "Номер", "Հեռախոս", "Phone"]),
  comment: aliasSet(["Комментарий", "Коммент", "Նշումներ", "Notes"]),
  balance: aliasSet(["Баланс", "Balance"]),
  discount: aliasSet(["Скидка", "Discount", "Զեղչ"]),
  birthDate: aliasSet(["Дата рождения", "День рождения", "Ծննդյան օր", "Birthday"]),
  email: aliasSet(["E-mail", "Email", "Почта", "Էլ․ փոստ"]),
  address: aliasSet(["Адрес", "Address", "Հասցե"])
};

const stringifyCellValue = (value: unknown): string => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

const isRowEmpty = (row: unknown[]) =>
  row.every((cell) => stringifyCellValue(cell) === "");

const findColumnIndexIn = (row: unknown[], aliases: Set<string>) =>
  row.findIndex((cell) => aliases.has(normalizeHeader(stringifyCellValue(cell))));

/**
 * The header is the first row with a recognised phone column (so a title row
 * above the table is skipped); otherwise the first non-empty row, as before.
 */
const findHeaderRowIndex = (rows: unknown[][]) => {
  const withPhoneHeader = rows.findIndex(
    (row) => findColumnIndexIn(row, fieldAliases.phone) >= 0
  );

  return withPhoneHeader >= 0
    ? withPhoneHeader
    : rows.findIndex((row) => row.some((cell) => stringifyCellValue(cell) !== ""));
};

const findColumnIndex = (headers: string[], aliases: Set<string>) =>
  headers.findIndex((header) => aliases.has(normalizeHeader(header)));

export function detectClientImportColumns(headers: string[]) {
  const mappedIndexes: Partial<Record<ClientImportField, number>> = {};

  for (const field of clientImportFields) {
    const columnIndex = findColumnIndex(headers, fieldAliases[field]);
    if (columnIndex >= 0) {
      mappedIndexes[field] = columnIndex;
    }
  }

  const mappedFields = Object.fromEntries(
    clientImportFields
      .filter((field) => mappedIndexes[field] !== undefined)
      .map((field) => [field, headers[mappedIndexes[field] as number]])
  ) as Partial<Record<ClientImportField, string>>;

  return { mappedIndexes, mappedFields };
}

export function splitClientFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length <= 1) {
    return { firstName: parts[0] || undefined, lastName: undefined };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" ")
  };
}

const toOptionalValue = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const toOptionalNumber = (value: string) => {
  const normalized = value.trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function buildClientDraft(
  values: Partial<Record<ClientImportField, string>>
): {
  client?: ClientImportDraft;
  normalizedPhone?: string;
  errors: ClientImportIssue[];
} {
  const errors: ClientImportIssue[] = [];
  const rawPhone = toOptionalValue(values.phone ?? "");

  if (!rawPhone) {
    errors.push(issue("phoneRequired"));
  }

  const normalizedPhone = rawPhone ? normalizePhoneNumber(rawPhone) : null;

  if (rawPhone && !normalizedPhone) {
    errors.push(issue("invalidPhone"));
  }

  if (!normalizedPhone || !rawPhone || errors.length > 0) {
    return {
      normalizedPhone: normalizedPhone ?? undefined,
      errors
    };
  }

  const fullName = toOptionalValue(values.fullName ?? "") ?? "";
  const splitName = splitClientFullName(fullName);

  return {
    normalizedPhone,
    errors,
    client: {
      fullName,
      firstName: splitName.firstName,
      lastName: splitName.lastName,
      phone: rawPhone,
      normalizedPhone,
      comment: toOptionalValue(values.comment ?? ""),
      balance: toOptionalNumber(values.balance ?? ""),
      discount: toOptionalNumber(values.discount ?? ""),
      birthDate: toOptionalValue(values.birthDate ?? ""),
      email: toOptionalValue(values.email ?? ""),
      address: toOptionalValue(values.address ?? ""),
      source: "excel"
    }
  };
}

/** Accepts .xlsx (detected by its zip signature) or .csv content. */
export async function parseClientImportWorkbook(
  buffer: Buffer,
  existingClients: Client[]
): Promise<ClientImportPreview> {
  let rows: unknown[][];

  try {
    rows = await readSpreadsheetRows(buffer);
  } catch {
    // A corrupt or non-spreadsheet file: same answer as an empty one.
    throw new Error("Import file is empty");
  }

  const headerRowIndex = findHeaderRowIndex(rows);

  if (headerRowIndex < 0) {
    throw new Error("Import file is empty");
  }

  const headers = rows[headerRowIndex].map(stringifyCellValue);
  const { mappedIndexes, mappedFields } = detectClientImportColumns(headers);
  const existingByPhone = new Map(
    existingClients.map((client) => [client.normalizedPhone, client])
  );
  const seenPhones = new Map<string, number>();
  const importRows: ClientImportRow[] = [];

  rows.slice(headerRowIndex + 1).forEach((row, rowIndex) => {
    if (isRowEmpty(row)) {
      return;
    }

    const values: Partial<Record<ClientImportField, string>> = {};

    for (const field of clientImportFields) {
      const columnIndex = mappedIndexes[field];
      values[field] = columnIndex !== undefined ? stringifyCellValue(row[columnIndex]) : "";
    }

    const draft = buildClientDraft(values);
    const warnings: ClientImportIssue[] = [];
    const rowNumber = headerRowIndex + rowIndex + 2;

    if (draft.normalizedPhone) {
      const existingClient = existingByPhone.get(draft.normalizedPhone);
      const firstSeenRow = seenPhones.get(draft.normalizedPhone);

      if (existingClient) {
        warnings.push(issue("duplicateClient"));
      }

      if (firstSeenRow !== undefined) {
        warnings.push(issue("duplicateInFile"));
      } else {
        seenPhones.set(draft.normalizedPhone, rowNumber);
      }

      importRows.push({
        rowNumber,
        values,
        client: draft.client,
        normalizedPhone: draft.normalizedPhone,
        errors: draft.errors,
        warnings,
        duplicateClientId: existingClient?.id
      });
      return;
    }

    importRows.push({
      rowNumber,
      values,
      errors: draft.errors,
      warnings
    });
  });

  return {
    detectedColumns: headers.filter(Boolean),
    mappedFields,
    rows: importRows,
    previewRows: importRows.slice(0, 20),
    summary: {
      totalRows: importRows.length,
      validRows: importRows.filter((row) => row.errors.length === 0).length,
      errorRows: importRows.filter((row) => row.errors.length > 0).length,
      duplicateRows: importRows.filter((row) =>
        row.warnings.some((warning) =>
          warning.code === "duplicateClient" || warning.code === "duplicateInFile"
        )
      ).length
    }
  };
}
