import { createRequire } from "node:module";
import type { ArchiverOptions, ZipArchive as ZipArchiveInstance } from "archiver";
import ExcelJS from "exceljs";
import { appRepository } from "@/lib/repositories/appRepository";
import { getLocalizedServiceName } from "@/lib/services/serviceName";
import type {
  AppData,
  Booking,
  Client,
  ClientNote,
  ClientPhoto,
  ClientProcedureRecord,
  ClientStatus
} from "@/types/domain";
import type { SmsLog } from "@/types/sms";

const require = createRequire(import.meta.url);
const { ZipArchive } = require("archiver") as {
  ZipArchive: new (options?: ArchiverOptions) => ZipArchiveInstance;
};

export type ExportRange = "all" | "custom";

export type ExportScope = {
  clientId?: string;
  range?: ExportRange;
  from?: string;
  to?: string;
};

type ExportDataset = {
  clients: Client[];
  bookings: Booking[];
  history: ClientProcedureRecord[];
  preparations: ClientProcedureRecord[];
  notes: ClientNote[];
  photos: ClientPhoto[];
  smsLogs: SmsLog[];
  allClients: Client[];
};

type CsvFile = {
  name: string;
  content: string;
};

type ClientIndex = ReturnType<typeof buildClientIndex>;

type ClientProfile = {
  client: Client;
  sheetName: string;
  bookings: Booking[];
  history: ClientProcedureRecord[];
  preparations: ClientProcedureRecord[];
  notes: ClientNote[];
  photos: ClientPhoto[];
  smsLogs: SmsLog[];
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number) => String(value).padStart(2, "0");

const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const parseDateOnly = (value: string) => {
  if (!isoDatePattern.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const asDateCell = (value?: string): Date | string => {
  if (!value) {
    return "";
  }

  const date = isoDatePattern.test(value) ? parseDateOnly(value) : new Date(value);
  return date && !Number.isNaN(date.getTime()) ? date : value;
};

const formatDateForCsv = (value: Date) => {
  const datePart = toIsoDate(value);
  const hasTime =
    value.getHours() !== 0 ||
    value.getMinutes() !== 0 ||
    value.getSeconds() !== 0 ||
    value.getMilliseconds() !== 0;

  return hasTime
    ? `${datePart} ${pad(value.getHours())}:${pad(value.getMinutes())}`
    : datePart;
};

const dateText = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = isoDatePattern.test(value) ? parseDateOnly(value) : new Date(value);
  return date && !Number.isNaN(date.getTime()) ? toIsoDate(date) : value;
};

const dateTimeText = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : formatDateForCsv(date);
};

const matchesClient = (booking: Booking, client: Client) =>
  booking.clientId === client.id ||
  booking.phone === client.normalizedPhone ||
  booking.phone === client.phone;

const buildClientIndex = (clients: Client[]) => {
  const byId = new Map(clients.map((client) => [client.id, client]));
  const byPhone = new Map<string, Client>();

  for (const client of clients) {
    byPhone.set(client.phone, client);
    byPhone.set(client.normalizedPhone, client);
  }

  return { byId, byPhone };
};

const getBookingClient = (booking: Booking, clientIndex: ClientIndex) =>
  (booking.clientId ? clientIndex.byId.get(booking.clientId) : undefined) ??
  clientIndex.byPhone.get(booking.phone) ??
  null;

const getServiceNames = (booking: Booking) =>
  booking.servicesSnapshot
    .map((service) => getLocalizedServiceName(service, "hy"))
    .filter(Boolean)
    .join(", ");

const resolveRangeDates = (scope: ExportScope) => {
  const range = scope.range ?? "all";

  if (range === "all") {
    return null;
  }

  const from = scope.from && isoDatePattern.test(scope.from) ? scope.from : undefined;
  const to = scope.to && isoDatePattern.test(scope.to) ? scope.to : undefined;

  return from || to ? { from, to } : null;
};

const inRange = (value: string | undefined, range: ReturnType<typeof resolveRangeDates>) => {
  if (!range || !value) {
    return true;
  }

  const date = value.slice(0, 10);

  if (!isoDatePattern.test(date)) {
    return false;
  }

  return (!range.from || date >= range.from) && (!range.to || date <= range.to);
};

const getDataset = (data: AppData, scope: ExportScope): ExportDataset => {
  const baseClients = scope.clientId
    ? data.clients.filter((client) => client.id === scope.clientId)
    : data.clients;
  const baseClientIndex = buildClientIndex(baseClients);
  const baseClientIds = new Set(baseClients.map((client) => client.id));
  const range = resolveRangeDates(scope);

  const baseBookings = scope.clientId
    ? data.bookings.filter((booking) =>
        baseClients.some((client) => matchesClient(booking, client))
      )
    : data.bookings;
  const bookings = baseBookings.filter((booking) => inRange(booking.date, range));

  const baseHistory = data.clientProcedureRecords.filter((record) =>
    baseClientIds.has(record.clientId)
  );
  const history = baseHistory.filter((record) => inRange(record.date, range));

  const legacyNotes: ClientNote[] = baseClients
    .filter((client) => client.notes?.trim())
    .map((client) => ({
      id: `${client.id}_notes`,
      clientId: client.id,
      text: client.notes ?? "",
      author: "legacy",
      pinned: false,
      date: client.updatedAt.slice(0, 10),
      createdAt: client.createdAt,
      updatedAt: client.updatedAt
    }));
  const structuredNotes = data.clientNotes.filter((note) =>
    baseClientIds.has(note.clientId)
  );
  const notes = [...structuredNotes, ...legacyNotes]
    .filter((note) => inRange(note.date, range))
    .sort((a, b) =>
      `${b.date} ${b.updatedAt}`.localeCompare(`${a.date} ${a.updatedAt}`)
    );

  const photos = data.clientPhotos
    .filter((photo) => baseClientIds.has(photo.clientId))
    .filter((photo) => inRange(photo.date, range));

  const preparations = history.filter((record) => record.preparationName);

  const smsLogs = data.smsLogs
    .filter((log) => (scope.clientId ? log.clientId === scope.clientId : true))
    .filter((log) => inRange(log.createdAt, range))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!range || scope.clientId) {
    return {
      clients: baseClients,
      bookings,
      history,
      preparations,
      notes,
      photos,
      smsLogs,
      allClients: baseClients
    };
  }

  const reportClientIds = new Set<string>();

  for (const client of baseClients) {
    if (inRange(client.createdAt, range) || inRange(client.updatedAt, range)) {
      reportClientIds.add(client.id);
    }
  }

  for (const booking of bookings) {
    const client = getBookingClient(booking, baseClientIndex);

    if (client) {
      reportClientIds.add(client.id);
    }
  }

  for (const record of history) {
    reportClientIds.add(record.clientId);
  }

  for (const note of notes) {
    reportClientIds.add(note.clientId);
  }

  for (const photo of photos) {
    reportClientIds.add(photo.clientId);
  }

  return {
    clients: baseClients.filter((client) => reportClientIds.has(client.id)),
    bookings,
    history,
    preparations,
    notes,
    photos,
    smsLogs,
    allClients: baseClients
  };
};

// --- Shared labels ---------------------------------------------------------

const MAIN_SHEET_NAME = "Հաճախորդներ";
const HEADER_FILL = "FF201C1A";
const SECTION_FILL = "FF201C1A";
const SUBHEADER_FILL = "FF5B4C3E";
const LINK_COLOR = "FF1155CC";
const PROFILE_COLUMN_COUNT = 7;

const statusLabels: Record<ClientStatus, string> = {
  active: "Ակտիվ",
  sleeping: "Քնած",
  lost: "Կորած",
  new: "Նոր",
  vip: "VIP",
  blacklist: "Սև ցուցակ",
  inactive: "Ոչ ակտիվ"
};

const clientStatusText = (client: Client) => {
  const parts: string[] = [statusLabels[client.status] ?? client.status];

  if (client.isVip && client.status !== "vip") {
    parts.push("VIP");
  }

  if (client.isBlacklisted && client.status !== "blacklist") {
    parts.push("Սև ցուցակ");
  }

  return parts.join(", ");
};

const clientStatusTextEn = (client: Client) => {
  const parts: string[] = [client.status];

  if (client.isVip && client.status !== "vip") {
    parts.push("VIP");
  }

  if (client.isBlacklisted && client.status !== "blacklist") {
    parts.push("blacklist");
  }

  return parts.join(", ");
};

// --- Excel workbook --------------------------------------------------------

// Excel sheet names are limited to 31 chars, cannot contain []:*?/\ and must be
// unique. This factory sanitizes and deduplicates client names into safe tab
// names while reserving the main sheet name so a client cannot collide with it.
const createSheetNamer = () => {
  const used = new Set<string>([MAIN_SHEET_NAME.toLocaleLowerCase()]);

  return (rawName: string) => {
    let base = rawName
      .replace(/[[\]:*?/\\]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^'+|'+$/g, "")
      .trim();

    if (!base) {
      base = "Հաճախորդ";
    }

    base = base.slice(0, 31);

    let candidate = base;
    let counter = 2;
    while (used.has(candidate.toLocaleLowerCase())) {
      const suffix = ` (${counter})`;
      candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
      counter += 1;
    }

    used.add(candidate.toLocaleLowerCase());
    return candidate;
  };
};

// ExcelJS internal (same-workbook) hyperlink target. Apostrophes inside a sheet
// name must be doubled inside the quoted reference.
const internalLink = (sheetName: string) => `#'${sheetName.replace(/'/g, "''")}'!A1`;

const buildClientProfiles = (dataset: ExportDataset): ClientProfile[] => {
  const clientIndex = buildClientIndex(dataset.allClients);
  const nameSheet = createSheetNamer();

  const bookingsByClient = new Map<string, Booking[]>();
  for (const booking of dataset.bookings) {
    const client = getBookingClient(booking, clientIndex);
    const id = client?.id ?? booking.clientId;
    if (!id) {
      continue;
    }
    bookingsByClient.set(id, [...(bookingsByClient.get(id) ?? []), booking]);
  }

  const groupByClientId = <T extends { clientId: string }>(items: T[]) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      map.set(item.clientId, [...(map.get(item.clientId) ?? []), item]);
    }
    return map;
  };

  const historyByClient = groupByClientId(dataset.history);
  const preparationsByClient = groupByClientId(dataset.preparations);
  const notesByClient = groupByClientId(dataset.notes);
  const photosByClient = groupByClientId(dataset.photos);

  const smsByClient = new Map<string, SmsLog[]>();
  for (const log of dataset.smsLogs) {
    if (!log.clientId) {
      continue;
    }
    smsByClient.set(log.clientId, [...(smsByClient.get(log.clientId) ?? []), log]);
  }

  return dataset.clients.map((client) => ({
    client,
    sheetName: nameSheet(client.fullName || client.phone || "Հաճախորդ"),
    bookings: bookingsByClient.get(client.id) ?? [],
    history: historyByClient.get(client.id) ?? [],
    preparations: preparationsByClient.get(client.id) ?? [],
    notes: notesByClient.get(client.id) ?? [],
    photos: photosByClient.get(client.id) ?? [],
    smsLogs: smsByClient.get(client.id) ?? []
  }));
};

type CellText = string | number | Date;

const addSectionTitle = (worksheet: ExcelJS.Worksheet, title: string) => {
  const row = worksheet.addRow([title]);
  worksheet.mergeCells(row.number, 1, row.number, PROFILE_COLUMN_COUNT);
  const cell = row.getCell(1);
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SECTION_FILL } };
  cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
  cell.alignment = { vertical: "middle", horizontal: "left" };
  row.height = 24;
  return row;
};

const addKeyValueRow = (
  worksheet: ExcelJS.Worksheet,
  label: string,
  value: CellText
) => {
  const row = worksheet.addRow([label, value]);
  worksheet.mergeCells(row.number, 2, row.number, PROFILE_COLUMN_COUNT);
  row.getCell(1).font = { bold: true, color: { argb: "FF6B5B4D" } };
  row.getCell(1).alignment = { vertical: "top" };
  row.getCell(2).alignment = { vertical: "top", wrapText: true };
  return row;
};

const addTableHeaderRow = (worksheet: ExcelJS.Worksheet, headers: string[]) => {
  const row = worksheet.addRow(headers);
  row.height = 20;
  headers.forEach((_, index) => {
    const cell = row.getCell(index + 1);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUBHEADER_FILL } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
  });
  return row;
};

const addTableBodyRow = (worksheet: ExcelJS.Worksheet, values: CellText[]) => {
  const row = worksheet.addRow(values);
  values.forEach((_, index) => {
    row.getCell(index + 1).alignment = { vertical: "top", wrapText: true };
  });
  return row;
};

const buildMainSheet = (workbook: ExcelJS.Workbook, profiles: ClientProfile[]) => {
  const worksheet = workbook.addWorksheet(MAIN_SHEET_NAME, {
    properties: { defaultRowHeight: 20 }
  });

  const headers = [
    "Անուն Ազգանուն",
    "Հեռախոս",
    "Մեկնաբանություն",
    "Բալանս",
    "Զեղչ",
    "Ծննդյան օր",
    "Էլ. փոստ",
    "Հասցե",
    "Կարգավիճակ"
  ];
  const widths = [30, 18, 36, 14, 12, 14, 26, 30, 24];
  worksheet.columns = headers.map((header, index) => ({
    header,
    width: widths[index]
  }));

  for (const profile of profiles) {
    const { client } = profile;
    const row = worksheet.addRow([
      client.fullName,
      client.phone,
      client.comment ?? "",
      client.balance ?? "",
      client.discount ?? "",
      asDateCell(client.birthDate),
      client.email ?? "",
      client.address ?? "",
      clientStatusText(client)
    ]);

    const nameCell = row.getCell(1);
    nameCell.value = {
      text: client.fullName || client.phone,
      hyperlink: internalLink(profile.sheetName)
    };
    nameCell.font = { color: { argb: LINK_COLOR }, underline: true };
  }

  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };

  const headerRow = worksheet.getRow(1);
  headerRow.height = 25;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFD9C8B8" } } };
  });

  worksheet.getColumn(4).numFmt = '#,##0 "AMD"';
  worksheet.getColumn(5).numFmt = "#,##0";
  worksheet.getColumn(6).numFmt = "yyyy-mm-dd";

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    row.height = 20;
    row.getCell(3).alignment = { vertical: "top", wrapText: true };
    row.getCell(8).alignment = { vertical: "top", wrapText: true };
    row.getCell(4).alignment = { vertical: "top", horizontal: "right" };
    row.getCell(5).alignment = { vertical: "top", horizontal: "right" };
  });

  return worksheet;
};

const buildProfileSheet = (workbook: ExcelJS.Workbook, profile: ClientProfile) => {
  const worksheet = workbook.addWorksheet(profile.sheetName, {
    properties: { defaultRowHeight: 18 }
  });
  worksheet.columns = [
    { width: 22 },
    { width: 24 },
    { width: 20 },
    { width: 16 },
    { width: 14 },
    { width: 30 },
    { width: 30 }
  ];

  const { client } = profile;

  const backRow = worksheet.addRow(["← Վերադառնալ ցուցակ"]);
  worksheet.mergeCells(backRow.number, 1, backRow.number, PROFILE_COLUMN_COUNT);
  const backCell = backRow.getCell(1);
  backCell.value = {
    text: "← Վերադառնալ ցուցակ",
    hyperlink: internalLink(MAIN_SHEET_NAME)
  };
  backCell.font = { color: { argb: LINK_COLOR }, underline: true, bold: true };
  worksheet.addRow([]);

  // Անձնական տվյալներ
  addSectionTitle(worksheet, "Անձնական տվյալներ");
  addKeyValueRow(worksheet, "Անուն Ազգանուն", client.fullName);
  addKeyValueRow(worksheet, "Հեռախոս", client.phone);
  addKeyValueRow(worksheet, "Էլ. փոստ", client.email ?? "");
  addKeyValueRow(worksheet, "Ծննդյան օր", dateText(client.birthDate));
  addKeyValueRow(worksheet, "Հասցե", client.address ?? "");
  addKeyValueRow(worksheet, "Կարգավիճակ", clientStatusText(client));
  addKeyValueRow(worksheet, "VIP", client.isVip ? "Այո" : "Ոչ");
  addKeyValueRow(worksheet, "Բալանս", client.balance ?? 0);
  addKeyValueRow(worksheet, "Զեղչ", client.discount ?? 0);
  addKeyValueRow(worksheet, "Մեկնաբանություն", client.comment ?? "");
  worksheet.addRow([]);

  // Այցելություններ
  if (profile.bookings.length) {
    addSectionTitle(worksheet, "Այցելություններ");
    addTableHeaderRow(worksheet, [
      "Ամսաթիվ",
      "Ժամ",
      "Ծառայություններ",
      "Կարգավիճակ",
      "Մեկնաբանություն"
    ]);
    for (const booking of profile.bookings) {
      addTableBodyRow(worksheet, [
        dateText(booking.date),
        `${booking.startTime} - ${booking.endTime}`,
        getServiceNames(booking),
        booking.status,
        booking.comment ?? ""
      ]);
    }
    worksheet.addRow([]);
  }

  // Պրոցեդուրաների պատմություն
  if (profile.history.length) {
    addSectionTitle(worksheet, "Պրոցեդուրաների պատմություն");
    addTableHeaderRow(worksheet, [
      "Ամսաթիվ",
      "Ծառայություն",
      "Գոտի",
      "Պրեպարատ",
      "Քանակ",
      "Գին",
      "Մեկնաբանություն"
    ]);
    for (const record of profile.history) {
      addTableBodyRow(worksheet, [
        dateText(record.date),
        record.serviceName,
        record.area ?? "",
        record.preparationName ?? "",
        [record.amount, record.unit].filter(Boolean).join(" "),
        record.price ?? "",
        record.comment || record.doctorNotes || ""
      ]);
    }
    worksheet.addRow([]);
  }

  // Պրեպարատներ
  if (profile.preparations.length) {
    addSectionTitle(worksheet, "Պրեպարատներ");
    addTableHeaderRow(worksheet, [
      "Ամսաթիվ",
      "Պրեպարատ",
      "Գոտի",
      "Քանակ",
      "Միավոր",
      "Մեկնաբանություն"
    ]);
    for (const record of profile.preparations) {
      addTableBodyRow(worksheet, [
        dateText(record.date),
        record.preparationName ?? "",
        record.area ?? "",
        record.amount ?? "",
        record.unit ?? "",
        record.comment || record.doctorNotes || ""
      ]);
    }
    worksheet.addRow([]);
  }

  // Նշումներ
  if (profile.notes.length) {
    addSectionTitle(worksheet, "Նշումներ");
    addTableHeaderRow(worksheet, ["Ամսաթիվ", "Նշում", "Կարևոր"]);
    for (const note of profile.notes) {
      addTableBodyRow(worksheet, [
        dateText(note.date),
        note.text,
        note.pinned ? "Այո" : "Ոչ"
      ]);
    }
    worksheet.addRow([]);
  }

  // Լուսանկարներ
  if (profile.photos.length) {
    addSectionTitle(worksheet, "Լուսանկարներ");
    addTableHeaderRow(worksheet, ["Կատեգորիա", "Ամսաթիվ", "Մեկնաբանություն", "Հղում"]);
    for (const photo of profile.photos) {
      addTableBodyRow(worksheet, [
        photo.category,
        dateText(photo.date),
        photo.comment ?? "",
        photo.url
      ]);
    }
    worksheet.addRow([]);
  }

  // SMS
  if (profile.smsLogs.length) {
    addSectionTitle(worksheet, "SMS");
    addTableHeaderRow(worksheet, [
      "Ամսաթիվ",
      "Տեսակ",
      "Կարգավիճակ",
      "Մատակարար",
      "Հաղորդագրություն"
    ]);
    for (const log of profile.smsLogs) {
      addTableBodyRow(worksheet, [
        dateTimeText(log.createdAt),
        log.type,
        log.status,
        log.provider,
        log.message
      ]);
    }
    worksheet.addRow([]);
  }

  return worksheet;
};

export async function buildClientExcelExport(scope: ExportScope = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Dr. Edgar Admin";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;

  const dataset = getDataset(await appRepository.getData(), scope);
  const profiles = buildClientProfiles(dataset);

  buildMainSheet(workbook, profiles);
  for (const profile of profiles) {
    buildProfileSheet(workbook, profile);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// --- Access-ready relational CSV ZIP --------------------------------------

const csvEscape = (value: unknown) => {
  const raw = value instanceof Date ? formatDateForCsv(value) : value;
  const text = raw === undefined || raw === null ? "" : String(raw);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

type CsvColumn = { key: string; header: string };
type CsvRow = Record<string, string | number>;

const buildCsvContent = (columns: CsvColumn[], rows: CsvRow[]) =>
  [
    columns.map((column) => csvEscape(column.header)).join(","),
    ...rows.map((row) =>
      columns.map((column) => csvEscape(row[column.key])).join(",")
    )
  ].join("\r\n");

const buildClientsCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "FullName", header: "FullName" },
      { key: "Phone", header: "Phone" },
      { key: "Comment", header: "Comment" },
      { key: "Balance", header: "Balance" },
      { key: "Discount", header: "Discount" },
      { key: "Birthday", header: "Birthday" },
      { key: "Email", header: "Email" },
      { key: "Address", header: "Address" },
      { key: "Status", header: "Status" }
    ],
    dataset.clients.map((client) => ({
      ClientID: client.id,
      FullName: client.fullName,
      Phone: client.phone,
      Comment: client.comment ?? "",
      Balance: client.balance ?? "",
      Discount: client.discount ?? "",
      Birthday: dateText(client.birthDate),
      Email: client.email ?? "",
      Address: client.address ?? "",
      Status: clientStatusTextEn(client)
    }))
  );

const buildBookingsCsv = (dataset: ExportDataset, clientIndex: ClientIndex) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "BookingID", header: "BookingID" },
      { key: "Date", header: "Date" },
      { key: "StartTime", header: "StartTime" },
      { key: "EndTime", header: "EndTime" },
      { key: "Services", header: "Services" },
      { key: "Status", header: "Status" },
      { key: "Comment", header: "Comment" }
    ],
    dataset.bookings.map((booking) => {
      const client = getBookingClient(booking, clientIndex);
      return {
        ClientID: client?.id ?? booking.clientId ?? "",
        BookingID: booking.id,
        Date: dateText(booking.date),
        StartTime: booking.startTime,
        EndTime: booking.endTime,
        Services: getServiceNames(booking),
        Status: booking.status,
        Comment: booking.comment ?? ""
      };
    })
  );

const buildHistoryCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "HistoryID", header: "HistoryID" },
      { key: "Date", header: "Date" },
      { key: "ServiceName", header: "ServiceName" },
      { key: "AreaZone", header: "AreaZone" },
      { key: "Preparation", header: "Preparation" },
      { key: "Amount", header: "Amount" },
      { key: "Unit", header: "Unit" },
      { key: "Price", header: "Price" },
      { key: "Comment", header: "Comment" }
    ],
    dataset.history.map((record) => ({
      ClientID: record.clientId,
      HistoryID: record.id,
      Date: dateText(record.date),
      ServiceName: record.serviceName,
      AreaZone: record.area ?? "",
      Preparation: record.preparationName ?? "",
      Amount: record.amount ?? "",
      Unit: record.unit ?? "",
      Price: record.price ?? "",
      Comment: record.comment || record.doctorNotes || ""
    }))
  );

const buildPreparationsCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "PreparationID", header: "PreparationID" },
      { key: "Date", header: "Date" },
      { key: "PreparationName", header: "PreparationName" },
      { key: "AreaZone", header: "AreaZone" },
      { key: "Amount", header: "Amount" },
      { key: "Unit", header: "Unit" },
      { key: "Comment", header: "Comment" }
    ],
    dataset.preparations.map((record) => ({
      ClientID: record.clientId,
      PreparationID: record.id,
      Date: dateText(record.date),
      PreparationName: record.preparationName ?? "",
      AreaZone: record.area ?? "",
      Amount: record.amount ?? "",
      Unit: record.unit ?? "",
      Comment: record.comment || record.doctorNotes || ""
    }))
  );

const buildNotesCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "NoteID", header: "NoteID" },
      { key: "Date", header: "Date" },
      { key: "Note", header: "Note" },
      { key: "Important", header: "Important" }
    ],
    dataset.notes.map((note) => ({
      ClientID: note.clientId,
      NoteID: note.id,
      Date: dateText(note.date),
      Note: note.text,
      Important: note.pinned ? "true" : "false"
    }))
  );

const buildPhotosCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "PhotoID", header: "PhotoID" },
      { key: "Category", header: "Category" },
      { key: "Date", header: "Date" },
      { key: "Comment", header: "Comment" },
      { key: "Url", header: "Url" },
      { key: "FileName", header: "FileName" }
    ],
    dataset.photos.map((photo) => ({
      ClientID: photo.clientId,
      PhotoID: photo.id,
      Category: photo.category,
      Date: dateText(photo.date),
      Comment: photo.comment ?? "",
      Url: photo.url,
      FileName: photo.fileName
    }))
  );

const buildSmsCsv = (dataset: ExportDataset) =>
  buildCsvContent(
    [
      { key: "ClientID", header: "ClientID" },
      { key: "SmsLogID", header: "SmsLogID" },
      { key: "Date", header: "Date" },
      { key: "Type", header: "Type" },
      { key: "Status", header: "Status" },
      { key: "Provider", header: "Provider" },
      { key: "Message", header: "Message" },
      { key: "Error", header: "Error" }
    ],
    dataset.smsLogs.map((log) => ({
      ClientID: log.clientId ?? "",
      SmsLogID: log.id,
      Date: dateTimeText(log.createdAt),
      Type: log.type,
      Status: log.status,
      Provider: log.provider,
      Message: log.message,
      Error: log.error ?? ""
    }))
  );

const accessReadme = [
  "Dr. Edgar — Հաճախորդների տվյալների ներմուծումը Access-ում",
  "",
  "Այս արխիվը պարունակում է կապակցված աղյուսակներ (CSV ֆայլեր)։",
  "Clients.csv-ը գլխավոր աղյուսակն է, մնացած աղյուսակները կապվում են նրա հետ ClientID դաշտով։",
  "",
  "1. ՆԵՐՄՈՒԾՈՒՄ",
  "   Access -> External Data -> New Data Source -> From File -> Text File։",
  "   Ընտրեք յուրաքանչյուր CSV ֆայլը առանձին և ներմուծեք որպես նոր աղյուսակ։",
  "   Կոդավորումը՝ UTF-8, բաժանիչը՝ ստորակետ ( , ), իսկ առաջին տողը դաշտերի անուններն են։",
  "",
  "2. ԱՌԱՋՆԱՅԻՆ ԲԱՆԱԼԻ",
  "   Բացեք Clients աղյուսակը Design View-ում և ClientID դաշտը դարձրեք Primary Key։",
  "",
  "3. ԿԱՊԵՐ (RELATIONSHIPS)",
  "   Database Tools -> Relationships։",
  "   Ավելացրեք բոլոր աղյուսակները և Clients.ClientID-ից քաշեք կապ դեպի հետևյալ դաշտերը՝",
  "     Bookings.ClientID",
  "     History.ClientID",
  "     Preparations.ClientID",
  "     Notes.ClientID",
  "     Photos.ClientID",
  "     SMS.ClientID",
  "   Բոլոր կապերը «մեկ առ շատ» (one-to-many) տիպի են։",
  "",
  "4. ԱՐԴՅՈՒՆՔ",
  "   Clients աղյուսակում յուրաքանչյուր տողի ձախ կողմի «+» կոճակը սեղմելիս",
  "   կբացվեն տվյալ հաճախորդի բոլոր կապակցված գրառումները՝ այցելություններ,",
  "   պրոցեդուրաներ, պրեպարատներ, նշումներ, լուսանկարներ և SMS-եր։",
  "   Սա նույն արդյունքն է, ինչ ծրագրում հաճախորդի պրոֆիլը բացելը։"
].join("\r\n");

const buildZip = async (files: CsvFile[]) =>
  new Promise<Buffer>((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
    archive.on("warning", reject);
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    for (const file of files) {
      archive.append(Buffer.from(`﻿${file.content}`, "utf-8"), {
        name: file.name
      });
    }

    void archive.finalize();
  });

export async function buildClientAccessCsvZip(scope: ExportScope = {}) {
  const dataset = getDataset(await appRepository.getData(), scope);
  const clientIndex = buildClientIndex(dataset.allClients);

  const files: CsvFile[] = [
    { name: "Clients.csv", content: buildClientsCsv(dataset) },
    { name: "Bookings.csv", content: buildBookingsCsv(dataset, clientIndex) },
    { name: "History.csv", content: buildHistoryCsv(dataset) },
    { name: "Preparations.csv", content: buildPreparationsCsv(dataset) },
    { name: "Notes.csv", content: buildNotesCsv(dataset) },
    { name: "Photos.csv", content: buildPhotosCsv(dataset) },
    { name: "SMS.csv", content: buildSmsCsv(dataset) },
    { name: "ԿԱՐԴԱ_ՆԱԽ.txt", content: accessReadme }
  ];

  return buildZip(files);
}
