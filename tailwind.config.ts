import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        pearl: "#F8F3EF",
        porcelain: "#FFFCF8",
        champagne: "#E8D3B9",
        blush: "#EAB8B4",
        ink: "#201C1A",
        graphite: "#3A3430",
        sage: "#879A8A",
        clinic: "#1D4D6B"
      },
      boxShadow: {
        premium: "0 24px 80px rgba(32, 28, 26, 0.13)",
        soft: "0 18px 50px rgba(58, 52, 48, 0.10)"
      },
      backgroundImage: {
        "premium-surface":
          "linear-gradient(135deg, rgba(255,252,248,0.96), rgba(248,243,239,0.88))",
        "champagne-glow":
          "linear-gradient(135deg, rgba(232,211,185,0.92), rgba(234,184,180,0.72), rgba(135,154,138,0.72))",
        "hero-shade":
          "linear-gradient(180deg, rgba(32,28,26,0.04) 0%, rgba(32,28,26,0.18) 42%, rgba(32,28,26,0.82) 100%)"
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        softPulse: {
          "0%, 100%": { opacity: "0.78" },
          "50%": { opacity: "1" }
        }
      },
      animation: {
        "fade-up": "fadeUp 700ms ease-out both",
        "soft-pulse": "softPulse 3.6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
