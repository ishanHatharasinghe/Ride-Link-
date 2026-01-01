import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-teal': '#007E7E',
        'medium-teal': '#309898',
        'yellow-gold': '#FF9F00',
        'orange': '#F4631E',
        'red': '#CB041F',
        'dark-red': '#AD0000',
      },
    },
  },
  plugins: [],
} satisfies Config
