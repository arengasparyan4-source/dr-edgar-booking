import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { portfolioItemSchema } from "@/lib/validation/schemas";

const portfolioSchema = z.object({
  portfolio: z.array(portfolioItemSchema)
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const data = await appRepository.getData();
    return ok({ portfolio: data.portfolio.sort((a, b) => a.order - b.order) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = portfolioSchema.parse(await request.json());
    const data = await appRepository.updatePortfolio(payload.portfolio);
    return ok({ success: true, portfolio: data.portfolio });
  } catch (error) {
    return errorResponse(error);
  }
}
