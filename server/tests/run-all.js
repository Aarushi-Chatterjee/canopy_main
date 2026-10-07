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
      env: {
        ...process.env,
        NODE_ENV: 'test',
        MYTHOS_SESSION_SECRET: process.env.MYTHOS_SESSION_SECRET || 'alWos/oHDcV2AkRyEt9gzvsVMg9vOeNZ1Z5Zkm+j1ls=',
        EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'test',
        CANOPY_ISOLATE_STORE: 'true',
        JWT_SECRET: process.env.JWT_SECRET || 'canopy_test_jwt_secret_minimum_32_characters_for_security_spec',
        FOUNDER_CONSOLE_KEY: process.env.FOUNDER_CONSOLE_KEY || 'canopy_test_founder_key_secure_secret',
        FOUNDER_EMAILS: process.env.FOUNDER_EMAILS || 'canopy.connect.collaborate@gmail.com,aarushichatterjee27@gmail.com'
      }
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
