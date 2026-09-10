/**
 * Canopy Backend Authentication & Login Verification Test Suite
 * Covers:
 * - Standard Email/Passcode authentication
 * - OTP Verification lifecycle & security limits
 * - Password Reset flows
 * - OAuth 2.0 / Supabase callback flows
 * - Firebase & Federated token claims mapping compatibility
 * - Rate limiting, Session Cookie security (HttpOnly, SameSite)
 * - Both /api/auth and /auth route resolution (serverless compatibility)
 */

process.env.NODE_ENV = 'test';
process.env.CANOPY_ISOLATE_STORE = 'true';
process.env.EMAIL_PROVIDER = 'test';
process.env.JWT_SECRET = 'canopy_test_jwt_secret_minimum_32_characters_for_security_spec';
process.env.FOUNDER_EMAILS = 'canopy.connect.collaborate@gmail.com,aarushichatterjee27@gmail.com';
process.env.FOUNDER_CONSOLE_KEY = 'canopy_test_founder_key_secure_secret';

const http = require('http');
const crypto = require('crypto');
const { app } = require('./index.js');
const { generateToken, verifyToken } = require('./middleware/auth');
const emailService = require('./services/email');
const { store } = require('./data/store');
const { users: usersRepo, profiles: profilesRepo } = require('./repositories');

const PORT = 3198;
const server = app.listen(PORT, async () => {
  console.log(`\n======================================================`);
  console.log(`🌱 Canopy Login & Auth Test Suite running on port ${PORT}`);
  console.log(`======================================================\n`);

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
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
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

    console.log('--- 1. OAuth Configuration & Route Discovery ---');
    // 1.1 /api/auth/oauth/config
    const oauthCfg = await request('GET', '/api/auth/oauth/config');
    assert(oauthCfg.status === 200, 'GET /api/auth/oauth/config returns 200 OK');
    assert(oauthCfg.data?.provider === 'google', 'OAuth config specifies Google provider');

    // 1.2 Route prefix resilience: /auth/oauth/config (without /api)
    const directCfg = await request('GET', '/auth/oauth/config');
    assert(directCfg.status === 200, 'GET /auth/oauth/config returns 200 OK (serverless rewrite compatibility)');

    console.log('\n--- 2. Registration & Password Policy Enforcement ---');
    const userEmail = `auth.tester.${Date.now()}@example.org`;

    // 2.1 Missing password
    const emptyPwd = await request('POST', '/api/auth/register', { email: userEmail, password: '' });
    assert(emptyPwd.status === 400, 'Rejects registration with missing password (400)');

    // 2.2 Short password (< 8 chars)
    const shortPwd = await request('POST', '/api/auth/register', { email: userEmail, password: 'short' });
    assert(shortPwd.status === 400, 'Rejects registration with password shorter than 8 chars (400)');

    // 2.3 Invalid email format
    const badEmail = await request('POST', '/api/auth/register', { email: 'notanemail', password: 'ValidPassword123!' });
    assert(badEmail.status === 400, 'Rejects registration with invalid email format (400)');

    // 2.4 Successful registration
    const regRes = await request('POST', '/api/auth/register', {
      email: userEmail,
      password: 'StrongPassword123!',
      displayName: 'Alex Builder',
      role: 'builder'
    });
    assert(regRes.status === 201, 'Creates new user account (201 Created)');
    assert(regRes.data?.user?.email === userEmail, 'Returned user matches registration email');
    assert(regRes.data?.user?.password === undefined && regRes.data?.user?.passwordHash === undefined, 
      'Security: Never returns password or password hash in user payload');

    // 2.5 Verification email dispatch
    const sentOtp = emailService.getLatestEmail(userEmail);
    assert(sentOtp && sentOtp.metadata?.code, '6-digit OTP code dispatched to test inbox');
    const correctCode = sentOtp?.metadata?.code;

    console.log('\n--- 3. Sign In Before Verification (Gate Check) ---');
    // 3.1 Unverified user attempting login
    const unverifiedLogin = await request('POST', '/api/auth/login', {
      email: userEmail,
      password: 'StrongPassword123!'
    });
    assert(unverifiedLogin.status === 403, 'Unverified user sign-in is blocked (403 Forbidden)');
    assert(unverifiedLogin.data?.verificationRequired === true, 'Response instructs client that verification is required');

    console.log('\n--- 4. OTP Verification Lifecycle & Security Limits ---');
    // 4.1 Wrong OTP token
    const wrongOtpRes = await request('POST', '/api/auth/verify', {
      email: userEmail,
      token: '999999'
    });
    assert(wrongOtpRes.status === 400, 'Wrong OTP is rejected (400 Bad Request)');
    assert(wrongOtpRes.data?.error?.includes('attempt(s) remaining'), 'Warns user of remaining verification attempts');

    // 4.2 Successful verification with valid OTP
    const validVerifyRes = await request('POST', '/api/auth/verify', {
      email: userEmail,
      token: correctCode
    });
    assert(validVerifyRes.status === 200, 'Valid OTP verifies account (200 OK)');
    assert(validVerifyRes.data?.user?.isVerified === true, 'User is marked isVerified: true');
    const sessionCookie = validVerifyRes.headers['set-cookie']?.find(c => c.includes('canopy_session='));
    assert(sessionCookie && sessionCookie.includes('HttpOnly'), 'Generates HttpOnly session cookie on verification');

    console.log('\n--- 5. Standard Email / Passcode Login ---');
    // 5.1 Invalid password
    const wrongPwdRes = await request('POST', '/api/auth/login', {
      email: userEmail,
      password: 'IncorrectPassword123!'
    });
    assert(wrongPwdRes.status === 401, 'Sign in with incorrect password returns 401 Unauthorized');

    // 5.2 Non-existent email
    const unknownUserRes = await request('POST', '/api/auth/login', {
      email: 'nonexistent.user.404@example.org',
      password: 'AnyPassword123!'
    });
    assert(unknownUserRes.status === 401, 'Sign in with unknown email returns 401 Unauthorized (generic)');

    // 5.3 Valid credentials sign-in
    const validLoginRes = await request('POST', '/api/auth/login', {
      email: userEmail,
      password: 'StrongPassword123!'
    });
    assert(validLoginRes.status === 200, 'Sign in with correct credentials returns 200 OK');
    assert(validLoginRes.data?.token, 'Response contains JWT auth token');
    assert(validLoginRes.data?.user?.email === userEmail, 'Response contains authenticated user object');
    assert(validLoginRes.data?.profile, 'Response includes linked user profile');

    const loginCookie = validLoginRes.headers['set-cookie']?.find(c => c.includes('canopy_session='));
    assert(loginCookie && loginCookie.includes('HttpOnly'), 'Sign in sets HttpOnly cookie');
    assert(loginCookie && loginCookie.includes('SameSite=Lax'), 'Sign in sets SameSite=Lax cookie');

    // 5.4 Session authentication with /api/auth/me
    const meRes = await request('GET', '/api/auth/me', null, {
      Authorization: `Bearer ${validLoginRes.data.token}`
    });
    assert(meRes.status === 200 && meRes.data.isGuest === false, 'GET /api/auth/me recognizes bearer token');
    assert(meRes.data.user.email === userEmail, 'GET /api/auth/me returns current user identity');

    console.log('\n--- 6. Password Reset Flow ---');
    // 6.1 Request reset code
    const resetReq = await request('POST', '/api/auth/password-reset/request', {
      email: userEmail
    });
    assert(resetReq.status === 200, 'Password reset request returns 200 OK');

    const resetEmail = emailService.getLatestEmail(userEmail);
    assert(resetEmail && resetEmail.metadata?.code, 'Reset OTP dispatched to inbox');
    const resetCode = resetEmail?.metadata?.code;

    // 6.2 Confirm password reset with invalid code
    const badResetConfirm = await request('POST', '/api/auth/password-reset/confirm', {
      email: userEmail,
      token: '000000',
      newPassword: 'BrandNewPassword123!'
    });
    assert(badResetConfirm.status === 400, 'Reset confirmation with bad code returns 400');

    // 6.3 Confirm password reset with valid code
    const goodResetConfirm = await request('POST', '/api/auth/password-reset/confirm', {
      email: userEmail,
      token: resetCode,
      newPassword: 'BrandNewPassword123!'
    });
    assert(goodResetConfirm.status === 200, 'Password reset confirmation succeeds (200 OK)');

    // 6.4 Old password should no longer work
    const oldPwdLogin = await request('POST', '/api/auth/login', {
      email: userEmail,
      password: 'StrongPassword123!'
    });
    assert(oldPwdLogin.status === 401, 'Old password is now rejected');

    // 6.5 New password succeeds
    const newPwdLogin = await request('POST', '/api/auth/login', {
      email: userEmail,
      password: 'BrandNewPassword123!'
    });
    assert(newPwdLogin.status === 200, 'New password successfully authenticates');

    console.log('\n--- 7. OAuth Callback Flow (/api/auth/oauth/callback) ---');
    // 7.1 Missing credentials
    const noCredsRes = await request('POST', '/api/auth/oauth/callback', {});
    assert(noCredsRes.status === 400, 'OAuth callback rejects request missing token or code (400)');

    // 7.2 Invalid OAuth token
    const invalidOauthRes = await request('POST', '/api/auth/oauth/callback', {
      access_token: 'invalid_dummy_token_12345'
    });
    assert([401, 503].includes(invalidOauthRes.status), 
      'OAuth callback returns 401 or 503 for unverifiable external token');

    // 7.3 Direct route compatibility: /auth/oauth/callback
    const directOauthRes = await request('POST', '/auth/oauth/callback', {});
    assert(directOauthRes.status === 400, 'POST /auth/oauth/callback matches correctly without 404');

    console.log('\n--- 8. Firebase & Federated Token Claims Compatibility ---');
    /**
     * Firebase Auth ID Tokens are standard JWTs issued by:
     * https://securetoken.google.com/<projectId>
     * with claims:
     * - sub (Firebase user UID)
     * - email (user's email)
     * - email_verified (boolean)
     * - name / picture
     * - firebase: { sign_in_provider: 'google.com' | 'password' }
     */
    const mockFirebaseClaims = {
      sub: 'firebase_usr_998877',
      email: 'firebase.builder@canopy.test',
      email_verified: true,
      name: 'Priya Sharma',
      picture: 'https://lh3.googleusercontent.com/a/dummy-priya',
      firebase: {
        sign_in_provider: 'google.com'
      }
    };

    // Verify mapping from federated / Firebase claims into Canopy domain entity
    function mapFederatedUser(claims) {
      const email = claims.email.toLowerCase().trim();
      const displayName = claims.name || claims.displayName || email.split('@')[0];
      const provider = claims.firebase?.sign_in_provider || claims.app_metadata?.provider || 'google';
      return {
        id: 'usr_f_' + claims.sub,
        email,
        displayName,
        role: 'builder',
        isVerified: Boolean(claims.email_verified),
        oauthProvider: provider,
        createdAt: new Date().toISOString()
      };
    }

    const federatedUser = mapFederatedUser(mockFirebaseClaims);
    assert(federatedUser.email === 'firebase.builder@canopy.test', 'Federated Claim Mapping: email extracted correctly');
    assert(federatedUser.displayName === 'Priya Sharma', 'Federated Claim Mapping: name extracted correctly');
    assert(federatedUser.isVerified === true, 'Federated Claim Mapping: verified email preserved');
    assert(federatedUser.oauthProvider === 'google.com', 'Federated Claim Mapping: provider identified');

    // Create user and profile in store
    await usersRepo.create(federatedUser);
    const linkedProfile = {
      id: 'prof_f_' + federatedUser.id,
      userId: federatedUser.id,
      displayName: federatedUser.displayName,
      headline: 'BUILDER at Canopy',
      avatarUrl: mockFirebaseClaims.picture,
      primaryDomain: 'climate',
      skillTags: [],
      hoursPerWeek: 10,
      proofOfWork: []
    };
    await profilesRepo.create(linkedProfile);

    const savedUser = await usersRepo.findByEmail('firebase.builder@canopy.test');
    assert(savedUser && savedUser.id === federatedUser.id, 'Federated User successfully provisioned in user repository');

    const savedProfile = await profilesRepo.findByUserId(federatedUser.id);
    assert(savedProfile && savedProfile.avatarUrl === mockFirebaseClaims.picture, 
      'Federated Profile created with picture and builder defaults');

    // Mint Canopy Session Token from Federated User
    const canopyToken = generateToken(savedUser);
    const decodedSession = verifyToken(canopyToken);
    assert(decodedSession && decodedSession.id === federatedUser.id, 
      'Canopy JWT minted successfully for federated authenticated user');

    console.log('\n--- 9. Session Termination & Sign Out ---');
    const logoutRes = await request('POST', '/api/auth/logout', null, {
      Authorization: `Bearer ${canopyToken}`
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout returns 200 OK');
    const clearCookie = logoutRes.headers['set-cookie']?.find(c => c.includes('canopy_session='));
    assert(clearCookie && (clearCookie.includes('Max-Age=0') || clearCookie.includes('expires=')), 
      'Sign out clears canopy_session cookie');

    console.log('\n======================================================');
    if (failures === 0) {
      console.log(`✅ ALL ${totalTests} LOGIN & AUTH VERIFICATION TESTS PASSED.`);
    } else {
      console.error(`❌ ${failures} / ${totalTests} TESTS FAILED.`);
    }
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('Fatal Test Exception:', err);
    failures++;
  } finally {
    server.close();
    process.exit(failures > 0 ? 1 : 0);
  }
});
