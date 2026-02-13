/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cis: {
          green: '#32A402',
          'green-soft': '#ebf6e6',
          orange: '#ffa500',
          'orange-soft': '#fff6e6',
          red: '#ff0000',
          'red-soft': '#ffe6e6',
        },
      },
    },
  },
  plugins: [],
};
