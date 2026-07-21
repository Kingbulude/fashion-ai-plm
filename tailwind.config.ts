import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "DM Sans", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "DM Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SF Mono", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        cardForeground: "var(--card-foreground)",
        popover: "var(--popover)",
        popoverForeground: "var(--popover-foreground)",
        primary: "var(--primary)",
        primaryForeground: "var(--primary-foreground)",
        secondary: "var(--secondary)",
        secondaryForeground: "var(--secondary-foreground)",
        muted: "var(--muted)",
        mutedForeground: "var(--muted-foreground)",
        accent: "var(--accent)",
        accentForeground: "var(--accent-foreground)",
        destructive: "var(--destructive)",
        destructiveForeground: "var(--destructive-foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        navy: {
          50: "var(--navy-50)",
          100: "var(--navy-100)",
          200: "var(--navy-200)",
          300: "var(--navy-300)",
          400: "var(--navy-400)",
          500: "var(--navy-500)",
          600: "var(--navy-600)",
          700: "var(--navy-700)",
          800: "var(--navy-800)",
          900: "var(--navy-900)",
        },
        terracotta: {
          50: "var(--terracotta-50)",
          100: "var(--terracotta-100)",
          200: "var(--terracotta-200)",
          300: "var(--terracotta-300)",
          400: "var(--terracotta-400)",
          500: "var(--terracotta-500)",
          600: "var(--terracotta-600)",
        },
        sand: {
          50: "var(--sand-50)",
          100: "var(--sand-100)",
          200: "var(--sand-200)",
          300: "var(--sand-300)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        premium: "var(--shadow-premium)",
        terracotta: "var(--shadow-terracotta)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.5s ease-in-out infinite",
        fadeIn: "fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        slideIn: "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
