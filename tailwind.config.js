/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Manrope"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f6f2',
          100: '#d9e8dd',
          500: '#1f613b',
          600: '#164d2f',
          700: '#0f3b23',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0, 0, 0, 0.06)',
      },
    },
  },
  plugins: [],
}
