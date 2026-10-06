import { resolve } from 'path';
import { defineConfig } from 'vite';

// Symmetric Frontend Architecture:
// All client HTML entrypoints and client scripts reside in client/
const projectRoot = import.meta.dirname;
const clientRoot = resolve(projectRoot, 'client');

export default defineConfig({
  root: clientRoot,
  publicDir: resolve(projectRoot, 'public'),
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:           resolve(clientRoot, 'index.html'),
        match:          resolve(clientRoot, 'match.html'),
        sprint:         resolve(clientRoot, 'sprint.html'),
        notebook:       resolve(clientRoot, 'notebook.html'),
        builders:       resolve(clientRoot, 'builders.html'),
        problemHolders: resolve(clientRoot, 'problem-holders.html'),
        enablers:       resolve(clientRoot, 'enablers.html'),
        postCall:       resolve(clientRoot, 'post-call.html'),
        apply:          resolve(clientRoot, 'apply.html'),
        login:          resolve(clientRoot, 'login.html'),
        privacy:        resolve(clientRoot, 'privacy.html'),
        terms:          resolve(clientRoot, 'terms.html'),
        notFound:       resolve(clientRoot, '404.html')
      }
    }
  }
});
