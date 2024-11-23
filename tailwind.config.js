/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0F1828',
        secondary: '#152033',
        'text-primary': '#0F1828',
        'text-secondary': '#ADB5BD',
        'accent-blue': '#002DE3',
        'accent-green': '#00BA88',
        'background': '#F7F7FC',
        'divider': '#EDEDED',
      },
      fontFamily: {
        mulish: ['Mulish', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
