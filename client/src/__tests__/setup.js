/**
 * Vitest Setup File for Canopy Frontend Tests
 * Location: client/src/__tests__/setup.js
 */

// In-memory mock storage implementation for client tests
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  clear() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  get length() {
    return Object.keys(this.store).length;
  }
  key(index) {
    return Object.keys(this.store)[index] || null;
  }
}

// Global browser polyfills
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new LocalStorageMock();
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {
    location: {
      origin: 'http://localhost:5173',
      pathname: '/login.html',
      search: '',
      href: 'http://localhost:5173/login.html'
    }
  };
}

// Reset storage before each test
if (typeof beforeEach === 'function') {
  beforeEach(() => {
    globalThis.localStorage.clear();
    globalThis.window.location.search = '';
    globalThis.window.location.href = 'http://localhost:5173/login.html';
  });
}
