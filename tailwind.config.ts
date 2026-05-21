import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        impact: ["Impact", "Arial Black", "sans-serif"],
      },
      animation: {
        "pulse-fire": "pulse-fire 2s ease-in-out infinite",
        "shake": "shake 0.4s ease-in-out",
        "score-pop": "score-pop 0.6s cubic-bezier(0.68,-0.55,0.27,1.55)",
      },
      keyframes: {
        "pulse-fire": {
          "0%, 100%": { textShadow: "0 0 10px #f97316, 0 0 20px #f97316" },
          "50%": { textShadow: "0 0 20px #ef4444, 0 0 40px #ef4444, 0 0 60px #ef4444" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-4px)" },
          "80%": { transform: "translateX(4px)" },
        },
        "score-pop": {
          "0%": { transform: "scale(0)", opacity: "0" },
          "80%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
