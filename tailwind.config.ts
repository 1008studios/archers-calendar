import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
        inter: ["var(--font-inter)", "sans-serif"],
        lexend: ["var(--font-lexend)", "sans-serif"],
        manrope: ["var(--font-manrope)", "sans-serif"],
        merriweather: ["var(--font-merriweather)", "serif"],
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        nunito: ["var(--font-nunito)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        "roboto-mono": ["var(--font-roboto-mono)", "monospace"],
        rubik: ["var(--font-rubik)", "sans-serif"],
        "space-grotesk": ["var(--font-space-grotesk)", "sans-serif"]
      },
      colors: {
        dlsu: {
          DEFAULT: "#185A37",
          vivid: "#00703C",
          ink: "#06110C"
        }
      },
      boxShadow: {
        panel: "0 24px 80px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

export default config;
