import ExcelJS from "exceljs";

/**
 * Reads the first worksheet of an .xlsx file, or a .csv file, into rows of
 * plain cell values (strings, numbers, booleans, Dates). Replaces SheetJS
 * (`xlsx`), which has unfixed high-severity advisories.
 *
 * Blank rows are kept, so `rows[i]` is spreadsheet row `i + 1`.
 */
export type CellValue = string | number | boolean | Date | null;

const isZip = (buffer: Buffer) =>
  buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;

/** exceljs cell value (rich text, formula, hyperlink, error...) -> plain value. */
function toPlainValue(value: ExcelJS.CellValue): CellValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value instanceof Date
  ) {
    return value;
  }

  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("");
    }

    if ("formula" in value || "sharedFormula" in value) {
      const result = (value as { result?: ExcelJS.CellValue }).result;
      return result === undefined ? null : toPlainValue(result);
    }

    if ("text" in value) {
      return toPlainValue((value as { text: ExcelJS.CellValue }).text);
    }

    if ("error" in value) {
      return null;
    }
  }

  return String(value);
}

async function readXlsxRows(buffer: Buffer): Promise<CellValue[][]> {
  const workbook = new ExcelJS.Workbook();
  // exceljs' typings predate the generic Buffer<ArrayBuffer> of newer @types/node.
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return [];
  }

  const rows: CellValue[][] = [];
  const columnCount = sheet.columnCount;

  for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const values: CellValue[] = [];

    for (let column = 1; column <= columnCount; column += 1) {
      values.push(toPlainValue(row.getCell(column).value));
    }

    rows.push(values);
  }

  return rows;
}

/** UTF-8 (with or without BOM); falls back to Windows-1251 for old Excel CSVs. */
function decodeText(buffer: Buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer);

  if (!utf8.includes("�")) {
    return utf8.replace(/^﻿/, "");
  }

  try {
    return new TextDecoder("windows-1251").decode(buffer);
  } catch {
    return utf8;
  }
}

/** Picks , ; or tab - whichever splits the first non-empty line the most. */
function detectDelimiter(text: string) {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  const unquoted = firstLine.replace(/"[^"]*"/g, "");
  const candidates = [",", ";", "\t"];
  const counts = candidates.map((delimiter) => unquoted.split(delimiter).length - 1);
  const best = counts.indexOf(Math.max(...counts));

  return counts[best] > 0 ? candidates[best] : ",";
}

/**
 * RFC 4180 CSV: quoted fields, "" escapes, delimiters and line breaks inside
 * quotes. Every cell stays a string, so phone numbers keep leading zeros.
 */
export function parseCsv(text: string): string[][] {
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
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
      continue;
    }

    if (char === '"' && field === "") {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
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
}

export async function readSpreadsheetRows(buffer: Buffer): Promise<CellValue[][]> {
  if (isZip(buffer)) {
    return readXlsxRows(buffer);
  }

  return parseCsv(decodeText(buffer));
}
