/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sacred: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Telugu"', 'system-ui', 'sans-serif'],
        display: ['"Cormorant Garamond"', '"Cinzel"', 'Georgia', 'serif'],
        sacred: ['"Cinzel"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
