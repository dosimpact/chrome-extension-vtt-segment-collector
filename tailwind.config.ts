import type { Config } from 'tailwindcss';

export default {
  content: ['./popup.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(220 18% 86%)',
        input: 'hsl(220 18% 86%)',
        ring: 'hsl(221 83% 53%)',
        background: 'hsl(220 33% 97%)',
        foreground: 'hsl(224 40% 12%)',
        primary: {
          DEFAULT: 'hsl(221 83% 53%)',
          foreground: 'hsl(210 40% 98%)'
        },
        secondary: {
          DEFAULT: 'hsl(217 28% 92%)',
          foreground: 'hsl(224 32% 18%)'
        },
        muted: {
          DEFAULT: 'hsl(216 22% 93%)',
          foreground: 'hsl(220 12% 42%)'
        },
        accent: {
          DEFAULT: 'hsl(190 68% 88%)',
          foreground: 'hsl(194 76% 22%)'
        },
        destructive: {
          DEFAULT: 'hsl(0 76% 56%)',
          foreground: 'hsl(0 0% 98%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 100% / 0.84)',
          foreground: 'hsl(224 40% 12%)'
        }
      },
      borderRadius: {
        lg: '1.25rem',
        md: '1rem',
        sm: '0.75rem'
      },
      boxShadow: {
        paper: '0 24px 60px -32px rgba(15, 23, 42, 0.28)',
        inset: 'inset 0 1px 0 rgba(255,255,255,0.72)'
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Avenir Next"', '"Segoe UI"', 'sans-serif'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"', '"Avenir Next"', 'sans-serif']
      },
      backgroundImage: {
        grain:
          'radial-gradient(circle at top left, rgba(96,165,250,0.2), transparent 28%), radial-gradient(circle at 85% 12%, rgba(34,197,94,0.12), transparent 20%), linear-gradient(180deg, rgba(249,251,255,0.98), rgba(240,245,255,0.96))'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config;
