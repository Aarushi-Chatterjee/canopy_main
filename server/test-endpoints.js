process.env.NODE_ENV = 'test';
const http = require('http');
const { app } = require('./index.js');
const { generateToken } = require('./middleware/auth');

const PORT = 3099;
const server = app.listen(PORT, async () => {
  console.log(`\n🌱 Canopy Test Server running on port ${PORT}...`);

  function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const req = http.request({
        hostname: 'localhost',
        port: PORT,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(raw) });
          } catch (e) {
            resolve({ status: res.statusCode, raw });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }

  let failures = 0;
  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    console.log('\n--- 1. Health & Security Gateways ---');
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check responds 200 OK');

    // Security Gate: GET /api/applications must reject unauthorized callers
    const unauthApps = await request('GET', '/api/applications');
    assert(unauthApps.status === 401, 'P0 Security Gate: GET /api/applications rejects unauthenticated caller with 401');

    console.log('\n--- 2. Cryptographic Authentication & Password Policy ---');
    const testEmail = `builder.${Date.now()}@canopy.earth`;
    const shortPwdReg = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: 'short',
      displayName: 'Elena Test'
    });
    assert(shortPwdReg.status === 400, 'Password validation: rejects passcodes < 8 characters');

    const validReg = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: 'StrongPassword123!',
      displayName: 'Elena Test',
      role: 'builder'
    });
    assert(validReg.status === 201 && validReg.data.user?.id, 'Registration: creates user account with password hash');

    // Fetch the generated user to get their verification code for test automation
    const { store } = require('./data/store');
    const userInDb = store.getItem('users', u => u.email === testEmail);
    const verificationCode = userInDb?.verification_token;

    const verifyRes = await request('POST', '/api/auth/verify', {
      email: testEmail,
      token: verificationCode
    });
    assert(verifyRes.status === 200 && verifyRes.data.sessionToken, 'Pass Verification: verifies 6-digit code and returns signed JWT');
    const userToken = verifyRes.data.sessionToken;
    const authHeaders = { Authorization: `Bearer ${userToken}` };

    // Login with correct credentials
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'StrongPassword123!'
    });
    assert(loginRes.status === 200 && loginRes.data.sessionToken, 'Login: authenticates with valid credentials');

    // Login with incorrect credentials must fail (no auto-provisioning)
    const badLogin = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert(badLogin.status === 401, 'Security Gate: rejects invalid password with 401 (no auto-provisioning)');

    // Password reset request (account-enumeration resistant)
    const resetReq = await request('POST', '/api/auth/reset-password-request', {
      email: testEmail
    });
    assert(resetReq.status === 200 && resetReq.data.success, 'Password Reset: requests reset code');
    const resetToken = resetReq.data._testResetToken;

    // Password reset confirm
    const resetConfirm = await request('POST', '/api/auth/reset-password-confirm', {
      email: testEmail,
      token: resetToken,
      newPassword: 'BrandNewPassword456!'
    });
    assert(resetConfirm.status === 200 && resetConfirm.data.sessionToken, 'Password Reset: confirms reset with new password');

    // Cookie-based authentication check
    const cookieHeaders = { Cookie: `canopy_session=${resetConfirm.data.sessionToken}` };
    const meRes = await request('GET', '/api/auth/me', null, cookieHeaders);
    assert(meRes.status === 200 && !meRes.data.isGuest, 'Cookie Auth: validates session via HttpOnly canopy_session cookie');

    // Update userToken for remaining tests
    authHeaders.Authorization = `Bearer ${resetConfirm.data.sessionToken}`;

    console.log('\n--- 3. Matches Sandbox & Reciprocal Contact Privacy ---');
    const sandbox = await request('GET', '/api/matches/sandbox?domain=climate');
    assert(sandbox.status === 200 && sandbox.data.totalProfiles > 0, 'Matches Sandbox: returns public profiles & build calls');

    const handshakeRes = await request('POST', '/api/matches/handshake', {
      recipientId: 'usr_maya',
      intentNote: 'Excited to collaborate on the sensor pipeline.'
    }, authHeaders);
    assert(handshakeRes.status === 201 && handshakeRes.data.match?.id, 'Matches Handshake: requires JWT and creates pending match');

    console.log('\n--- 4. Sprints Engine & Capacity Guardrails ---');
    const sprintBoard = await request('GET', '/api/sprints');
    assert(sprintBoard.status === 200 && Array.isArray(sprintBoard.data.forming), 'Sprint Board: returns forming, building, shipped cycles');

    const openSprint = sprintBoard.data.forming.find(s => s.members.length < s.teamCapacity) || sprintBoard.data.forming[0] || { id: 'sp_1' };
    const joinRes = await request('POST', `/api/sprints/${openSprint.id}/join`, {
      squadRole: 'Sensors Lead'
    }, authHeaders);
    assert(joinRes.status === 200 || joinRes.status === 409 || (joinRes.status === 400 && joinRes.data?.error?.includes('capacity')), 'Sprint Join: successfully claims squad seat or enforces capacity limit via signed JWT');

    console.log('\n--- 5. Build Calls Pipeline ---');
    const callsList = await request('GET', '/api/calls');
    assert(callsList.status === 200 && callsList.data.calls.length > 0, 'Build Calls: returns scoped calls directory');

    const newCall = await request('POST', '/api/calls', {
      title: 'Automated Soil Microgrid Sensor Hub',
      orgName: 'Canopy Agritech',
      problemStatement: 'Scope low-power telemetry for drought forecasting.',
      domain: 'climate',
      neededSkills: ['Firmware', 'Rust']
    }, authHeaders);
    assert(newCall.status === 201 && newCall.data.call?.creatorId === userInDb.id, 'Post Call: derives creatorId securely from JWT session');

    console.log('\n--- 6. Lab Notebook & Branching ---');
    const notes = await request('GET', '/api/notebook');
    assert(notes.status === 200 && notes.data.entries.length > 0, 'Lab Notebook: returns community field notes');

    const growRes = await request('POST', `/api/notebook/${notes.data.entries[0].id}/grow`, {
      title: 'Calibration test benchmarks under high turbidity',
      summarySnippet: 'Validation passed over 24-hour continuous stream run.'
    }, authHeaders);
    assert(growRes.status === 201 && growRes.data.branch?.authorId === userInDb.id, 'Grow Entry: derives authorId securely from JWT session');

    console.log('\n--- 7. Application Intake & PII Privacy Review ---');
    const appSubmission = await request('POST', '/api/applications', {
      fullName: 'Dr. Jane Vance',
      email: 'jane.vance@ecology.org',
      role: 'problem_holder',
      domain: 'climate',
      motivationNote: 'Field testing coastal salinity data.'
    });
    assert(appSubmission.status === 201 && appSubmission.data.application?.status === 'pending_review', 'Application Intake: sets pending_review status without fake auto-verification');

    // Admin Token Access to GET /api/applications
    const adminToken = generateToken({ id: 'usr_admin', email: 'aarushi@canopy.earth', role: 'admin' });
    const adminApps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${adminToken}` });
    assert(adminApps.status === 200 && Array.isArray(adminApps.data.applications), 'Admin Access: verified admin token retrieves application review queue');

    if (failures === 0) {
      console.log('\n✨ ALL CANOPY SECURITY & BACKEND TESTS PASSED (0 failures)!');
    } else {
      console.error(`\n⚠️ Tests completed with ${failures} failure(s).`);
    }
  } catch (err) {
    console.error('Fatal test execution error:', err);
    failures++;
  } finally {
    server.close();
    process.exit(failures > 0 ? 1 : 0);
  }
});
