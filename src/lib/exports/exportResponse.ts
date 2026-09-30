import { type NextRequest, NextResponse } from "next/server";
import {
  buildClientAccessCsvZip,
  buildClientExcelExport,
  type ExportRange,
  type ExportScope
} from "@/lib/exports/clientDataExport";

export type ExportFormat = "excel" | "access";

const exportRanges = new Set<ExportRange>(["all", "custom"]);

const fileDate = () => new Date().toISOString().slice(0, 10);

const isExportRange = (value: string | null): value is ExportRange =>
  Boolean(value && exportRanges.has(value as ExportRange));

const sanitizeFilePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "export";

export const getExportScopeFromRequest = (
  request: NextRequest,
  clientId?: string
): ExportScope => {
  const rangeParam = request.nextUrl.searchParams.get("range");
  const requestedClientId =
    clientId ?? request.nextUrl.searchParams.get("clientId") ?? undefined;

  return {
    clientId: requestedClientId,
    range: isExportRange(rangeParam) ? rangeParam : "all",
    from: request.nextUrl.searchParams.get("from") ?? undefined,
    to: request.nextUrl.searchParams.get("to") ?? undefined
  };
};

export const buildExportDownloadResponse = async (
  format: ExportFormat,
  scope: ExportScope
) => {
  const range = scope.range ?? "all";
  const scopeLabel = scope.clientId
    ? `client-${sanitizeFilePart(scope.clientId)}`
    : "all-clients";
  const baseFileName = `dr-edgar-${scopeLabel}-${range}-${fileDate()}`;

  if (format === "excel") {
    const buffer = await buildClientExcelExport(scope);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${baseFileName}.xlsx"`
      }
    });
  }

  const buffer = await buildClientAccessCsvZip(scope);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${baseFileName}-access-csv.zip"`
    }
  });
};
