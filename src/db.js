/**
 * Canopy Unified Database & API Client Layer
 * Production Truth Standard:
 * - Communicates with Canopy Backend API Gateway (http://localhost:3001/api)
 * - Fails honestly: Never saves synthetic product records (applications, calls, sprints, matches, notes) to localStorage when offline.
 * - Retains only user session credentials in secure client storage.
 */

const API_BASE = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

const STORAGE_KEYS = {
  USER: 'canopy_auth_user',
  TOKEN: 'canopy_auth_token',
  PROFILE: 'canopy_user_profile'
};

function getLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function setLocal(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write failed', e);
  }
}

function getAuthHeader() {
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Low-overhead fetch wrapper with standard outcome contracts:
// Success: { ok: true, data: Object }
// Failure: { ok: false, status: Number, code: String, message: String }
export async function apiRequest(endpoint, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include', // Support HttpOnly secure session cookies
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-Canopy-Client': 'web',
        ...getAuthHeader(),
        ...(options.headers || {})
      }
    });
    clearTimeout(timeout);

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, data };
    }
    const code = res.status === 401 ? 'UNAUTHORIZED' 
      : res.status === 403 ? 'FORBIDDEN' 
      : res.status === 404 ? 'NOT_FOUND' 
      : res.status === 409 ? 'CONFLICT' 
      : 'SERVER_ERROR';

    return {
      ok: false,
      status: res.status,
      code,
      message: data.error || `Server responded with status ${res.status}.`
    };
  } catch (networkErr) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 0,
      code: 'NETWORK_UNAVAILABLE',
      message: 'Canopy could not reach the service. Nothing has been saved.'
    };
  }
}

/* ============================================================
   1. AUTHENTICATION & FIELD STATION PASS
   ============================================================ */
export const auth = {
  async signUp(email, password, metadata = {}) {
    const remote = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role: metadata.role || 'builder', displayName: metadata.displayName })
    });

    if (remote.ok && remote.data?.user) {
      setLocal(STORAGE_KEYS.USER, remote.data.user);
      if (remote.data.profile) setLocal(STORAGE_KEYS.PROFILE, remote.data.profile);
      return { data: remote.data, error: null, verificationNotice: remote.data.verificationNotice };
    }

    throw new Error(remote.message || 'Registration failed.');
  },

  async verifyOtp(email, token) {
    const remote = await apiRequest('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token })
    });

    if (remote.ok && remote.data?.user) {
      setLocal(STORAGE_KEYS.USER, remote.data.user);
      if (remote.data.profile) setLocal(STORAGE_KEYS.PROFILE, remote.data.profile);
      return { data: remote.data, user: remote.data.user, error: null };
    }

    throw new Error(remote.message || 'Verification failed.');
  },

  async signIn(email, password) {
    const remote = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    if (remote.ok && remote.data?.user) {
      setLocal(STORAGE_KEYS.USER, remote.data.user);
      if (remote.data.profile) setLocal(STORAGE_KEYS.PROFILE, remote.data.profile);
      return { data: remote.data, user: remote.data.user, error: null };
    }

    throw new Error(remote.message || 'Invalid email or password.');
  },

  async signOut() {
    await apiRequest('/auth/logout', { method: 'POST' });
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    return { error: null };
  },

  getUser() {
    return getLocal(STORAGE_KEYS.USER, null);
  },

  async getCurrentUser() {
    const remote = await apiRequest('/auth/me');
    if (remote.ok && remote.data?.user && !remote.data.isGuest) {
      setLocal(STORAGE_KEYS.USER, remote.data.user);
      if (remote.data.profile) setLocal(STORAGE_KEYS.PROFILE, remote.data.profile);
      return remote.data.user;
    }
    if (remote.ok && remote.data?.isGuest) {
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      return null;
    }
    return getLocal(STORAGE_KEYS.USER, null);
  },

  getProfile() {
    return getLocal(STORAGE_KEYS.PROFILE, null);
  }
};

/* ============================================================
   2. MATCH SANDBOX & VERIFIED CONNECTIONS
   ============================================================ */
export const matches = {
  async getSandbox(filters = {}) {
    const params = new URLSearchParams();
    if (filters.domain) params.append('domain', filters.domain);
    if (filters.role) params.append('role', filters.role);

    const remote = await apiRequest(`/matches/sandbox?${params.toString()}`);
    if (remote.ok && remote.data) return remote.data;

    return {
      profiles: [],
      calls: [],
      totalProfiles: 0,
      totalCalls: 0,
      error: remote.message
    };
  },

  async getConnections() {
    const remote = await apiRequest('/matches/connections');
    if (remote.ok && remote.data?.connections) return remote.data.connections;
    return [];
  },

  async sendHandshake(recipientId, intentNote, buildCallId = null) {
    const remote = await apiRequest('/matches/handshake', {
      method: 'POST',
      body: JSON.stringify({
        recipientId,
        buildCallId,
        intentNote
      })
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Failed to dispatch handshake.');
  }
};

/* ============================================================
   3. SPRINTS ENGINE & AMBIENT CLOCK
   ============================================================ */
export const sprints = {
  async getBoard(domain = null) {
    const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    const remote = await apiRequest(`/sprints${query}`);
    if (remote.ok && remote.data?.forming) return remote.data;

    return {
      forming: [],
      building: [],
      shipped: [],
      totalSprints: 0,
      activeCycleDaysLeft: 0,
      error: remote.message
    };
  },

  async joinSprint(sprintId, squadRole = 'Technical Contributor') {
    const remote = await apiRequest(`/sprints/${sprintId}/join`, {
      method: 'POST',
      body: JSON.stringify({ squadRole })
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Unable to join sprint squad.');
  },

  async notifySprint(sprintId, email) {
    const remote = await apiRequest(`/sprints/${sprintId}/notify`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Unable to subscribe to sprint cycle.');
  }
};

/* ============================================================
   4. BUILD CALLS PIPELINE
   ============================================================ */
export const calls = {
  async getCalls(domain = null) {
    const query = domain ? `?domain=${encodeURIComponent(domain)}` : '';
    const remote = await apiRequest(`/calls${query}`);
    if (remote.ok && remote.data?.calls) return remote.data.calls;
    return [];
  },

  async postBuildCall(callData) {
    const remote = await apiRequest('/calls', {
      method: 'POST',
      body: JSON.stringify(callData)
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Failed to publish Build Call.');
  }
};

/* ============================================================
   5. LAB NOTEBOOK & GROW ENTRY BRANCHING
   ============================================================ */
export const notebook = {
  async getEntries(filters = {}) {
    const params = new URLSearchParams();
    if (filters.domain) params.append('domain', filters.domain);
    if (filters.type) params.append('type', filters.type);

    const remote = await apiRequest(`/notebook?${params.toString()}`);
    if (remote.ok && remote.data?.entries) return remote.data.entries;
    return [];
  },

  async publishEntry(entryData) {
    const remote = await apiRequest('/notebook', {
      method: 'POST',
      body: JSON.stringify(entryData)
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Failed to plant notebook entry.');
  },

  async growEntry(entryId, branchData) {
    const remote = await apiRequest(`/notebook/${entryId}/grow`, {
      method: 'POST',
      body: JSON.stringify(branchData)
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Failed to branch notebook entry.');
  }
};

/* ============================================================
   6. SANDBOX APPLICATIONS INTAKE
   ============================================================ */
export const applications = {
  async submitApplication(application) {
    const remote = await apiRequest('/applications', {
      method: 'POST',
      body: JSON.stringify(application)
    });

    if (remote.ok && remote.data) return remote.data;
    throw new Error(remote.message || 'Failed to submit application.');
  }
};

/* ============================================================
   7. BACKWARDS-COMPATIBLE DB EXPORT
   ============================================================ */
export const db = {
  submitApplication: (app) => applications.submitApplication(app),
  postBuildCall: (call) => calls.postBuildCall(call),
  saveProfile: (prof) => {
    setLocal(STORAGE_KEYS.PROFILE, prof);
    return prof;
  },
  getProfile: () => getLocal(STORAGE_KEYS.PROFILE, null)
};

export default {
  auth,
  matches,
  sprints,
  calls,
  notebook,
  applications,
  db
};