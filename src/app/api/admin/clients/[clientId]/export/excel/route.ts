import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse } from "@/lib/api/responses";
import {
  buildExportDownloadResponse,
  getExportScopeFromRequest
} from "@/lib/exports/exportResponse";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ clientId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin(request);
    const { clientId } = await context.params;
    return buildExportDownloadResponse(
      "excel",
      getExportScopeFromRequest(request, clientId)
    );
  } catch (error) {
    return errorResponse(error);
  }
}
