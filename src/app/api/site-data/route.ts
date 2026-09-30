import { appRepository } from "@/lib/repositories/appRepository";
import { ok, errorResponse } from "@/lib/api/responses";

export async function GET() {
  try {
    return ok(await appRepository.getPublicSiteData());
  } catch (error) {
    return errorResponse(error, "Site data request failed");
  }
}
