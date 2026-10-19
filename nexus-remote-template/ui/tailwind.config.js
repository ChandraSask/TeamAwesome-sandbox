/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // `text-13` / `text-11` are used throughout the shared UI kit.
      fontSize: { 13: '13px', 11: '11px' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
      },
      animation: {
        'fade-in': 'fade-in 250ms ease-out',
        'fade-in-up': 'fade-in-up 350ms ease-out',
        'slide-in-right': 'slide-in-right 300ms ease-out',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
