import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/design-system/**/*.{ts,tsx}',
    './src/features/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          sunken: 'var(--surface-sunken)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          subtle: 'var(--text-subtle)',
          inverted: 'var(--text-inverted)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          fg: 'var(--primary-fg)',
          text: 'var(--primary-text)',
          soft: 'var(--primary-soft)',
        },
        accent: 'var(--accent)',
        danger: {
          DEFAULT: 'var(--danger)',
          fg: 'var(--danger-fg)',
          text: 'var(--danger-text)',
          soft: 'var(--danger-soft)',
        },
        success: {
          DEFAULT: 'var(--success)',
          fg: 'var(--success-fg)',
          text: 'var(--success-text)',
          soft: 'var(--success-soft)',
        },
        ember: {
          50: 'var(--ember-50)',
          100: 'var(--ember-100)',
          200: 'var(--ember-200)',
          300: 'var(--ember-300)',
          400: 'var(--ember-400)',
          500: 'var(--ember-500)',
          600: 'var(--ember-600)',
          700: 'var(--ember-700)',
          800: 'var(--ember-800)',
          900: 'var(--ember-900)',
        },
        hub: {
          50: 'var(--hub-50)',
          100: 'var(--hub-100)',
          200: 'var(--hub-200)',
          300: 'var(--hub-300)',
          400: 'var(--hub-400)',
          500: 'var(--hub-500)',
          600: 'var(--hub-600)',
          700: 'var(--hub-700)',
          800: 'var(--hub-800)',
          900: 'var(--hub-900)',
          950: 'var(--hub-950)',
        },
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)',
        rail: 'var(--rail)',
        'hero-glow': 'var(--hero-glow)',
        'auth-hero': 'var(--auth-hero)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        lg: 'var(--radius-lg)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  plugins: [],
};

export default config;
