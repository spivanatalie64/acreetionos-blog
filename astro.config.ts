import { defineConfig } from 'astro/config'

export default defineConfig({
  site: process.env.SITE || 'https://blog.natalie.acreetionos.org',
  trailingSlash: 'never',
  build: {
    format: 'directory',
  },
})
