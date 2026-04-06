/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        ink: '#031221',
        deep: '#07192e',
        mist: '#c7d2e5',
        glow: '#f59e0b',
        tide: '#22d3ee',
      },
      boxShadow: {
        panel: '0 28px 80px rgba(2, 8, 23, 0.45)',
      },
    },
  },
  plugins: [],
};
