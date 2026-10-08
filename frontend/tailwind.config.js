/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matrix: {
          DEFAULT: '#00FF41',
          bright: '#39FF14',
          dim: '#00A028',
          dark: '#004010',
          glow: 'rgba(0, 255, 65, 0.15)',
        },
        terminal: {
          black: '#0A0A0A',
          card: '#111111',
          panel: '#0F1A0F',
          border: '#1A3A1A',
          muted: '#4D7A4D',
        },
        danger: {
          DEFAULT: '#FF3131',
          dim: '#7A0000',
          glow: 'rgba(255,49,49,0.25)',
        },
        warn: {
          DEFAULT: '#FFD700',
          dim: '#7A6000',
        },
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"JetBrains Mono"', '"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 3s infinite',
        'blink': 'blink 1s step-end infinite',
        'scanline': 'scanline 6s linear infinite',
        'pulse-matrix': 'pulse-matrix 2s ease-in-out infinite',
        'flicker': 'flicker 0.15s infinite',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        glitch: {
          '0%, 90%, 100%': { transform: 'translate(0)' },
          '92%': { transform: 'translate(-2px, 1px)' },
          '94%': { transform: 'translate(2px, -1px)' },
          '96%': { transform: 'translate(-1px, 2px)' },
          '98%': { transform: 'translate(1px, -2px)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'pulse-matrix': {
          '0%, 100%': { boxShadow: '0 0 5px #00FF41, 0 0 10px #00FF41' },
          '50%': { boxShadow: '0 0 15px #00FF41, 0 0 30px #00FF41, 0 0 45px #00FF41' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'matrix': '0 0 10px rgba(0,255,65,0.4)',
        'matrix-lg': '0 0 20px rgba(0,255,65,0.5), 0 0 40px rgba(0,255,65,0.2)',
        'danger': '0 0 10px rgba(255,49,49,0.5)',
        'warn': '0 0 10px rgba(255,215,0,0.4)',
        'pixel': '2px 2px 0px rgba(0,255,65,0.6)',
      },
    },
  },
  plugins: [],
};
