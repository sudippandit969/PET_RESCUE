/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class", // Enable class-based dark mode
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "primary-blue": "#1e3a8a",
        "primary-teal": "#14b8a6",
        "accent-yellow": "#fbbf24",
        "success-green": "#10b981",
        "error-red": "#ef4444",
      },
      backgroundImage: {
        "gradient-primary":
          "linear-gradient(135deg, #1e3a8a 0%, #0891b2 50%, #14b8a6 100%)",
        "gradient-accent": "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.3s ease-out",
        slideUp: "slideUp 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
