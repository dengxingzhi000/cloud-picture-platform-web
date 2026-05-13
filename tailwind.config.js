/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "var(--stroke-soft)",
        input: "var(--stroke-soft)",
        ring: "var(--accent)",
        background: "var(--bg-surface)",
        foreground: "var(--ink-strong)",
        primary: {
          DEFAULT: "var(--accent)",
          foreground: "#fff",
        },
        secondary: {
          DEFAULT: "var(--accent-cool)",
          foreground: "#fff",
        },
        destructive: {
          DEFAULT: "var(--el-color-danger)",
          foreground: "#fff",
        },
        muted: {
          DEFAULT: "var(--bg-elevated)",
          foreground: "var(--ink-soft)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#fff",
        },
      },
      borderRadius: {
        lg: "var(--el-border-radius-base)",
        md: "calc(var(--el-border-radius-base) - 2px)",
        sm: "calc(var(--el-border-radius-base) - 4px)",
      },
    },
  },
  plugins: [],
}
