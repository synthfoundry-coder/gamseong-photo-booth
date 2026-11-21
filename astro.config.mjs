import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://gamseong-photo.vercel.app',
  output: 'static',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
