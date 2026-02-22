import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'Sora, -apple-system, sans-serif',
  primaryColor: 'indigo',
  defaultRadius: 'sm',

  colors: {
    dark: [
      '#e5e5e5',
      '#b3b3b3',
      '#999999',
      '#808080',
      '#666666',
      '#4d4d4d',
      '#333333',
      '#1c1c1c',
      '#141414',
      '#0a0a0a',
    ],
    indigo: [
      '#eef2ff',
      '#e0e7ff',
      '#c7d2fe',
      '#a5b4fc',
      '#818cf8',
      '#6366f1',
      '#4f46e5',
      '#4338ca',
      '#3730a3',
      '#312e81',
    ],
  },

  components: {
    TextInput: {
      styles: {
        input: {
          '&:focus': {
            borderColor: '#e5e5e5',
            boxShadow: '0 0 0 2px rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
    Button: {
      defaultProps: {
        size: 'md',
      },
      styles: {
        root: {
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
  },
});
