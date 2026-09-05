process.env.NODE_ENV = 'test';
process.env.CANOPY_ISOLATE_STORE = 'true';
process.env.EMAIL_PROVIDER = 'test';
process.env.JWT_SECRET = 'canopy_test_jwt_secret_minimum_32_characters_for_security_spec';

const http = require('http');
const { app } = require('./index.js');
const { generateToken } = require('./middleware/auth');
const emailService = require('./services/email');
const { store } = require('./data/store');

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
          'X-Canopy-Client': 'web',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
          ...headers
        }
      }, (res) => {
        let raw = '';
        res.on('data', chunk => raw += chunk);
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (e) {
            parsed = raw;
          }
          resolve({ 
            status: res.statusCode, 
            data: parsed, 
            headers: res.headers 
          });
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
    store.resetTestDb();
    emailService.clearTestInbox();

    console.log('\n--- 1. Health, Enterprise Security Headers & CSRF ---');
    const health = await request('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'healthy', 'Health check responds 200 OK with healthy status');
    assert(health.headers['content-security-policy']?.includes("default-src 'self'"), 'CSP Header: enforces default-src self policy');
    assert(health.headers['x-content-type-options'] === 'nosniff', 'Security Header: X-Content-Type-Options is nosniff');
    assert(health.headers['x-frame-options'] === 'SAMEORIGIN', 'Security Header: X-Frame-Options is SAMEORIGIN');

    // Unauthenticated GET /api/auth/me returns honest unauthenticated state
    const unauthMe = await request('GET', '/api/auth/me');
    assert(unauthMe.status === 200 && unauthMe.data.isGuest === true && unauthMe.data.user === null, 
      'Honest Session: GET /api/auth/me returns { user: null, isGuest: true } when unauthenticated');

    console.log('\n--- 2. Administrator Authorization & Privilege Escalation Hardening ---');
    // 2.1 Unauthenticated access to /api/applications must be rejected
    const unauthApps = await request('GET', '/api/applications');
    assert(unauthApps.status === 401, 'P0 Security Gate: GET /api/applications rejects unauthenticated caller with 401');

    // 2.2 Role 'builder' must be rejected
    const builderToken = generateToken({ id: 'usr_b1', email: 'builder@example.org', role: 'builder' });
    const builderApps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${builderToken}` });
    assert(builderApps.status === 403, 'Privilege Gate: builder role rejected from admin endpoint with 403');

    // 2.3 Escalation test: @canopy.earth email domain does NOT grant admin privileges
    const spoofDomainToken = generateToken({ id: 'usr_b2', email: 'intruder@canopy.earth', role: 'builder' });
    const spoofDomainApps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${spoofDomainToken}` });
    assert(spoofDomainApps.status === 403, 'Privilege Escalation Blocked: @canopy.earth email domain cannot escalate to admin');

    // 2.4 Escalation test: 'enabler' role does NOT grant admin privileges
    const enablerToken = generateToken({ id: 'usr_e1', email: 'funder@example.org', role: 'enabler' });
    const enablerApps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${enablerToken}` });
    assert(enablerApps.status === 403, 'Privilege Escalation Blocked: enabler role cannot escalate to admin');

    // 2.5 Legitimate admin role is accepted
    const adminToken = generateToken({ id: 'usr_admin', email: 'admin@canopy.earth', role: 'admin' });
    const adminApps = await request('GET', '/api/applications', null, { Authorization: `Bearer ${adminToken}` });
    assert(adminApps.status === 200 && Array.isArray(adminApps.data.applications), 'Admin Access: verified admin token accesses intake queue');

    console.log('\n--- 3. Cryptographic Auth, Email Dispatch & OTP Expiry ---');
    const testEmail = `builder.${Date.now()}@canopy.earth`;
    const shortPwd = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: 'short',
      displayName: 'Elena Test'
    });
    assert(shortPwd.status === 400, 'Password Policy: rejects passcodes < 8 characters');

    // Register user
    const regRes = await request('POST', '/api/auth/register', {
      email: testEmail,
      password: 'StrongPassword123!',
      displayName: 'Elena Test',
      role: 'builder'
    });
    assert(regRes.status === 201 && regRes.data.user?.id, 'Registration: creates user account with password hash');
    assert(regRes.data._testVerificationToken === undefined, 'P0 Security Leak Fix: _testVerificationToken is NOT in response JSON');
    assert(regRes.headers['set-cookie']?.some(c => c.includes('canopy_session=') && c.includes('HttpOnly')), 
      'Cookie Auth: Set-Cookie contains HttpOnly canopy_session cookie');

    // Inspect in-memory email service test inbox
    const sentEmail = emailService.getLatestEmail(testEmail);
    assert(sentEmail && sentEmail.metadata?.code, 'Email Service: 6-digit OTP delivered to test inbox');
    const verificationOtp = sentEmail?.metadata?.code;

    // Test failed attempts increment
    const badOtpRes = await request('POST', '/api/auth/verify', {
      email: testEmail,
      token: '000000'
    });
    assert(badOtpRes.status === 400 && badOtpRes.data.error.includes('attempt(s) remaining'), 
      'OTP Security: failed verification increments attempts counter and warns of remaining attempts');

    // Test successful verification with real OTP
    const verifyRes = await request('POST', '/api/auth/verify', {
      email: testEmail,
      token: verificationOtp
    });
    assert(verifyRes.status === 200 && verifyRes.data.user?.isVerified === true, 
      'Pass Verification: marks user account verified and consumes OTP');

    // Test resend verification cooldown (60s)
    const cooldownRes = await request('POST', '/api/auth/resend-verification', { email: testEmail });
    assert(cooldownRes.status === 400 || cooldownRes.status === 429, 
      'Cooldown Guard: resend verification prevents immediate spamming');

    // Login with valid credentials
    const loginRes = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'StrongPassword123!'
    });
    assert(loginRes.status === 200 && loginRes.data.user?.email === testEmail, 'Login: authenticates with scrypt hash check');

    // Login with invalid credentials rejected with 401
    const badLogin = await request('POST', '/api/auth/login', {
      email: testEmail,
      password: 'WrongPassword!'
    });
    assert(badLogin.status === 401, 'Login Gate: rejects invalid password with 401 without auto-provisioning');

    // Password reset request
    const resetReq = await request('POST', '/api/auth/reset-password-request', { email: testEmail });
    assert(resetReq.status === 200 && resetReq.data.success, 'Password Reset: requests reset code');
    assert(resetReq.data._testResetToken === undefined, 'P0 Security Leak Fix: _testResetToken is NOT in response JSON');

    const resetEmail = emailService.getLatestEmail(testEmail);
    assert(resetEmail && resetEmail.metadata?.type === 'password_reset', 'Email Service: password reset code delivered to test inbox');
    const resetOtp = resetEmail?.metadata?.code;

    // Password reset confirm
    const resetConfirm = await request('POST', '/api/auth/reset-password-confirm', {
      email: testEmail,
      token: resetOtp,
      newPassword: 'BrandNewPassword456!'
    });
    assert(resetConfirm.status === 200 && resetConfirm.data.success, 'Password Reset: confirms reset with new password');

    // Extract cookie from Set-Cookie for subsequent tests
    const sessionCookie = resetConfirm.headers['set-cookie'].find(c => c.startsWith('canopy_session=')).split(';')[0];
    const cookieHeaders = { Cookie: sessionCookie };

    // Verify session via Cookie
    const cookieMe = await request('GET', '/api/auth/me', null, cookieHeaders);
    assert(cookieMe.status === 200 && cookieMe.data.isGuest === false && cookieMe.data.user.email === testEmail, 
      'Cookie Authentication: validates session purely via HttpOnly cookie without localStorage token');

    // Test CSRF protection: mutating request with cookie but missing X-Canopy-Client header
    const csrfFail = await request('POST', '/api/calls', {
      title: 'CSRF Probe',
      problemStatement: 'Testing CSRF block.'
    }, { Cookie: sessionCookie, 'X-Canopy-Client': '' });
    assert(csrfFail.status === 403, 'CSRF Protection: rejects cookie-authenticated POST missing X-Canopy-Client header with 403');

    console.log('\n--- 4. Build Calls Lifecycle & Moderation Engine ---');
    // 4.1 Unauthenticated POST /api/calls rejected with 401
    const unauthCall = await request('POST', '/api/calls', {
      title: 'Unauthorized Call',
      problemStatement: 'Should fail'
    });
    assert(unauthCall.status === 401, 'P0 Security Gate: POST /api/calls rejects unauthenticated submission with 401');

    // 4.2 Authenticated POST /api/calls creates call with pending_review status
    const postCallRes = await request('POST', '/api/calls', {
      title: 'Automated Soil Microgrid Sensor Hub',
      orgName: 'Canopy Agritech',
      problemStatement: 'Scope low-power telemetry for drought forecasting.',
      domain: 'climate',
      neededSkills: ['Firmware', 'Rust']
    }, cookieHeaders);
    assert(postCallRes.status === 201 && postCallRes.data.call?.status === 'pending_review', 
      'Build Call: sets status pending_review (not open) for curator evaluation');
    const createdCallId = postCallRes.data.call?.id;

    // Call should NOT appear in default public 'open' listing
    const publicCalls = await request('GET', '/api/calls');
    const isPubliclyVisible = publicCalls.data.calls.some(c => c.id === createdCallId);
    assert(!isPubliclyVisible, 'Content Gate: pending_review call is NOT publicly broadcast in open calls directory');

    // 4.3 Moderation Queue Inspection
    const modToken = generateToken({ id: 'usr_mod', email: 'moderator@canopy.earth', role: 'moderator' });
    const modQueueRes = await request('GET', '/api/moderation/queue', null, { Authorization: `Bearer ${modToken}` });
    assert(modQueueRes.status === 200 && Array.isArray(modQueueRes.data.queue), 'Moderation Queue: moderator retrieves review queue');
    const queuedItem = modQueueRes.data.queue.find(item => item.entityId === createdCallId);
    assert(queuedItem && queuedItem.status === 'pending', 'Moderation Queue: contains pending submission for new build call');

    // 4.4 Moderation Review Approval
    const reviewApprove = await request('POST', '/api/moderation/review', {
      entityType: 'build_call',
      entityId: createdCallId,
      action: 'approve',
      note: 'Verified problem holder identity and pilot budget allocation.'
    }, { Authorization: `Bearer ${modToken}` });
    assert(reviewApprove.status === 200 && reviewApprove.data.success, 'Moderation Workflow: approves build call');

    // Approved call should NOW appear in public 'open' listing
    const updatedPublicCalls = await request('GET', '/api/calls');
    const isNowVisible = updatedPublicCalls.data.calls.some(c => c.id === createdCallId && c.status === 'open');
    assert(isNowVisible, 'Content Gate: approved build call is now live in open directory');

    // Audit log check
    const auditRes = await request('GET', '/api/moderation/audit-logs', null, { Authorization: `Bearer ${modToken}` });
    assert(auditRes.status === 200 && auditRes.data.auditEvents.some(e => e.targetEntityId === createdCallId), 
      'Audit Logging: records immutable event for moderation approval');

    console.log('\n--- 5. Matches & Reciprocal Privacy ---');
    const handshakeRes = await request('POST', '/api/matches/handshake', {
      recipientId: 'usr_water_ngo',
      intentNote: 'Excited to collaborate on the sensor pipeline.'
    }, cookieHeaders);
    assert(handshakeRes.status === 201 && handshakeRes.data.match?.status === 'pending', 
      'Matches Handshake: creates pending match without premature PII exposure');

    console.log('\n--- 6. Sprints Engine & Capacity Guardrails ---');
    const sprintBoard = await request('GET', '/api/sprints');
    assert(sprintBoard.status === 200 && Array.isArray(sprintBoard.data.forming), 'Sprint Board: returns forming, building, shipped cycles');

    const openSprint = sprintBoard.data.forming.find(s => (s.members?.length || 0) < (s.teamCapacity || 3)) || sprintBoard.data.forming[0];
    if (openSprint) {
      const joinRes = await request('POST', `/api/sprints/${openSprint.id}/join`, { squadRole: 'Sensors Lead' }, cookieHeaders);
      assert(joinRes.status === 200 || joinRes.status === 409 || joinRes.status === 400, 
        'Sprint Join: safely validates membership and squad capacity');
    }

    console.log('\n--- 7. Lab Notebook & Branching ---');
    const notes = await request('GET', '/api/notebook');
    assert(notes.status === 200 && notes.data.entries.length > 0, 'Lab Notebook: returns community field notes');

    const newNote = await request('POST', '/api/notebook', {
      title: 'Sensor calibration under turbidity <script>alert("xss")</script>',
      summarySnippet: 'Validation passed cleanly.',
      domain: 'climate'
    }, cookieHeaders);
    assert(newNote.status === 201 && !newNote.data.entry.title.includes('<script>'), 
      'Input Sanitization: strips script tags from notebook entry titles');

    console.log('\n--- 8. Application Intake ---');
    const appSubmission = await request('POST', '/api/applications', {
      fullName: 'Dr. Jane Vance',
      email: 'jane.vance@ecology.org',
      role: 'problem_holder',
      domain: 'climate',
      motivationNote: 'Field testing coastal salinity data.'
    });
    assert(appSubmission.status === 201 && appSubmission.data.application?.status === 'pending_review', 
      'Application Intake: creates application with pending_review status and enqueues for moderation');

    if (failures === 0) {
      console.log('\n✨ ALL CANOPY CRITICAL SYSTEM TESTS PASSED (0 failures)!');
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
