import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1a1a2e",
        accent: "#e94560",
        income: "#00b894",
        expense: "#d63031",
        invoice: "#0984e3",
        bg: "#f8f9fa",
        surface: "#ffffff",
        border: "#e2e8f0",
        text: "#1a202c",
        muted: "#718096",
      },
      fontFamily: {
        display: ["Sora", "sans-serif"],
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
