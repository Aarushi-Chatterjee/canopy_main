import { resolve } from 'path';
import { defineConfig } from 'vite';

// Vite's default build only bundles the entry index.html — match.html,
// sprint.html, and notebook.html were silently missing from every
// production build until this config existed. Multi-page apps must list
// every HTML entry explicitly via rollupOptions.input.
const root = import.meta.dirname;

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        match: resolve(root, 'match.html'),
        sprint: resolve(root, 'sprint.html'),
        notebook: resolve(root, 'notebook.html'),
        notFound: resolve(root, '404.html')
      }
    }
  }
});
