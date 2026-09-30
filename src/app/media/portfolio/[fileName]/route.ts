import { NextResponse, type NextRequest } from "next/server";
import { readPortfolioImageFile } from "@/lib/portfolio/portfolioImageStorage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ fileName: string }>;
};

/**
 * Serves uploaded portfolio images from public/uploads/portfolio at request
 * time (see PORTFOLIO_MEDIA_PREFIX for why public/ alone is not enough).
 * Every upload gets a new unique file name, so the response can be cached
 * forever: replacing a photo changes its URL.
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const { fileName } = await context.params;
  const file = await readPortfolioImageFile(fileName);

  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.buffer), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.buffer.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
