import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00796B',
          dark: '#004D40',
          light: '#E0F2F1',
        },
        accent: {
          DEFAULT: '#FF8F00',
          light: '#FFF8E1',
        },
        success: '#2E7D32',
        danger: '#D32F2F',
        pearl: '#F5F5F5',
        ink: '#1A1A2E',
        muted: '#78909C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #004D40 0%, #00796B 50%, #00897B 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
