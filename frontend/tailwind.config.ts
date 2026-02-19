import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#8B5CF6',
          foreground: '#FFFFFF',
          50:  '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
        },
        secondary: {
          DEFAULT: '#06B6D4',
          foreground: '#FFFFFF',
          50:  '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        neo: {
          bg:      '#0f1322',
          surface: '#1c2136',
          surface2:'#222840',
          surface3:'#2a3050',
          input:   '#151b30',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: '1rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'neo':        '-5px -5px 12px rgba(168,150,255,0.04), 5px 5px 15px rgba(0,0,0,0.65)',
        'neo-sm':     '-3px -3px 8px rgba(168,150,255,0.04), 3px 3px 10px rgba(0,0,0,0.55)',
        'neo-inset':  'inset -3px -3px 8px rgba(168,150,255,0.04), inset 3px 3px 10px rgba(0,0,0,0.6)',
        'neo-glow':   '-5px -5px 12px rgba(168,150,255,0.04), 5px 5px 15px rgba(0,0,0,0.65), 0 0 30px rgba(139,92,246,0.15)',
        'glow-purple':'0 0 20px rgba(139,92,246,0.4), 0 0 40px rgba(139,92,246,0.2)',
        'glow-cyan':  '0 0 20px rgba(6,182,212,0.4), 0 0 40px rgba(6,182,212,0.2)',
        'glow-sm':    '0 0 10px rgba(139,92,246,0.3)',
      },
      backgroundImage: {
        'grid-purple': 'linear-gradient(rgba(139,92,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.04) 1px, transparent 1px)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      backgroundSize: {
        'grid': '40px 40px',
        'grid-sm': '20px 20px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition:  '200% center' },
        },
      },
      animation: {
        'accordion-down':  'accordion-down 0.2s ease-out',
        'accordion-up':    'accordion-up 0.2s ease-out',
        'pulse-glow':      'pulse-glow 2s ease-in-out infinite',
        'float':           'float 4s ease-in-out infinite',
        'fade-up':         'fade-up 0.4s ease-out forwards',
        'shimmer':         'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
