/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: {
        none: '0',
        sm:   '0',
        md:   '0',
        lg:   '0',
        xl:   '0',
        '2xl':'0',
        '3xl':'0',
        full: '0',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'page-title':    ['1.875rem', { fontWeight: '700' }],
        'section-header':['1.25rem',  { fontWeight: '600' }],
        label:           ['0.6875rem',{ fontWeight: '600', letterSpacing: '0.05em' }],
      },
      colors: {
        background: 'var(--axiom-gray-50)',
        foreground: 'var(--axiom-gray-900)',
        card: {
          DEFAULT:    'var(--axiom-white)',
          foreground: 'var(--axiom-gray-900)',
        },
        popover: {
          DEFAULT:    'var(--axiom-white)',
          foreground: 'var(--axiom-gray-900)',
        },
        primary: {
          DEFAULT:    '#000000',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT:    'var(--axiom-gray-100)',
          foreground: 'var(--axiom-gray-900)',
        },
        muted: {
          DEFAULT:    'var(--axiom-gray-100)',
          foreground: 'var(--axiom-gray-500)',
        },
        accent: {
          DEFAULT:    'var(--axiom-gray-100)',
          foreground: 'var(--axiom-gray-900)',
        },
        destructive: {
          DEFAULT:    '#dc2626',
          foreground: '#ffffff',
        },
        border: 'var(--axiom-gray-200)',
        input:  'var(--axiom-gray-200)',
        ring:   'var(--axiom-gray-900)',

        /* axiom palette available as utilities */
        axiom: {
          black:   '#000000',
          white:   '#ffffff',
          'gray-900': '#111111',
          'gray-800': '#222222',
          'gray-700': '#333333',
          'gray-500': '#666666',
          'gray-400': '#999999',
          'gray-300': '#cccccc',
          'gray-200': '#e5e5e5',
          'gray-100': '#f5f5f5',
          'gray-50':  '#fafafa',
          primary:   '#2563eb',
          error:     '#dc2626',
        },

        chart: {
          '1': '#2D7A72',
          '2': '#A67C1A',
          '3': '#8B0000',
          '4': '#2D4A6B',
          '5': '#5B4B9E',
        },

        sidebar: {
          DEFAULT:             '#fafafa',
          foreground:          '#111111',
          primary:             '#000000',
          'primary-foreground':'#ffffff',
          accent:              '#f5f5f5',
          'accent-foreground': '#111111',
          border:              '#e5e5e5',
          ring:                '#111111',
        },
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-in':        'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
  safelist: [
    'bg-blue-50','bg-green-50','bg-purple-50','bg-orange-50','bg-pink-50',
    'text-blue-600','text-green-600','text-purple-600','text-orange-600','text-pink-600',
    'border-blue-200','border-green-200','border-purple-200','border-orange-200','border-pink-200',
  ],
}