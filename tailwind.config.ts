import type { Config } from "tailwindcss";
import daisyui from "daisyui";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular"],
      },
    },
  },
  daisyui: {
    themes: [
      {
        frame: {
          primary: "#7C3AED",
          "primary-content": "#f5f5ff",
          secondary: "#0EA5E9",
          "secondary-content": "#02131f",
          accent: "#F97316",
          "accent-content": "#230b02",
          neutral: "#111827",
          "neutral-content": "#f9fafb",
          "base-100": "#0b1120",
          "base-200": "#131a2c",
          "base-300": "#1a2236",
          "base-content": "#e2e8f0",
          info: "#38bdf8",
          success: "#4ade80",
          warning: "#facc15",
          error: "#f87171",
        },
      },
      "light",
    ],
  },
  plugins: [daisyui],
};

export default config;
