import { type NextRequest, NextResponse } from "next/server";
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

    const format = request.nextUrl.searchParams.get("format") ?? "excel";
    const scope = request.nextUrl.searchParams.get("scope") ?? "all";
    const clientId = request.nextUrl.searchParams.get("clientId") ?? undefined;

    if (scope === "client" && !clientId) {
      return NextResponse.json(
        {
          success: false,
          code: "client_id_required",
          error: "clientId is required",
          message: "clientId is required"
        },
        { status: 400 }
      );
    }

    const exportScope = getExportScopeFromRequest(
      request,
      scope === "client" ? clientId : undefined
    );

    if (format === "excel") {
      return buildExportDownloadResponse("excel", exportScope);
    }

    if (format === "access") {
      return buildExportDownloadResponse("access", exportScope);
    }

    return NextResponse.json(
      {
        success: false,
        code: "unsupported_export_format",
        error: "Unsupported export format",
        message: "Unsupported export format"
      },
      { status: 400 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
