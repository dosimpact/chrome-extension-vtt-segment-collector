import type { Config } from 'tailwindcss';

export default {
  content: ['./popup.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(28 16% 78%)',
        input: 'hsl(28 16% 78%)',
        ring: 'hsl(20 70% 38%)',
        background: 'hsl(40 43% 96%)',
        foreground: 'hsl(18 28% 12%)',
        primary: {
          DEFAULT: 'hsl(20 78% 36%)',
          foreground: 'hsl(36 100% 97%)'
        },
        secondary: {
          DEFAULT: 'hsl(32 37% 88%)',
          foreground: 'hsl(18 28% 18%)'
        },
        muted: {
          DEFAULT: 'hsl(34 23% 90%)',
          foreground: 'hsl(25 12% 34%)'
        },
        accent: {
          DEFAULT: 'hsl(154 29% 84%)',
          foreground: 'hsl(158 42% 18%)'
        },
        destructive: {
          DEFAULT: 'hsl(2 72% 48%)',
          foreground: 'hsl(0 0% 98%)'
        },
        card: {
          DEFAULT: 'hsl(36 100% 99% / 0.8)',
          foreground: 'hsl(18 28% 12%)'
        }
      },
      borderRadius: {
        lg: '1.125rem',
        md: '0.875rem',
        sm: '0.625rem'
      },
      boxShadow: {
        paper: '0 20px 40px -28px rgba(58, 30, 15, 0.45)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.7)'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Segoe UI"', 'sans-serif'],
        display: ['"Fraunces"', '"Times New Roman"', 'serif']
      },
      backgroundImage: {
        grain:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7), transparent 35%), radial-gradient(circle at 80% 0%, rgba(247, 205, 143, 0.35), transparent 28%), linear-gradient(180deg, rgba(255,250,244,0.98), rgba(244,236,224,0.96))'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config;
