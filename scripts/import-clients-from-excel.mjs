import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";

const [, , inputPath, duplicateFlag] = process.argv;
const duplicateBehavior = duplicateFlag === "--skip-duplicates" ? "skip" : "update";
const allowedExtensions = new Set([".xlsx", ".csv"]);
const storagePath = path.join(process.cwd(), "storage", "app-data.json");

if (!inputPath) {
  console.error("Usage: node scripts/import-clients-from-excel.mjs imports/clients.xlsx");
  process.exit(1);
}

const fields = [
  "fullName",
  "phone",
  "comment",
  "balance",
  "discount",
  "birthDate",
  "email",
  "address"
];

const normalizeHeader = (value) =>
  String(value ?? "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const aliasSet = (aliases) => new Set(aliases.map(normalizeHeader));

const aliases = {
  fullName: aliasSet(["Имя и фамилия", "ФИО", "Անուն Ազգանուն", "Full Name"]),
  phone: aliasSet(["Телефон", "Номер", "Հեռախոս", "Phone"]),
  comment: aliasSet(["Комментарий", "Коммент", "Նշումներ", "Notes"]),
  balance: aliasSet(["Баланс", "Balance"]),
  discount: aliasSet(["Скидка", "Discount", "Զեղչ"]),
  birthDate: aliasSet(["Дата рождения", "День рождения", "Ծննդյան օր", "Birthday"]),
  email: aliasSet(["E-mail", "Email", "Почта", "Էլ․ փոստ"]),
  address: aliasSet(["Адрес", "Address", "Հասցե"])
};

const clientStatuses = new Set([
  "active",
  "sleeping",
  "lost",
  "new",
  "vip",
  "blacklist",
  "inactive"
]);

const normalizeArmenianPhone = (phone) => {
  const compact = String(phone ?? "").trim().replace(/[^\d+]/g, "");
  const plusCount = [...compact].filter((char) => char === "+").length;

  if (!compact || plusCount > 1 || (plusCount === 1 && !compact.startsWith("+"))) {
    return null;
  }

  const digits = compact.replace(/\D/g, "");
  let localNumber = null;

  if (compact.startsWith("+")) {
    if (!digits.startsWith("374")) {
      return null;
    }
    localNumber = digits.slice(3);
  } else if (digits.startsWith("00374") && digits.length === 13) {
    localNumber = digits.slice(5);
  } else if (digits.startsWith("374") && digits.length === 11) {
    localNumber = digits.slice(3);
  } else if (digits.startsWith("0") && digits.length === 9) {
    localNumber = digits.slice(1);
  } else if (digits.length === 8) {
    localNumber = digits;
  }

  return localNumber && /^\d{8}$/.test(localNumber) ? `+374${localNumber}` : null;
};

const stringifyCellValue = (value) => {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
};

const optionalValue = (value) => {
  const trimmed = String(value ?? "").trim();
  return trimmed || undefined;
};

const optionalNumber = (value) => {
  const normalized = String(value ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized.replace(/%$/, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
};

const splitFullName = (fullName) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || undefined,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined
  };
};

const detectColumns = (headers) =>
  Object.fromEntries(
    fields
      .map((field) => [
        field,
        headers.findIndex((header) => aliases[field].has(normalizeHeader(header)))
      ])
      .filter(([, index]) => index >= 0)
  );

const buildDraft = (values) => {
  const errors = [];
  const rawPhone = optionalValue(values.phone);

  if (!rawPhone) {
    errors.push("Phone required");
  }

  const normalizedPhone = rawPhone ? normalizeArmenianPhone(rawPhone) : null;

  if (rawPhone && !normalizedPhone) {
    errors.push("Invalid phone");
  }

  if (errors.length > 0 || !rawPhone || !normalizedPhone) {
    return { errors };
  }

  const fullName = optionalValue(values.fullName) ?? "";
  const splitName = splitFullName(fullName);

  return {
    errors,
    client: {
      fullName,
      firstName: splitName.firstName,
      lastName: splitName.lastName,
      phone: rawPhone,
      normalizedPhone,
      comment: optionalValue(values.comment),
      balance: optionalNumber(values.balance),
      discount: optionalNumber(values.discount),
      birthDate: optionalValue(values.birthDate),
      email: optionalValue(values.email),
      address: optionalValue(values.address),
      status: "active",
      isVip: false,
      isBlacklisted: false,
      source: "excel"
    }
  };
};

// Spreadsheet reading mirrors src/lib/clients/spreadsheetRows.ts (exceljs for
// .xlsx, a small RFC 4180 parser for .csv). SheetJS (xlsx) was dropped: it has
// unfixed high-severity advisories.
const toPlainValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || value instanceof Date) return value;
  if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join("");
  if ("formula" in value || "sharedFormula" in value) {
    return value.result === undefined ? null : toPlainValue(value.result);
  }
  if ("text" in value) return toPlainValue(value.text);
  if ("error" in value) return null;
  return String(value);
};

const decodeText = (buffer) => {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  if (!utf8.includes("\uFFFD")) return utf8.replace(/^\uFEFF/, "");
  try {
    return new TextDecoder("windows-1251").decode(buffer);
  } catch {
    return utf8;
  }
};

const parseCsv = (text) => {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const unquoted = firstLine.replace(/"[^"]*"/g, "");
  const candidates = [",", ";", "\t"];
  const counts = candidates.map((candidate) => unquoted.split(candidate).length - 1);
  const best = counts.indexOf(Math.max(...counts));
  const delimiter = counts[best] > 0 ? candidates[best] : ",";
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const readSheetRows = async (filePath) => {
  const buffer = await readFile(filePath);
  const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;

  if (!isZip) return parseCsv(decodeText(buffer));

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values = [];
    for (let column = 1; column <= sheet.columnCount; column += 1) {
      values.push(toPlainValue(row.getCell(column).value));
    }
    rows.push(values);
  }
  return rows;
};

const readImportRows = async (filePath) => {
  const extension = path.extname(filePath).toLocaleLowerCase();
  if (!allowedExtensions.has(extension)) {
    throw new Error("Only .xlsx and .csv files are supported");
  }

  let rows;
  try {
    rows = await readSheetRows(filePath);
  } catch {
    throw new Error("Import file is empty");
  }

  // First row with a recognised phone header (skips a title row above the
  // table); otherwise the first non-empty row.
  const phoneHeaderRowIndex = rows.findIndex((row) =>
    row.some((cell) => aliases.phone.has(normalizeHeader(stringifyCellValue(cell))))
  );
  const headerRowIndex =
    phoneHeaderRowIndex >= 0
      ? phoneHeaderRowIndex
      : rows.findIndex((row) => row.some((cell) => stringifyCellValue(cell) !== ""));

  if (headerRowIndex < 0) {
    throw new Error("Import file is empty");
  }

  const headers = rows[headerRowIndex].map(stringifyCellValue);
  const mappedIndexes = detectColumns(headers);

  return rows
    .slice(headerRowIndex + 1)
    .map((row, index) => {
      if (row.every((cell) => stringifyCellValue(cell) === "")) {
        return null;
      }

      const values = Object.fromEntries(
        fields.map((field) => [
          field,
          mappedIndexes[field] !== undefined
            ? stringifyCellValue(row[mappedIndexes[field]])
            : ""
        ])
      );

      return {
        rowNumber: headerRowIndex + index + 2,
        values,
        ...buildDraft(values)
      };
    })
    .filter(Boolean);
};

const readStorage = async () => {
  try {
    return JSON.parse(await readFile(storagePath, "utf8"));
  } catch {
    return {};
  }
};

const normalizeStoredClient = (client) => {
  const fullName =
    client.fullName ||
    [client.firstName, client.lastName].filter(Boolean).join(" ") ||
    client.phone;
  const normalizedPhone =
    normalizeArmenianPhone(client.normalizedPhone) ||
    normalizeArmenianPhone(client.phone) ||
    client.normalizedPhone ||
    client.phone;

  return {
    ...client,
    fullName,
    normalizedPhone,
    comment: client.comment ?? client.notes,
    status: clientStatuses.has(client.status) ? client.status : "active",
    isVip: Boolean(client.isVip || client.status === "vip"),
    isBlacklisted: Boolean(client.isBlacklisted || client.status === "blacklist")
  };
};

const mergeClient = (existing, incoming, updatedAt) => ({
  ...existing,
  fullName: incoming.fullName || existing.fullName,
  firstName: incoming.firstName ?? existing.firstName,
  lastName: incoming.lastName ?? existing.lastName,
  phone: incoming.phone || existing.phone,
  normalizedPhone: existing.normalizedPhone,
  comment: incoming.comment ?? existing.comment,
  balance: incoming.balance ?? existing.balance,
  discount: incoming.discount ?? existing.discount,
  birthDate: incoming.birthDate ?? existing.birthDate,
  email: incoming.email ?? existing.email,
  address: incoming.address ?? existing.address,
  status: existing.status ?? incoming.status,
  isVip: existing.isVip || incoming.isVip,
  isBlacklisted: existing.isBlacklisted || incoming.isBlacklisted,
  visitsCount: incoming.visitsCount ?? existing.visitsCount,
  lastVisitDate: incoming.lastVisitDate ?? existing.lastVisitDate,
  nextBookingDate: incoming.nextBookingDate ?? existing.nextBookingDate,
  source: incoming.source ?? existing.source,
  updatedAt
});

const importRows = async (rows) => {
  const data = await readStorage();
  const clients = Array.isArray(data.clients)
    ? data.clients.map(normalizeStoredClient)
    : [];
  const indexByPhone = new Map(
    clients.map((client, index) => [client.normalizedPhone, index])
  );
  const seenPhones = new Set();
  const now = new Date().toISOString();
  const summary = { added: 0, updated: 0, skipped: 0, errors: 0 };
  const rowErrors = [];

  for (const row of rows) {
    if (!row.client) {
      summary.errors += 1;
      rowErrors.push(`Row ${row.rowNumber}: ${row.errors.join(", ")}`);
      continue;
    }

    if (seenPhones.has(row.client.normalizedPhone)) {
      summary.skipped += 1;
      continue;
    }

    seenPhones.add(row.client.normalizedPhone);

    const existingIndex = indexByPhone.get(row.client.normalizedPhone);

    if (existingIndex !== undefined) {
      if (duplicateBehavior === "skip") {
        summary.skipped += 1;
        continue;
      }

      clients[existingIndex] = mergeClient(clients[existingIndex], row.client, now);
      summary.updated += 1;
      continue;
    }

    const client = {
      ...row.client,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    clients.push(client);
    indexByPhone.set(client.normalizedPhone, clients.length - 1);
    summary.added += 1;
  }

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(
    storagePath,
    `${JSON.stringify({ ...data, clients }, null, 2)}\n`,
    "utf8"
  );

  return { summary, rowErrors };
};

try {
  const rows = await readImportRows(path.resolve(inputPath));
  const { summary, rowErrors } = await importRows(rows);

  console.log("Client import summary");
  console.log(`Added: ${summary.added}`);
  console.log(`Updated: ${summary.updated}`);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Errors: ${summary.errors}`);

  if (rowErrors.length > 0) {
    console.log("");
    console.log("Validation errors");
    for (const rowError of rowErrors.slice(0, 20)) {
      console.log(rowError);
    }
    if (rowErrors.length > 20) {
      console.log(`...and ${rowErrors.length - 20} more`);
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exit(1);
}
