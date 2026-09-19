/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#F2F7F5',
          100: '#E6EFE9',
          200: '#BFD6C9',
          300: '#99BDA9',
          400: '#4D8A69',
          500: '#00583E', // Standard Green
          600: '#004F38',
          700: '#00422F',
          800: '#003626',
          900: '#00301e', // Deep Forest Green (Main Background/Text) - FROM LOGIN
          950: '#001A10',
        },
        accent: {
          50: '#F0FDF7',
          100: '#DBFBEB',
          200: '#AFvar',
          300: '#03D47C', // Emerald Green (Main Accent/Pop) - FROM LOGIN
          400: '#02B66A', // Hover State
          500: '#029858',
          600: '#017846',
          700: '#015F37',
          800: '#014A2B',
          900: '#013D24',
        },
        cream: {
          DEFAULT: '#F5F7FA', // Tech Gray Background
          50: '#FFFFFF',
          100: '#FCFCFA',
        },
        orange: {
          ...require('tailwindcss/colors').orange,
          DEFAULT: '#FF671F', // CBA / Sports Orange
          500: '#FF671F',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'],
        'display': ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      keyframes: {
        'slide-in-left': {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        'slide-in-left': 'slide-in-left 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}