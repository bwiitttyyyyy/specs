/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Shared design tokens (Principle I/II) — a calm slate + indigo palette.
        ink: "#0f172a",
        muted: "#64748b",
        line: "#e2e8f0",
        surface: "#ffffff",
        canvas: "#f8fafc",
        brand: "#4f46e5",
      },
    },
  },
  plugins: [],
};
