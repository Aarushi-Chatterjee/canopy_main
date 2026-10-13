/**
 * Canopy Notification & Collaboration Corner
 * Unified client-backend sync:
 * - Before login: Clean static welcome introduction linking to the open match sandbox / sprints.
 * - After login: Connects directly to backend endpoints (/api/sprints/my/applications & /api/matches/my)
 *   with minimal, concise notifications simulating standard platform workflows (click-to-redirect).
 */

import { auth, sprints, matches } from './db.js';

const NOTIF_STORAGE_KEY = 'canopy_notifications_log';
const GUEST_SEEN_KEY = 'canopy_guest_notif_seen';

function getInitialSeed() {
  return {
    sent: [
      {
        id: 'notif_sent_salinity',
        type: 'sprint_application',
        sprintId: 'sp_salinity_telemetry',
        title: 'Coastal Salinity Telemetry Squad',
        subtext: 'Squad accepted your note · Channel unlocked',
        status: 'accepted',
        revealedContact: 'matrix: #salinity-sprint:canopy.earth',
        url: 'sprint.html#sp_salinity_telemetry',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      },
      {
        id: 'notif_sent_groundwater',
        type: 'sprint_application',
        sprintId: 'sp_groundwater_sample',
        title: 'Groundwater Optical Probe Squad',
        subtext: 'Planted note as Sensors Lead · Under lead review',
        status: 'pending_review',
        url: 'sprint.html#sp_groundwater_sample',
        createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
      }
    ],
    received: [
      {
        id: 'notif_rec_elena',
        type: 'squad_request',
        sprintId: 'sp_groundwater_sample',
        title: 'Elena Vance → Groundwater Optical Probe',
        subtext: 'Applied as Spectroscopy Engineer',
        status: 'pending_review',
        url: 'sprint.html#sp_groundwater_sample',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      }
    ]
  };
}

export const notificationCenter = {
  getLocal() {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sent) && Array.isArray(parsed.received)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Canopy Notification] Error loading from storage:', e);
    }
    const seed = getInitialSeed();
    this.saveLocal(seed);
    return seed;
  },

  saveLocal(data) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Canopy Notification] Error saving to storage:', e);
    }
  },

  isLoggedIn() {
    const user = auth.getUser();
    return !!(user && !user.isGuest);
  },

  async fetchRemoteData() {
    if (!this.isLoggedIn()) {
      return null;
    }

    try {
      const [appsOutcome, matchesOutcome] = await Promise.allSettled([
        sprints.getMyApplications(),
        matches.getMyMatches()
      ]);

      const sent = [];
      const received = [];

      // 1. Process Sprint Applications
      if (appsOutcome.status === 'fulfilled' && appsOutcome.value) {
        const remoteApps = appsOutcome.value;
        const remoteSent = Array.isArray(remoteApps.sent) ? remoteApps.sent : [];
        const remoteRec = Array.isArray(remoteApps.received) ? remoteApps.received : [];

        remoteSent.forEach(app => {
          sent.push({
            id: app.id || 'sp_app_' + Math.random().toString(36).slice(2, 8),
            type: 'sprint_application',
            sprintId: app.sprintId,
            title: app.sprintTitle || 'Active Sprint Squad',
            subtext: app.status === 'accepted'
              ? 'Squad accepted your note · Channel unlocked'
              : app.status === 'declined'
              ? 'Cycle filled or closed'
              : `Planted as ${app.role || 'Contributor'} · Under lead review`,
            status: app.status || 'pending_review',
            url: app.sprintId ? `sprint.html#${app.sprintId}` : 'sprint.html',
            createdAt: app.createdAt || new Date().toISOString()
          });
        });

        remoteRec.forEach(app => {
          received.push({
            id: app.id || 'sp_rec_' + Math.random().toString(36).slice(2, 8),
            type: 'squad_request',
            sprintId: app.sprintId,
            title: `${app.applicantName || 'Collaborator'} → ${app.sprintTitle || 'Sprint'}`,
            subtext: `Applied as ${app.role || 'Technical Contributor'}`,
            status: app.status || 'pending_review',
            url: app.sprintId ? `sprint.html#${app.sprintId}` : 'sprint.html',
            createdAt: app.createdAt || new Date().toISOString()
          });
        });
      }

      // 2. Process Matches / Handshakes
      if (matchesOutcome.status === 'fulfilled' && matchesOutcome.value) {
        const remoteMatches = matchesOutcome.value;
        const remoteOut = Array.isArray(remoteMatches.outbound) ? remoteMatches.outbound : [];
        const remoteIn = Array.isArray(remoteMatches.inbound) ? remoteMatches.inbound : [];

        remoteOut.forEach(m => {
          const partnerName = m.partner?.displayName || 'Collaborator';
          const isConn = m.status === 'connected';
          sent.push({
            id: m.id || 'mtc_out_' + Math.random().toString(36).slice(2, 8),
            type: 'match_handshake',
            title: partnerName,
            subtext: isConn ? 'Mutual handshake connected · Channel unlocked' : 'Handshake dispatched · Awaiting response',
            status: isConn ? 'accepted' : 'pending_review',
            url: 'match.html',
            createdAt: m.createdAt || new Date().toISOString()
          });
        });

        remoteIn.forEach(m => {
          const partnerName = m.partner?.displayName || 'Collaborator';
          const isConn = m.status === 'connected';
          received.push({
            id: m.id || 'mtc_in_' + Math.random().toString(36).slice(2, 8),
            type: 'match_handshake',
            title: `${partnerName} sent a handshake`,
            subtext: m.intentNote ? `"${m.intentNote.slice(0, 52)}..."` : 'Requested high-context collaboration',
            status: isConn ? 'accepted' : 'pending_review',
            url: 'match.html',
            createdAt: m.createdAt || new Date().toISOString()
          });
        });
      }

      // Deduplicate and sort newest first
      const cleanSent = dedupe(sent).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const cleanRec = dedupe(received).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const merged = { sent: cleanSent, received: cleanRec };
      this.saveLocal(merged);
      return merged;
    } catch (e) {
      console.warn('[Canopy Notification] Remote sync failed, using cached queue:', e);
      return this.getLocal();
    }
  },

  getUnreadCount() {
    if (!this.isLoggedIn()) {
      const seen = sessionStorage.getItem(GUEST_SEEN_KEY);
      return seen ? 0 : 1;
    }
    const data = this.getLocal();
    const pendingSent = (data.sent || []).filter(s => s.status === 'accepted').length;
    const pendingReceived = (data.received || []).filter(r => r.status === 'pending_review').length;
    return pendingSent + pendingReceived;
  },

  markSeen() {
    if (!this.isLoggedIn()) {
      sessionStorage.setItem(GUEST_SEEN_KEY, 'true');
    }
    this.updateBadges();
  },

  updateBadges() {
    const count = this.getUnreadCount();
    const badgeEl = document.getElementById('navNotificationBadge');
    const drawerBadgeEl = document.getElementById('drawerNotificationBadge');

    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
      if (count > 0) badgeEl.classList.add('pulse');
    }
    if (drawerBadgeEl) {
      drawerBadgeEl.textContent = count;
      drawerBadgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  async render() {
    this.updateBadges();
    const sentListEl = document.getElementById('notifSentList');
    const recListEl = document.getElementById('notifReceivedList');
    if (!sentListEl || !recListEl) return;

    const loggedIn = this.isLoggedIn();

    // 1. UNLOGGED / BEFORE LOGIN: Minimal Static Welcome Only
    if (!loggedIn) {
      sentListEl.innerHTML = `
        <div class="notif-empty">
          <span style="font-size:1.8rem;">🌱</span>
          <p><strong>Track Your Applications</strong></p>
          <span class="hint-small">Sign in to track your planted sprint notes, squad reviews, and unlocked contact channels.</span>
          <div style="margin-top:14px;">
            <a href="login.html" class="btn btn-stamp btn-xs">Sign In / Dashboard →</a>
          </div>
        </div>`;

      recListEl.innerHTML = `
        <div class="notif-card status-accepted notif-clickable" data-url="match.html" role="link" tabindex="0">
          <div class="notif-card-header">
            <h5 class="notif-card-title">Welcome to Canopy</h5>
            <span class="notif-badge-chip status-accepted">Intro</span>
          </div>
          <div class="notif-card-sub">Open field station for ecological engineering · Explore active sprints and build calls.</div>
          <div class="notif-card-foot">
            <span class="hint-small">Live Now</span>
            <span class="notif-view-cta">Explore Sandbox ↗</span>
          </div>
        </div>`;
      return;
    }

    // 2. LOGGED IN: Render local cached data immediately, then sync in background
    let data = this.getLocal();
    this.renderData(data);

    // Sync remote in background to keep data crisp
    this.fetchRemoteData().then(remoteData => {
      if (remoteData) {
        this.renderData(remoteData);
        this.updateBadges();
      }
    });
  },

  renderData(data) {
    const sentListEl = document.getElementById('notifSentList');
    const recListEl = document.getElementById('notifReceivedList');

    if (sentListEl) {
      if (!data.sent || data.sent.length === 0) {
        sentListEl.innerHTML = `
          <div class="notif-empty">
            <span style="font-size:1.8rem;">🌱</span>
            <p><strong>No planted notes yet</strong></p>
            <span class="hint-small">When you plant a note on an active sprint or send a handshake, your updates appear here.</span>
          </div>`;
      } else {
        sentListEl.innerHTML = data.sent.map(item => {
          const isAccepted = item.status === 'accepted';
          const isDeclined = item.status === 'declined';
          const statusClass = isAccepted ? 'status-accepted' : isDeclined ? 'status-declined' : 'status-pending';
          const statusText = isAccepted ? '✓ Accepted' : isDeclined ? '✕ Closed' : '⏳ Reviewing';
          const timeAgo = formatTimeAgo(item.createdAt);
          const targetUrl = item.url || (item.sprintId ? `sprint.html#${item.sprintId}` : 'sprint.html');

          return `
            <div class="notif-card ${statusClass} notif-clickable" data-url="${escapeHtml(targetUrl)}" role="link" tabindex="0">
              <div class="notif-card-header">
                <h5 class="notif-card-title">${escapeHtml(item.title)}</h5>
                <span class="notif-badge-chip ${statusClass}">${statusText}</span>
              </div>
              <div class="notif-card-sub">${escapeHtml(item.subtext)}</div>
              <div class="notif-card-foot">
                <span class="hint-small">${timeAgo}</span>
                <span class="notif-view-cta">Open ↗</span>
              </div>
            </div>`;
        }).join('');
      }
    }

    if (recListEl) {
      if (!data.received || data.received.length === 0) {
        recListEl.innerHTML = `
          <div class="notif-empty">
            <span style="font-size:1.8rem;">🌿</span>
            <p><strong>No incoming requests</strong></p>
            <span class="hint-small">Incoming squad applications from fellow builders will appear here for review.</span>
          </div>`;
      } else {
        recListEl.innerHTML = data.received.map(item => {
          const isPending = item.status === 'pending_review' || item.status === 'pending';
          const isAccepted = item.status === 'accepted';
          const isDeclined = item.status === 'declined';
          const statusClass = isAccepted ? 'status-accepted' : isDeclined ? 'status-declined' : 'status-pending';
          const statusText = isAccepted ? '✓ Locked' : isDeclined ? '✕ Declined' : 'Needs Call';
          const timeAgo = formatTimeAgo(item.createdAt);
          const targetUrl = item.url || (item.sprintId ? `sprint.html#${item.sprintId}` : 'match.html');

          return `
            <div class="notif-card ${statusClass} notif-clickable" data-url="${escapeHtml(targetUrl)}" data-id="${item.id}" role="link" tabindex="0">
              <div class="notif-card-header">
                <h5 class="notif-card-title">${escapeHtml(item.title)}</h5>
                <span class="notif-badge-chip ${statusClass}">${statusText}</span>
              </div>
              <div class="notif-card-sub">${escapeHtml(item.subtext)}</div>
              ${isPending ? `
                <div class="notif-action-row" style="margin-top:8px;">
                  <button type="button" class="btn btn-stamp btn-xs notif-btn-accept" data-id="${item.id}">
                    ✓ Accept
                  </button>
                  <button type="button" class="btn btn-ghost btn-xs notif-btn-decline" data-id="${item.id}">
                    ✕ Decline
                  </button>
                </div>` : ''}
              <div class="notif-card-foot">
                <span class="hint-small">${timeAgo}</span>
                <span class="notif-view-cta">Review ↗</span>
              </div>
            </div>`;
        }).join('');
      }
    }
  },

  async acceptRequest(id) {
    try {
      await sprints.acceptApplication(id).catch(() => null);
    } catch (e) {
      // Handled gracefully
    }
    const data = this.getLocal();
    const item = data.received.find(r => r.id === id);
    if (item) {
      item.status = 'accepted';
      item.subtext = '✓ Accepted to squad · Channel unlocked';
      this.saveLocal(data);
      this.render();
      window.dispatchEvent(new CustomEvent('canopy:request-accepted', { detail: item }));
      return item;
    }
    return null;
  },

  async declineRequest(id) {
    try {
      await sprints.declineApplication(id).catch(() => null);
    } catch (e) {
      // Handled gracefully
    }
    const data = this.getLocal();
    const item = data.received.find(r => r.id === id);
    if (item) {
      item.status = 'declined';
      item.subtext = 'Application declined';
      this.saveLocal(data);
      this.render();
      return item;
    }
    return null;
  }
};

function dedupe(arr) {
  const map = new Map();
  arr.forEach(item => {
    if (item.id && !map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values());
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

function formatTimeAgo(isoString) {
  if (!isoString) return 'recently';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Global initialization helper
export function initNotificationCorner() {
  const headerRight = document.querySelector('header .header-inner > div:last-child');
  let btn = document.getElementById('navNotificationsBtn');

  const bellIconHtml = `
    <svg class="icon notif-bell-icon" aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
    <span class="notification-badge" id="navNotificationBadge" style="display:none;">0</span>
  `;

  if (headerRight && !btn) {
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm notification-bell-btn';
    btn.id = 'navNotificationsBtn';
    btn.setAttribute('aria-label', 'Open Notification Corner');
    btn.title = 'Collaboration & Notification Corner';
    btn.innerHTML = bellIconHtml;

    const themeBtn = document.getElementById('desktopThemeToggle');
    const menuBtn = document.getElementById('menuToggle');
    const anchor = themeBtn || menuBtn;
    if (anchor && anchor.parentNode === headerRight) {
      headerRight.insertBefore(btn, anchor);
    } else {
      headerRight.appendChild(btn);
    }
  } else if (btn) {
    if (!btn.querySelector('.notif-bell-icon') || btn.querySelector('use')) {
      const badgeCount = document.getElementById('navNotificationBadge')?.textContent || '0';
      const badgeVisible = document.getElementById('navNotificationBadge')?.style.display !== 'none';
      btn.innerHTML = bellIconHtml;
      const newBadge = btn.querySelector('#navNotificationBadge');
      if (newBadge) {
        newBadge.textContent = badgeCount;
        newBadge.style.display = badgeVisible ? 'inline-flex' : 'none';
      }
    }
  }

  // Ensure modal/dropdown panel exists in DOM
  if (!document.getElementById('notificationsPanel')) {
    const panelWrap = document.createElement('div');
    panelWrap.innerHTML = `
      <div class="notifications-panel-backdrop" id="notifPanelBackdrop" style="display:none;"></div>
      <aside class="notifications-panel" id="notificationsPanel" style="display:none;" role="region" aria-label="Collaboration & Notification Corner">
        <div class="notif-panel-header">
          <div class="notif-panel-title-wrap">
            <span class="notif-panel-icon">🔔</span>
            <div>
              <h4 class="notif-panel-title">Notifications</h4>
              <p class="notif-panel-sub">Planted notes, reviews &amp; connections</p>
            </div>
          </div>
          <button type="button" class="notif-close-btn" id="closeNotifPanel" aria-label="Close notification panel">✕</button>
        </div>

        <div class="notif-tabs" role="tablist">
          <button type="button" class="notif-tab active" id="tabNotifReceived" role="tab" aria-selected="true">
            Updates &amp; Requests
          </button>
          <button type="button" class="notif-tab" id="tabNotifSent" role="tab" aria-selected="false">
            My Planted Notes
          </button>
        </div>

        <div class="notif-panel-body">
          <div class="notif-tab-content active" id="contentNotifReceived">
            <div class="notif-list" id="notifReceivedList"></div>
          </div>
          <div class="notif-tab-content" id="contentNotifSent" style="display:none;">
            <div class="notif-list" id="notifSentList"></div>
          </div>
        </div>

        <div class="notif-panel-foot">
          <span class="hint-small" style="font-size:0.75rem;">Canopy Mutual Consent · High-context collaboration</span>
        </div>
      </aside>
    `;
    document.body.appendChild(panelWrap);
  }

  const notifBtn = document.getElementById('navNotificationsBtn');
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notifPanelBackdrop');
  const closeBtn = document.getElementById('closeNotifPanel');

  function openPanel() {
    if (!panel || !backdrop) return;
    notificationCenter.markSeen();
    notificationCenter.render();
    backdrop.style.display = 'block';
    panel.style.display = 'flex';
    setTimeout(() => {
      backdrop.classList.add('open');
      panel.classList.add('open');
    }, 10);
  }

  function closePanel() {
    if (!panel || !backdrop) return;
    backdrop.classList.remove('open');
    panel.classList.remove('open');
    setTimeout(() => {
      backdrop.style.display = 'none';
      panel.style.display = 'none';
    }, 200);
  }

  if (notifBtn) notifBtn.addEventListener('click', openPanel);
  const drawerNotifBtn = document.getElementById('drawerNotificationsBtn');
  if (drawerNotifBtn) {
    drawerNotifBtn.addEventListener('click', () => {
      const drawer = document.getElementById('navDrawer');
      const drawerBackdrop = document.getElementById('drawerBackdrop');
      if (drawer) drawer.classList.remove('is-open');
      if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
      openPanel();
    });
  }
  if (closeBtn) closeBtn.addEventListener('click', closePanel);
  if (backdrop) backdrop.addEventListener('click', closePanel);

  // Tab switching
  const tabSent = document.getElementById('tabNotifSent');
  const tabRec = document.getElementById('tabNotifReceived');
  const contentSent = document.getElementById('contentNotifSent');
  const contentRec = document.getElementById('contentNotifReceived');

  if (tabSent && tabRec && contentSent && contentRec) {
    tabRec.addEventListener('click', () => {
      tabRec.classList.add('active');
      tabRec.setAttribute('aria-selected', 'true');
      tabSent.classList.remove('active');
      tabSent.setAttribute('aria-selected', 'false');
      contentRec.style.display = 'block';
      contentSent.style.display = 'none';
    });

    tabSent.addEventListener('click', () => {
      tabSent.classList.add('active');
      tabSent.setAttribute('aria-selected', 'true');
      tabRec.classList.remove('active');
      tabRec.setAttribute('aria-selected', 'false');
      contentSent.style.display = 'block';
      contentRec.style.display = 'none';
    });
  }

  // Global click delegation for clicks on notification cards (redirects to target page)
  document.addEventListener('click', async (e) => {
    // 1. Accept button
    const acceptBtn = e.target.closest('.notif-btn-accept');
    if (acceptBtn) {
      e.stopPropagation();
      const id = acceptBtn.getAttribute('data-id');
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'Accepting...';
      await notificationCenter.acceptRequest(id);
      const toast = document.getElementById('toast');
      if (toast) {
        toast.textContent = `✓ Collaborator accepted to squad!`;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3500);
      }
      return;
    }

    // 2. Decline button
    const declineBtn = e.target.closest('.notif-btn-decline');
    if (declineBtn) {
      e.stopPropagation();
      const id = declineBtn.getAttribute('data-id');
      declineBtn.disabled = true;
      await notificationCenter.declineRequest(id);
      return;
    }

    // 3. Card click -> redirect to target page
    const card = e.target.closest('.notif-card.notif-clickable');
    if (card) {
      const url = card.getAttribute('data-url');
      if (url) {
        closePanel();
        window.location.href = url;
      }
    }
  });

  notificationCenter.render();
}
