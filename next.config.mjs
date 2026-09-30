import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(fileURLToPath(import.meta.url));

/**
 * Security headers for every response. No script/style CSP: Next.js inlines
 * its bootstrap scripts, and a nonce-based policy would need middleware. The
 * policy below still blocks framing (clickjacking), plugins and foreign form
 * targets.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Browsers ignore it over plain http (local runs), it matters behind https.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // The admin and the API are not for search engines; API answers are never cached.
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" }
        ]
      }
    ];
  },
  turbopack: {
    root: projectRoot
  },
  async rewrites() {
    return {
      // Portfolio images uploaded after `next build` are not served from
      // public/ by `next start`. Files that exist in public/ are still served
      // directly; anything missing falls through to the media route handler.
      fallback: [
        {
          source: "/uploads/portfolio/:fileName",
          destination: "/media/portfolio/:fileName"
        }
      ]
    };
  }
};

export default nextConfig;
