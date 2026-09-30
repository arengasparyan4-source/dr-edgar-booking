import { NextResponse } from "next/server";
import { clearAdminSession } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST() {
  // Revokes the session server-side as well as dropping the cookie, so a copied
  // cookie value is useless after logout.
  await clearAdminSession();
  return NextResponse.json({ success: true });
}
