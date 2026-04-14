/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#031018',
        night: '#071c2d',
        cyan: '#6ae6ff',
        mint: '#9ef8c3',
        gold: '#ffdb70',
        coral: '#ff7b72'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(15, 23, 42, 0.35)',
        pulse: '0 0 30px rgba(106, 230, 255, 0.35)'
      },
      backdropBlur: {
        xs: '2px'
      },
      backgroundImage: {
        aurora:
          'radial-gradient(circle at top left, rgba(106,230,255,0.24), transparent 32%), radial-gradient(circle at top right, rgba(255,219,112,0.18), transparent 28%), linear-gradient(160deg, rgba(3,16,24,1) 0%, rgba(7,28,45,1) 45%, rgba(6,12,27,1) 100%)'
      }
    }
  },
  plugins: []
};

