import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        baseblue: "#0052ff",
        mint: "#00c48c",
        ember: "#f97316"
      }
    }
  },
  plugins: []
};

export default config;
