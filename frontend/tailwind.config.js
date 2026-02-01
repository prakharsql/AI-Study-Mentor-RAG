/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
<<<<<<< HEAD
    "./src/**/*.{js,jsx,ts,tsx}",
=======
    "./src/**/*.{js,jsx}",
>>>>>>> c81f1172ae5ef5504dec29715775c2a2f59c8bfd
  ],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        fadeIn: "fadeIn 0.8s ease-out",
        slideUp: "slideUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: 0, transform: "scale(0.98)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
        slideUp: {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
