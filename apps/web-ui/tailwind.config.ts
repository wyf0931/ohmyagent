import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand & Accent
        primary: 'var(--color-primary)',
        'primary-active': 'var(--color-primary-active)',
        'primary-disabled': 'var(--color-primary-disabled)',
        'accent-teal': 'var(--color-accent-teal)',
        'accent-amber': 'var(--color-accent-amber)',

        // Surface
        canvas: 'var(--color-canvas)',
        'surface-soft': 'var(--color-surface-soft)',
        'surface-card': 'var(--color-surface-card)',
        'surface-dark': 'var(--color-surface-dark)',
        'surface-dark-elevated': 'var(--color-surface-dark-elevated)',
        hairline: 'var(--color-hairline)',

        // Text
        ink: 'var(--color-ink)',
        body: 'var(--color-body)',
        muted: 'var(--color-muted)',
        'muted-soft': 'var(--color-muted-soft)',
        'on-primary': 'var(--color-on-primary)',
        'on-dark': 'var(--color-on-dark)',

        // Semantic
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        'card': '12px',
        'chip': '4px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}

export default config
