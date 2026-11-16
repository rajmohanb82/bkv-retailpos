/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        annavya: {
          navy: "#081F5C",
          royal: "#1246A8",
          sky: "#45A7E6",
          ice: "#EBF4FF",
          cream: "#F8F3E6",
          brass: "#C88A2B",
          saffron: "#D97706",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
