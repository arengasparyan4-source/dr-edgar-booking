import { type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin/auth";
import { errorResponse, ok } from "@/lib/api/responses";
import { appRepository } from "@/lib/repositories/appRepository";
import { scheduleSchema } from "@/lib/validation/schemas";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const data = await appRepository.getData();
    return ok({
      workingHours: data.workingHours,
      blockedTimes: data.blockedTimes
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const payload = scheduleSchema.parse(await request.json());
    const data = await appRepository.updateSchedule(
      payload.workingHours,
      payload.blockedTimes
    );
    return ok({
      success: true,
      workingHours: data.workingHours,
      blockedTimes: data.blockedTimes
    });
  } catch (error) {
    return errorResponse(error);
  }
}
