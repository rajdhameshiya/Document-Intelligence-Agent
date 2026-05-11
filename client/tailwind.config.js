/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1E3A5F',
        accent: '#E8533A',
        success: '#22C55E',
        warning: '#F59E0B',
        error: '#EF4444',
        conflict: '#8B5CF6',
        bg: '#F8FAFC',
        card: '#FFFFFF',
        borderc: '#E2E8F0',
        textp: '#0F172A',
        texts: '#64748B'
      }
    }
  },
  plugins: []
};
