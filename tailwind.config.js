/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Warm institutional palette: off-white canvas, deep navy ink, teal action color.
        background: 'hsl(36 50% 98%)',
        foreground: 'hsl(219 45% 16%)',
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(219 45% 16%)',
        popover: 'hsl(0 0% 100%)',
        'popover-foreground': 'hsl(219 45% 16%)',
        primary: {
          DEFAULT: 'hsl(176 78% 23%)',
          foreground: 'hsl(0 0% 100%)',
        },
        secondary: {
          DEFAULT: 'hsl(38 33% 94%)',
          foreground: 'hsl(219 40% 24%)',
        },
        muted: {
          DEFAULT: 'hsl(36 33% 94%)',
          foreground: 'hsl(29 10% 42%)',
        },
        accent: {
          DEFAULT: 'hsl(174 45% 93%)',
          foreground: 'hsl(176 78% 18%)',
        },
        destructive: {
          DEFAULT: 'hsl(9 68% 44%)',
          foreground: 'hsl(0 0% 100%)',
        },
        border: 'hsl(35 25% 88%)',
        input: 'hsl(35 25% 84%)',
        ring: 'hsl(176 78% 23%)',
        radius: '0.625rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(24 33 57 / 0.05), 0 1px 3px 0 rgb(24 33 57 / 0.04)',
        pop: '0 4px 12px -2px rgb(24 33 57 / 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
