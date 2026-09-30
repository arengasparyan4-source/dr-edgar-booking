import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { settingsSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const data = await appRepository.getData();
    return ok({ settings: data.settings });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const settings = settingsSchema.parse(await request.json());
    const data = await appRepository.updateSettings(settings);
    return ok({ success: true, settings: data.settings });
  } catch (error) {
    return errorResponse(error);
  }
}
