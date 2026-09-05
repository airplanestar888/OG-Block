import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        baseblue: "#0000ff",
        mint: "#00c48c",
        ember: "#f97316"
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
