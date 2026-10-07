/**
 * @file db-features.test.js
 * Canopy Frontend Test Suite: Matches, Sprints, Calls, Notebook & Applications
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { matches, sprints, calls, notebook, applications, db } from '../db.js';

describe('Canopy Frontend: Feature Adapters Suite', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  /* -------------------------------------------------------------
   * 1. MATCH SANDBOX
   * ------------------------------------------------------------- */
  describe('matches adapter', () => {
    it('fetches sandbox matches with domain and role filter parameters', async () => {
      const mockResult = {
        profiles: [{ id: 'prof_1', full_name: 'Dr. Aris' }],
        calls: [{ id: 'call_1', title: 'Solar Desalination' }],
        totalProfiles: 1,
        totalCalls: 1
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockResult
      });

      const res = await matches.getSandbox({ domain: 'energy', role: 'builder' });

      expect(res.profiles.length).toBe(1);
      const [url] = globalThis.fetch.mock.calls[0];
      expect(url).toContain('domain=energy');
      expect(url).toContain('role=builder');
    });

    it('sends handshake with mutual intent note', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'match_123', status: 'pending' })
      });

      const res = await matches.sendHandshake('usr_target_9', 'Excited to build together', 'call_1');

      expect(res.id).toBe('match_123');
      const [, opts] = globalThis.fetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.recipientId).toBe('usr_target_9');
      expect(body.intentNote).toBe('Excited to build together');
    });
  });

  /* -------------------------------------------------------------
   * 2. SPRINTS ENGINE
   * ------------------------------------------------------------- */
  describe('sprints adapter', () => {
    it('fetches sprint board categorizing forming, building, and shipped', async () => {
      const mockBoard = {
        forming: [{ id: 'sp_1', title: 'Soil Sensor Node' }],
        building: [{ id: 'sp_2', title: 'Groundwater Model' }],
        shipped: [{ id: 'sp_3', title: 'Telemetry Gateway' }],
        totalSprints: 3,
        activeCycleDaysLeft: 6
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockBoard
      });

      const board = await sprints.getBoard('climate');

      expect(board.forming.length).toBe(1);
      expect(board.building.length).toBe(1);
      expect(board.shipped.length).toBe(1);
      expect(board.activeCycleDaysLeft).toBe(6);
    });

    it('joins a sprint squad with specified squad role', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ success: true, sprintId: 'sp_1', squadRole: 'Lead Firmware' })
      });

      const res = await sprints.joinSprint('sp_1', 'Lead Firmware');

      expect(res.success).toBe(true);
      expect(res.squadRole).toBe('Lead Firmware');
    });

    it('creates a new working sprint cycle', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'sp_new_99', title: 'Microgrid Monitor' })
      });

      const res = await sprints.createSprint({
        title: 'Microgrid Monitor',
        problem_statement: 'Grid balancing in remote field stations',
        domain: 'energy'
      });

      expect(res.id).toBe('sp_new_99');
    });
  });

  /* -------------------------------------------------------------
   * 3. BUILD CALLS PIPELINE
   * ------------------------------------------------------------- */
  describe('calls adapter', () => {
    it('fetches verified open build calls', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          calls: [
            { id: 'call_1', title: 'Biomaterials Open Jam', host_name: 'Mira' }
          ]
        })
      });

      const openCalls = await calls.getCalls('biology');

      expect(openCalls.length).toBe(1);
      expect(openCalls[0].title).toBe('Biomaterials Open Jam');
    });

    it('publishes a new Build Call and handles moderation queue response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'call_new_1',
          status: 'pending_review',
          moderationNotice: 'Call queued for curator verification.'
        })
      });

      const res = await calls.postBuildCall({
        title: 'Autonomous Rover Telemetry',
        domain: 'robotics',
        scheduled_at: new Date(Date.now() + 86400000).toISOString()
      });

      expect(res.id).toBe('call_new_1');
      expect(res.status).toBe('pending_review');
    });
  });

  /* -------------------------------------------------------------
   * 4. LAB NOTEBOOK & BRANCHING
   * ------------------------------------------------------------- */
  describe('notebook adapter', () => {
    it('fetches lab notebook field entries', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          entries: [
            { id: 'note_1', title: 'Low-cost Nitrate Sensor Calibration', branch_count: 2 }
          ]
        })
      });

      const entries = await notebook.getEntries({ type: 'experiment' });

      expect(entries.length).toBe(1);
      expect(entries[0].title).toContain('Nitrate Sensor');
    });

    it('plants a new root notebook entry', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ id: 'note_new_1', title: 'Field Specimen 01' })
      });

      const res = await notebook.publishEntry({
        title: 'Field Specimen 01',
        content: 'Observation notes on battery degradation in high humidity',
        domain: 'materials'
      });

      expect(res.id).toBe('note_new_1');
    });

    it('branches an existing notebook entry (growEntry)', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'note_branch_2',
          parent_id: 'note_new_1',
          title: 'Specimen 01 / Anode Modification'
        })
      });

      const res = await notebook.growEntry('note_new_1', {
        title: 'Specimen 01 / Anode Modification',
        findings: 'Coating with silicon polymer reduced degradation by 40%'
      });

      expect(res.parent_id).toBe('note_new_1');
    });
  });

  /* -------------------------------------------------------------
   * 5. SANDBOX APPLICATIONS INTAKE
   * ------------------------------------------------------------- */
  describe('applications adapter', () => {
    it('submits a new cohort application and returns confirmation', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({
          id: 'app_789',
          status: 'submitted',
          message: 'Application received into review pipeline.'
        })
      });

      const res = await applications.submitApplication({
        fullName: 'Kiran Patel',
        email: 'kiran@climate.org',
        role: 'builder',
        domain: 'climate',
        portfolioUrl: 'https://github.com/kiran-climate'
      });

      expect(res.id).toBe('app_789');
      expect(res.status).toBe('submitted');
    });
  });

  /* -------------------------------------------------------------
   * 6. BACKWARDS-COMPATIBLE DB EXPORT
   * ------------------------------------------------------------- */
  describe('legacy db compatibility wrapper', () => {
    it('saves and retrieves profile from local cache', () => {
      const mockProfile = { id: 'prof_1', handle: 'solarpunk' };
      db.saveProfile(mockProfile);

      const retrieved = db.getProfile();
      expect(retrieved).toEqual(mockProfile);
    });
  });
});
