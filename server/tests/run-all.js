/**
 * Canopy Backend Unified Test Suite Runner
 * Location: server/tests/run-all.js
 * Runs all test suites sequentially and reports summary.
 */

const { spawn } = require('child_process');
const path = require('path');

const suites = [
  { name: 'Auth & Login Verification Suite', file: path.join(__dirname, 'auth-login.test.js') },
  { name: 'Full API Gateway & System Tests', file: path.join(__dirname, 'api-endpoints.test.js') }
];

async function runSuite(suite) {
  return new Promise((resolve) => {
    console.log(`\n▶ Starting: ${suite.name}...`);
    const proc = spawn(process.execPath, [suite.file], {
      env: { ...process.env, NODE_ENV: 'test' }
    });

    proc.stdout.on('data', (chunk) => process.stdout.write(chunk));
    proc.stderr.on('data', (chunk) => process.stderr.write(chunk));

    proc.on('close', (code) => {
      resolve({ name: suite.name, success: code === 0, code });
    });
  });
}

async function runAll() {
  console.log('\n================================================================');
  console.log('🌱 RUNNING ALL CANOPY BACKEND TEST SUITES');
  console.log('================================================================');

  const results = [];
  for (const suite of suites) {
    const res = await runSuite(suite);
    results.push(res);
  }

  console.log('\n================================================================');
  console.log('📋 TEST SUITE SUMMARY REPORT');
  console.log('================================================================');

  let allPassed = true;
  for (const r of results) {
    if (r.success) {
      console.log(`  ✓ ${r.name}: PASSED`);
    } else {
      console.error(`  ✗ ${r.name}: FAILED (Exit code: ${r.code})`);
      allPassed = false;
    }
  }

  console.log('================================================================\n');
  process.exit(allPassed ? 0 : 1);
}

runAll();
