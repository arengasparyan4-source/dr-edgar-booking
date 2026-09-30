import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import type { ClientImportRow, DuplicateBehavior } from "@/lib/clients/clientImport";
import { clientsRepository } from "@/lib/repositories/clientsRepository";

export const runtime = "nodejs";

const isDuplicateBehavior = (value: unknown): value is DuplicateBehavior =>
  value === "update" || value === "skip";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const body = (await request.json()) as {
      rows?: ClientImportRow[];
      duplicateBehavior?: unknown;
    };

    if (!Array.isArray(body.rows)) {
      return NextResponse.json(
        { success: false, code: "rows_required", message: "rows are required" },
        { status: 400 }
      );
    }

    const duplicateBehavior = isDuplicateBehavior(body.duplicateBehavior)
      ? body.duplicateBehavior
      : "update";
    const summary = await clientsRepository.importRows(body.rows, duplicateBehavior);

    return ok({
      success: true,
      summary,
      clients: await clientsRepository.listClients()
    });
  } catch (error) {
    return errorResponse(error);
  }
}
