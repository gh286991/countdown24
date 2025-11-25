/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        midnight: '#0a0e1e',
        'midnight-light': '#151b2e',
        // 柔和的聖誕節主色調
        'christmas-red': '#c85a5a',
        'christmas-red-light': '#d67a7a',
        'christmas-red-dark': '#b84a4a',
        'christmas-green': '#6b9b7a',
        'christmas-green-light': '#7fb896',
        'christmas-green-dark': '#5a8a6a',
        'christmas-gold': '#d4a574',
        'christmas-gold-light': '#e5b888',
        'christmas-gold-dark': '#c49564',
        'christmas-snow': '#f8fafc',
        // 保留原有顏色以向後兼容
        aurora: '#22d3ee',
        'aurora-light': '#67e8f9',
        'aurora-dark': '#0891b2',
        blush: '#f472b6',
        'blush-light': '#f9a8d4',
        'blush-dark': '#db2777',
        sunburst: '#fbbf24',
        violet: '#8b5cf6',
        'violet-light': '#a78bfa',
        emerald: '#10b981',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(34, 211, 238, 0.3)',
        'glow-lg': '0 0 40px rgba(34, 211, 238, 0.4)',
        'glow-pink': '0 0 20px rgba(244, 114, 182, 0.3)',
        'glow-red': '0 0 20px rgba(200, 90, 90, 0.25)',
        'glow-green': '0 0 20px rgba(107, 155, 122, 0.25)',
        'glow-gold': '0 0 20px rgba(212, 165, 116, 0.25)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'card': '0 8px 32px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 12px 48px rgba(34, 211, 238, 0.2)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'snow': 'snow 10s linear infinite',
        'twinkle': 'twinkle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        snow: {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)' },
          '100%': { transform: 'translateY(100vh) rotate(360deg)' },
        },
        twinkle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.3 },
        },
      },
    },
  },
  plugins: [],
};
