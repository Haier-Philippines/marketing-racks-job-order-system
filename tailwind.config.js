/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./features/**/*.{ts,tsx}','./providers/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"','system-ui','sans-serif'],
        display: ['"DM Sans"','system-ui','sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },
        haier: { blue: '#1a56db', dark: '#1a1f36', light: '#f8fafc' },
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,.06),0 4px 12px rgba(0,0,0,.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,.1)',
        modal: '0 20px 60px rgba(0,0,0,.15)',
      },
      animation: {
        'fade-in': 'fadeIn .25s ease',
        'slide-up': 'slideUp .3s cubic-bezier(.16,1,.3,1)',
        'slide-in': 'slideIn .3s cubic-bezier(.16,1,.3,1)',
      },
      keyframes: {
        fadeIn:  { from:{ opacity:0 }, to:{ opacity:1 } },
        slideUp: { from:{ opacity:0,transform:'translateY(12px)' }, to:{ opacity:1,transform:'translateY(0)' } },
        slideIn: { from:{ opacity:0,transform:'translateX(-12px)' }, to:{ opacity:1,transform:'translateX(0)' } },
      },
    },
  },
  plugins: [],
}
