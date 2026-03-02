import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

// Generate dist/index.html with a plain <script> (no type="module")
// VSCode webviews do not support ES module scripts due to CSP/protocol restrictions.
function generateWebviewHtml() {
  return {
    name: 'generate-webview-html',
    closeBundle() {
      mkdirSync('dist', { recursive: true });
      writeFileSync(
        'dist/index.html',
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpecCraft</title>
    <link rel="stylesheet" href="./assets/index.css">
  </head>
  <body>
    <div id="root"></div>
    <script src="./assets/index.js"></script>
  </body>
</html>`
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), generateWebviewHtml()],
  // Replace Node.js globals that React/libraries reference at runtime.
  // IIFE bundles run in a plain browser context where `process` doesn't exist.
  define: {
    'process.env.NODE_ENV': '"production"',
    'process.env': '{}',
  },
  build: {
    // lib mode + IIFE: outputs a plain <script> bundle, no type="module", no dynamic imports
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      formats: ['iife'],
      name: 'SpecCraftApp',
      fileName: () => 'index.js',
    },
    outDir: 'dist/assets',
    rollupOptions: {
      output: {
        assetFileNames: 'index.[ext]', // → dist/assets/index.css
      },
    },
  },
});
