import { resolve } from 'path';
import { defineConfig } from 'vite';

// Multi-page app: every HTML entry must be listed explicitly.
// Production build bundles all 13 pages correctly.
const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main:           resolve(root, 'index.html'),
        match:          resolve(root, 'match.html'),
        sprint:         resolve(root, 'sprint.html'),
        notebook:       resolve(root, 'notebook.html'),
        builders:       resolve(root, 'builders.html'),
        problemHolders: resolve(root, 'problem-holders.html'),
        enablers:       resolve(root, 'enablers.html'),
        postCall:       resolve(root, 'post-call.html'),
        apply:          resolve(root, 'apply.html'),
        login:          resolve(root, 'login.html'),
        privacy:        resolve(root, 'privacy.html'),
        terms:          resolve(root, 'terms.html'),
        notFound:       resolve(root, '404.html')
      }
    }
  }
});
