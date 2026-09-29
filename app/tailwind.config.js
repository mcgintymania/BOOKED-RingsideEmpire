/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Matches the game's own existing desktop breakpoint (see
      // .booked-bottom-nav-spacer in App.jsx's FONT_IMPORT css block) so the
      // sidebar and the mobile bottom nav switch over at the same width.
      screens: { dt: "900px" },
    },
  },
  plugins: [],
};
