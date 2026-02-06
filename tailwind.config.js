/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './utils/**/*.{js,ts,jsx,tsx}',
    './functions/**/*.{js,ts,jsx,tsx}',
    './types.ts',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f0f12',
        surface: '#18181b',
        surfaceHover: '#27272a',
        primary: '#3b82f6',
        accent: '#f43f5e',
      },
    },
  },
  plugins: [],
};
