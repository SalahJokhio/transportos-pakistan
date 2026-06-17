import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fef3ee',
          500: '#f97316',
          600: '#ea6c10',
          700: '#c2540a',
        },
        pakistan: {
          green: '#01411C',
          light: '#2d6a4f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
