/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        void: '#0A0A0F',
        surface: '#13131C',
        card: '#1C1C28',
        border: '#2A2A3A',
        bone: '#E8E0C9',
        cyan: {
          glow: '#2DE8D0',
          core: '#00D9C0',
          deep: '#00A896',
          shadow: '#054A42',
        },
        state: {
          complete: '#3DD68C',
          failed: '#FF6B6B',
          streak: '#FFA94D',
          pending: '#5A5A6E',
        },
      },
      fontFamily: {
        display: ['Orbitron_700Bold'],
        sans: ['Inter_400Regular'],
      },
    },
  },
  plugins: [],
};
