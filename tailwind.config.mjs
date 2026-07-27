/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bgMain: 'var(--bg-main)',
        bgSecondary: 'var(--bg-secondary)',
        surface: 'var(--surface)',
        violet: 'var(--violet)',
        violetLight: 'var(--violet-light)',
        magenta: 'var(--magenta)',
        cyan: 'var(--cyan)',
        cyanDim: 'var(--cyan-dim)',
        textMain: 'var(--text-main)',
        textSecondary: 'var(--text-secondary)',
        accentGold: 'var(--accent-gold)',
        alert: 'var(--alert)',
        borderColor: 'var(--border-color)',
        borderStrong: 'var(--border-strong)',
      },
      fontFamily: {
        sans: [
          'Manrope',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Fraunces', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '5px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        glowViolet: '0 0 18px var(--glow-violet)',
        glowCyan: '0 0 18px var(--glow-cyan)',
        card: '0 6px 28px color-mix(in srgb, var(--bg-main) 45%, transparent)',
        cardHover: '0 10px 36px color-mix(in srgb, var(--violet) 18%, transparent)',
      },
      letterSpacing: {
        widest2: '0.18em',
      },
    },
  },
  plugins: [],
};
