// client/tailwind.config.js
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bitcoin: {
          orange: '#F7931A',
          dark: '#121212',
          gray: '#1E1E1E',
        },
      },
      backgroundImage: {
        'grid-dark': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
        'glow': 'radial-gradient(60% 60% at 50% 40%, rgba(247,147,26,0.25) 0%, rgba(247,147,26,0) 60%)',
      },
      keyframes: {
        'grad-move': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        'float-y': {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'grad-move': 'grad-move 12s ease infinite',
        'float-y': 'float-y 6s ease-in-out infinite',
      },
      boxShadow: {
        glow: '0 0 0 4px rgba(247,147,26,0.15)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')], // quita esta línea si no instalas el plugin
}
