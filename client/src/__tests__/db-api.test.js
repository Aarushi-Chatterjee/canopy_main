/**
 * @file db-api.test.js
 * Canopy Frontend Test Suite: Core HTTP Client & API Request Contract
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequest } from '../db.js';

describe('Canopy Frontend: apiRequest Client Engine', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('1. Successfully completes request and returns unwrapped JSON with ok: true', async () => {
    const mockData = { id: 'call_123', title: 'Rust Ecosystem Deep Dive' };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockData
    });

    const result = await apiRequest('/calls');

    expect(result.ok).toBe(true);
    expect(result.data).toEqual(mockData);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/api/calls');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(options.headers['X-Canopy-Client']).toBe('web');
  });

  it('2. Injects Authorization Bearer header when token exists in localStorage', async () => {
    localStorage.setItem('canopy_auth_token', 'jwt_test_token_xyz');

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user: { id: 'usr_1' } })
    });

    await apiRequest('/auth/me');

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer jwt_test_token_xyz');
  });

  it('3. Omits Authorization header when no auth token is stored', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'healthy' })
    });

    await apiRequest('/health');

    const [, options] = globalThis.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });

  it('4. Correctly classifies HTTP 401 as UNAUTHORIZED contract code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Session expired' })
    });

    const result = await apiRequest('/auth/me');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.code).toBe('UNAUTHORIZED');
    expect(result.message).toBe('Session expired');
  });

  it('5. Correctly classifies HTTP 403 as FORBIDDEN contract code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Administrator access required' })
    });

    const result = await apiRequest('/founder/metrics');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(result.code).toBe('FORBIDDEN');
    expect(result.message).toBe('Administrator access required');
  });

  it('6. Correctly classifies HTTP 404 with helpful Canopy gateway message', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({})
    });

    const result = await apiRequest('/unknown-route');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
    expect(result.message).toContain('Canopy API gateway endpoint not found');
  });

  it('7. Correctly classifies HTTP 409 as CONFLICT contract code', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Call slot is already fully booked' })
    });

    const result = await apiRequest('/calls/call_123/join');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(409);
    expect(result.code).toBe('CONFLICT');
    expect(result.message).toBe('Call slot is already fully booked');
  });

  it('8. Catches network failures and returns honest NETWORK_UNAVAILABLE error', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

    const result = await apiRequest('/sprints');

    expect(result.ok).toBe(false);
    expect(result.status).toBe(0);
    expect(result.code).toBe('NETWORK_UNAVAILABLE');
    expect(result.message).toContain('Canopy could not reach the backend service');
  });
});
