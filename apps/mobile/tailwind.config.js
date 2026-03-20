/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./features/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#0B1020",
        iris: "#4F46E5",
        violet: "#7C3AED",
        sky: "#38BDF8",
        aqua: "#22D3EE",
        cloud: "#F8FAFC",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        body: ["SpaceGrotesk_500Medium"],
      },
      boxShadow: {
        glass: "0px 18px 40px rgba(34, 211, 238, 0.12)",
      },
    },
  },
  plugins: [],
};
