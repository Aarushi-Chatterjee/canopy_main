/**
 * @file db-auth.test.js
 * Canopy Frontend Test Suite: Authentication, OAuth & Session Lifecycle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth } from '../db.js';

describe('Canopy Frontend: auth Client Engine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    window.location.search = '';
    window.location.href = 'http://localhost:5173/login.html';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. auth.signUp creates user and writes session to localStorage', async () => {
    const mockUser = { id: 'usr_new_1', email: 'builder@example.com', role: 'builder' };
    const mockProfile = { id: 'prof_1', display_name: 'Elena Rostova' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({
        user: mockUser,
        profile: mockProfile,
        verificationNotice: 'Verification passcode dispatched to your email.'
      })
    });

    const res = await auth.signUp('builder@example.com', 'SecurePass123!', {
      displayName: 'Elena Rostova',
      role: 'builder'
    });

    expect(res.data.user.email).toBe('builder@example.com');
    expect(res.verificationNotice).toContain('passcode dispatched');
    expect(auth.getUser()).toEqual(mockUser);
    expect(auth.getProfile()).toEqual(mockProfile);
  });

  it('2. auth.signUp throws clean Error when server rejects request', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Passcode must be at least 8 characters long.' })
    });

    await expect(auth.signUp('short@example.com', 'short')).rejects.toThrow(
      'Passcode must be at least 8 characters long.'
    );
  });

  it('3. auth.verifyOtp succeeds and marks user session active', async () => {
    const verifiedUser = { id: 'usr_ver_1', email: 'builder@example.com', isVerified: true };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: verifiedUser })
    });

    const res = await auth.verifyOtp('builder@example.com', '123456');

    expect(res.user.isVerified).toBe(true);
    expect(auth.getUser()?.isVerified).toBe(true);
  });

  it('4. auth.verifyOtp throws Error on invalid or expired OTP code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Invalid verification passcode. 2 attempts remaining.' })
    });

    await expect(auth.verifyOtp('builder@example.com', '000000')).rejects.toThrow(
      'Invalid verification passcode. 2 attempts remaining.'
    );
  });

  it('5. auth.signIn authenticates valid credentials and saves profile', async () => {
    const activeUser = { id: 'usr_act_1', email: 'elena@canopy.test' };
    const activeProf = { id: 'prof_act_1', display_name: 'Elena Rostova', role: 'builder' };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        user: activeUser,
        profile: activeProf,
        token: 'mock_jwt_token'
      })
    });

    const res = await auth.signIn('elena@canopy.test', 'CorrectPass123!');

    expect(res.user.email).toBe('elena@canopy.test');
    expect(auth.getUser()).toEqual(activeUser);
    expect(auth.getProfile()).toEqual(activeProf);
  });

  it('6. auth.signIn throws honest Error on incorrect credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid email or password.' })
    });

    await expect(auth.signIn('bad@example.com', 'wrongpassword')).rejects.toThrow(
      'Invalid email or password.'
    );
  });

  it('7. auth.signInWithGoogle computes correct OAuth authorize URL with Google provider', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        provider: 'google',
        supabaseUrl: 'https://test-project.supabase.co'
      })
    });

    await auth.signInWithGoogle('/sprint.html');

    expect(window.location.href).toContain('https://test-project.supabase.co/auth/v1/authorize?provider=google');
    expect(window.location.href).toContain(encodeURIComponent('redirect=%2Fsprint.html'));
  });

  it('8. auth.handleOAuthCallback saves federated user session', async () => {
    const federatedUser = { id: 'usr_google_1', email: 'google.user@example.com' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: federatedUser, token: 'fed_token_123' })
    });

    const res = await auth.handleOAuthCallback({ access_token: 'valid_google_token' });

    expect(res.user.email).toBe('google.user@example.com');
    expect(auth.getUser()).toEqual(federatedUser);
  });

  it('9. auth.getCurrentUser retrieves authenticated identity or clears guest state', async () => {
    // 1. Authenticated session
    const serverUser = { id: 'usr_me_1', email: 'me@example.com' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: serverUser, isGuest: false })
    });

    const current = await auth.getCurrentUser();
    expect(current).toEqual(serverUser);
    expect(auth.getUser()).toEqual(serverUser);

    // 2. Unauthenticated guest session: clears localStorage
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: null, isGuest: true })
    });

    const guest = await auth.getCurrentUser();
    expect(guest).toBeNull();
    expect(auth.getUser()).toBeNull();
  });

  it('10. auth.signOut invalidates server session and purges local credentials', async () => {
    localStorage.setItem('canopy_auth_user', JSON.stringify({ id: 'usr_1' }));
    localStorage.setItem('canopy_auth_token', 'jwt_token_123');
    localStorage.setItem('canopy_user_profile', JSON.stringify({ name: 'Test' }));

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    });

    await auth.signOut();

    expect(localStorage.getItem('canopy_auth_user')).toBeNull();
    expect(localStorage.getItem('canopy_auth_token')).toBeNull();
    expect(localStorage.getItem('canopy_user_profile')).toBeNull();
  });

  it('11. auth.requestPasswordReset dispatches reset instructions', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Passcode reset instructions dispatched.' })
    });

    const res = await auth.requestPasswordReset('forgot@example.com');
    expect(res.ok).toBe(true);
    expect(res.message).toContain('Passcode reset instructions dispatched');
  });

  it('12. auth.confirmPasswordReset succeeds with valid code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Passcode updated successfully.' })
    });

    const res = await auth.confirmPasswordReset('forgot@example.com', '654321', 'BrandNewPass123!');
    expect(res.ok).toBe(true);
  });
});
