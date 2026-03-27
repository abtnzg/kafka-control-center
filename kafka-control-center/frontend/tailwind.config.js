export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0f172a",
        card: "#1e293b",
        text: "#e2e8f0",
        accent: "#6366f1",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};