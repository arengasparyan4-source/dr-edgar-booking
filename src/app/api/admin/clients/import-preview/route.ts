import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { parseClientImportWorkbook } from "@/lib/clients/clientImport";
import { clientsRepository } from "@/lib/repositories/clientsRepository";

export const runtime = "nodejs";

const maxFileSize = 5 * 1024 * 1024;
const allowedExtensions = new Set([".xlsx", ".csv"]);

const getFileExtension = (fileName: string) => {
  const normalizedName = fileName.toLocaleLowerCase();
  const dotIndex = normalizedName.lastIndexOf(".");
  return dotIndex >= 0 ? normalizedName.slice(dotIndex) : "";
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, code: "file_required", message: "file is required" },
        { status: 400 }
      );
    }

    const extension = getFileExtension(file.name);

    if (!allowedExtensions.has(extension)) {
      return NextResponse.json(
        {
          success: false,
          code: "unsupported_file",
          message: "Only .xlsx and .csv files are supported"
        },
        { status: 400 }
      );
    }

    if (file.size > maxFileSize) {
      return NextResponse.json(
        { success: false, code: "file_too_large", message: "File is too large" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const clients = await clientsRepository.listClients();
    const preview = await parseClientImportWorkbook(buffer, clients);

    return ok({ success: true, preview });
  } catch (error) {
    return errorResponse(error);
  }
}
