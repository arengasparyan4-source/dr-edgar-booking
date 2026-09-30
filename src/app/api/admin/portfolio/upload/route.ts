import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import {
  PortfolioImageValidationError,
  savePortfolioImageFile
} from "@/lib/portfolio/portfolioImageStorage";
import { errorResponse, ok } from "@/lib/api/responses";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new PortfolioImageValidationError("Invalid file type");
    }

    const storedFile = await savePortfolioImageFile(file);
    return ok({ success: true, imageUrl: storedFile.url });
  } catch (error) {
    if (error instanceof PortfolioImageValidationError) {
      return NextResponse.json(
        {
          success: false,
          code: error.message === "File too large" ? "file_too_large" : "invalid_file_type",
          error: error.message,
          message: error.message
        },
        { status: 400 }
      );
    }

    return errorResponse(error);
  }
}
