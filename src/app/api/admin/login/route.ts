import { type NextRequest, NextResponse } from "next/server";
import {
  DEMO_ADMIN_PASSWORD,
  createAdminSession,
  isAdminPasswordConfigured,
  isDemoMode,
  verifyAdminPassword
} from "@/lib/admin/auth";
import {
  checkLoginAllowed,
  clearLoginFailures,
  getClientKey,
  recordLoginFailure
} from "@/lib/admin/loginRateLimit";

export const runtime = "nodejs";

const invalidPasswordResponse = () =>
  NextResponse.json(
    { success: false, code: "invalid_password", message: "Invalid password" },
    { status: 401 }
  );

/** Tells the login page whether to show the demo password. */
export async function GET() {
  return NextResponse.json(
    isDemoMode() ? { demoMode: true, demoPassword: DEMO_ADMIN_PASSWORD } : { demoMode: false }
  );
}

export async function POST(request: NextRequest) {
  const clientKey = getClientKey(request);
  const rateLimit = checkLoginAllowed(clientKey);

  if (!rateLimit.allowed) {
    console.warn("[admin/login] Too many failed attempts", { clientKey });
    return NextResponse.json(
      {
        success: false,
        code: "too_many_attempts",
        message: "Too many failed attempts. Try again later."
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  if (!isAdminPasswordConfigured()) {
    console.error(
      "[admin/login] ADMIN_PASSWORD is not configured - the admin panel is disabled. " +
        "Set ADMIN_PASSWORD in the environment."
    );
    return invalidPasswordResponse();
  }

  let password: unknown;
  try {
    ({ password } = (await request.json()) as { password?: unknown });
  } catch {
    password = undefined;
  }

  if (!verifyAdminPassword(password)) {
    recordLoginFailure(clientKey);
    return invalidPasswordResponse();
  }

  clearLoginFailures(clientKey);
  await createAdminSession();

  return NextResponse.json({ success: true });
}
