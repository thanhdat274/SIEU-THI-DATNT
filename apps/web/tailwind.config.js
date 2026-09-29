/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        retro: {
          dark: '#1b1c1e',
          wood: '#583101',
          woodLight: '#8b5a2b',
          woodWarm: '#d4a373',
          paper: '#faedcd',
          paperLight: '#fefae0',
          red: '#b7094c',
          yellow: '#ffd166',
          teal: '#2d6a4f',
          blue: '#1d3557',
        },
      },
      fontFamily: {
        retro: ['"Courier New"', 'Courier', 'monospace', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
