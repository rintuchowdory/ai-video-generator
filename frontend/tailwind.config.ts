import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#12151C",
        panel: "#181C25",
        line: "#2A2F3A",
        brass: "#C9A227",
        brassDim: "#8C7218",
        paper: "#EDEAE3",
        muted: "#8B93A3",
        fail: "#C4553D",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
};
export default config;
