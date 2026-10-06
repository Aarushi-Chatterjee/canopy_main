/**
 * Canopy Unified Local Dev Runner
 * Starts both the Express backend API (port 3001) and Vite dev server concurrently
 * in a single command (`npm run dev`).
 */
const { spawn } = require('child_process');

console.log('\x1b[32m🌱 [Canopy] Starting Express backend API on port 3001...\x1b[0m');
const server = spawn('node', ['server/index.js'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: process.env.PORT || '3001' }
});

console.log('\x1b[36m⚡ [Canopy] Starting Vite frontend dev server...\x1b[0m');
const vite = spawn('npx', ['vite'], {
  stdio: 'inherit',
  shell: true
});

function cleanup() {
  try {
    server.kill();
  } catch (_) {}
  try {
    vite.kill();
  } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

server.on('error', (err) => {
  console.error('\x1b[31m[Canopy Server Error]\x1b[0m', err.message);
});

vite.on('error', (err) => {
  console.error('\x1b[31m[Canopy Vite Error]\x1b[0m', err.message);
});
