/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'slide-up-fade': 'slide-up-fade 0.6s ease-out both',
        'spin-slow': 'spin-slow 12s linear infinite',
        'border-glow': 'border-glow 3s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 1.5s ease-out infinite',
      },
      boxShadow: {
        'glow-blue': '0 0 40px -8px rgba(59, 130, 246, 0.3)',
        'glow-purple': '0 0 40px -8px rgba(139, 92, 246, 0.3)',
        'glow-emerald': '0 0 40px -8px rgba(16, 185, 129, 0.3)',
        'premium': '0 4px 60px -12px rgba(0, 0, 0, 0.08)',
        'premium-lg': '0 8px 80px -16px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'mesh-gradient': 'linear-gradient(135deg, rgba(59, 130, 246, 0.03) 0%, transparent 50%, rgba(139, 92, 246, 0.03) 100%)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
