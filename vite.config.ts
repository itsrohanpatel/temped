import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      {
        name: 'copy-standalone-scripts',
        generateBundle() {
          const files = ['shared-utils.js', 'spam-filter.js'];
          files.forEach(file => {
            if (fs.existsSync(file)) {
              this.emitFile({
                type: 'asset',
                fileName: file,
                source: fs.readFileSync(file, 'utf8')
              });
            }
          });
        }
      }
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          settings: path.resolve(__dirname, 'settings.html'),
          templates: path.resolve(__dirname, 'templates.html'),
        }
      }
    },
    test: {
      environment: 'jsdom',
      globals: true,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['shared-utils.js'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        }
      }
    }
  };
});
