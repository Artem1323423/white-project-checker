import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        card: 'var(--color-card)',
        textPrimary: 'var(--color-textPrimary)',
        textSecondary: 'var(--color-textSecondary)',
        cyan: '#42D7FF',
        violet: '#8B5CF6',
        danger: '#FF4D6D',
        success: '#28D17C'
      },
      boxShadow: {
        card: '0 24px 80px rgba(13, 23, 50, 0.35)'
      }
    }
  },
  plugins: []
} satisfies Config;
