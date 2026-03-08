import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig(({ mode }) => {
  const isPluginBuild = mode === 'plugin'

  if (isPluginBuild) {
    const html = readFileSync(resolve(__dirname, 'dist/index.html'), 'utf-8')

    return {
      base: './',
      define: {
        __html__: JSON.stringify(html),
      },
      build: {
        target: 'es2015',
        outDir: 'dist',
        emptyOutDir: false,
        lib: {
          entry: resolve(__dirname, 'src/plugin/code.ts'),
          formats: ['es'],
          fileName: () => 'code.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    }
  }

  return {
    base: './',
    plugins: [react(), viteSingleFile()],
    build: {
      target: 'es2015',
      outDir: 'dist',
      emptyOutDir: true,
      modulePreload: false,
      assetsInlineLimit: 100000000,
      cssCodeSplit: false,
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html'),
        },
      },
    },
  }
})
