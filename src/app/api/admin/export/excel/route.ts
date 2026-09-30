import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/api/responses";
import {
  buildExportDownloadResponse,
  getExportScopeFromRequest
} from "@/lib/exports/exportResponse";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    return buildExportDownloadResponse(
      "excel",
      getExportScopeFromRequest(request)
    );
  } catch (error) {
    return errorResponse(error);
  }
}
