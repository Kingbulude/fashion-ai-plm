import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
export default config;
