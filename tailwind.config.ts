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
        "archivo-black": ["var(--font-archivo-black)", "Impact", "sans-serif"],
        "bebas-neue": ["var(--font-bebas-neue)", "Impact", "sans-serif"],
        "cormorant-garamond": ["var(--font-cormorant-garamond)", "serif"],
        "comic-sans": ['"Comic Sans MS"', '"Comic Sans"', "cursive"],
        "dm-sans": ["var(--font-dm-sans)", "sans-serif"],
        "josefin-sans": ["var(--font-josefin-sans)", "sans-serif"],
        lexend: ["var(--font-lexend)", "sans-serif"],
        manrope: ["var(--font-manrope)", "sans-serif"],
        merriweather: ["var(--font-merriweather)", "serif"],
        montserrat: ["var(--font-montserrat)", "sans-serif"],
        nunito: ["var(--font-nunito)", "sans-serif"],
        outfit: ["var(--font-outfit)", "sans-serif"],
        "playfair-display": ["var(--font-playfair-display)", "serif"],
        poppins: ["var(--font-poppins)", "sans-serif"],
        quicksand: ["var(--font-quicksand)", "sans-serif"],
        raleway: ["var(--font-raleway)", "sans-serif"],
        "roboto-mono": ["var(--font-roboto-mono)", "monospace"],
        rubik: ["var(--font-rubik)", "sans-serif"],
        sora: ["var(--font-sora)", "sans-serif"],
        "space-grotesk": ["var(--font-space-grotesk)", "sans-serif"],
        urbanist: ["var(--font-urbanist)", "sans-serif"],
        "work-sans": ["var(--font-work-sans)", "sans-serif"]
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
