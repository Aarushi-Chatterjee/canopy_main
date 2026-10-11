/**
 * Canopy Notification & Collaboration Corner
 * Tracks planted notes, sprint applications, incoming squad requests,
 * and mutual acceptances across Canopy.
 */

const NOTIF_STORAGE_KEY = 'canopy_notifications_log';

// Seed initial state with realistic records if empty
function getInitialSeed() {
  return {
    sent: [
      {
        id: 'notif_sent_salinity',
        type: 'sprint_application',
        sprintTitle: 'Coastal Salinity Telemetry Squad',
        leadAuthor: 'Dr. Rohan Malhotra',
        role: 'Firmware & Telemetry Lead',
        note: 'Can build low-power deep sleep telemetry firmware with LoRaWAN packet recovery in 2 weeks.',
        skills: ['Hardware', 'LoRaWAN', 'Firmware'],
        availability: 'Full sprint (2–4 weeks)',
        status: 'accepted',
        revealedContact: 'matrix: #salinity-sprint:canopy.earth',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString()
      },
      {
        id: 'notif_sent_groundwater',
        type: 'sprint_application',
        sprintTitle: 'Groundwater optical probe calibration squad',
        leadAuthor: 'Field Engineering Team',
        role: 'Sensors Lead',
        note: 'I have 4 years experience with optical ADC calibration and spectroscopy for water monitoring.',
        skills: ['Spectroscopy', 'Optics', 'Embedded C'],
        availability: 'Full sprint (2–4 weeks)',
        status: 'pending_review',
        createdAt: new Date(Date.now() - 14 * 3600 * 1000).toISOString()
      }
    ],
    received: [
      {
        id: 'notif_rec_elena',
        type: 'squad_request',
        sprintId: 'sp_groundwater_sample',
        sprintTitle: 'Groundwater optical probe calibration squad',
        applicantName: 'Elena Vance',
        applicantEmail: 'elena.vance@ecology.org',
        role: 'Spectroscopy Engineer',
        note: 'I designed the spectral optical filter for the 2025 river basin study. Can optimize ADC response curves.',
        skills: ['Spectroscopy', 'Optics', 'Embedded C'],
        availability: 'Full sprint (2–4 weeks)',
        portfolioUrl: 'https://github.com/elena-vance/spectral-filter',
        status: 'pending_review',
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString()
      }
    ]
  };
}

export const notificationCenter = {
  load() {
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
    this.save(seed);
    return seed;
  },

  save(data) {
    try {
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[Canopy Notification] Error saving to storage:', e);
    }
  },

  getUnreadCount() {
    const data = this.load();
    const pendingSent = data.sent.filter(s => s.status === 'accepted').length; // accepted is good news!
    const pendingReceived = data.received.filter(r => r.status === 'pending_review').length;
    return pendingSent + pendingReceived;
  },

  addSentNote(app) {
    const data = this.load();
    const newRecord = {
      id: app.id || 'notif_sent_' + Date.now(),
      type: 'sprint_application',
      sprintId: app.sprintId,
      sprintTitle: app.sprintTitle || 'Active Sprint Squad',
      leadAuthor: app.leadAuthor || 'Sprint Lead',
      role: app.role || app.squadRole || 'Technical Contributor',
      note: app.note || '',
      skills: app.skills || [],
      availability: app.availability || 'Full sprint (2–4 weeks)',
      portfolioUrl: app.portfolioUrl || app.link || '',
      status: app.status || 'pending_review',
      createdAt: new Date().toISOString()
    };
    data.sent.unshift(newRecord);
    this.save(data);
    this.render();
    return newRecord;
  },

  addIncomingRequest(req) {
    const data = this.load();
    const newRecord = {
      id: req.id || 'notif_rec_' + Date.now(),
      type: 'squad_request',
      sprintId: req.sprintId,
      sprintTitle: req.sprintTitle || 'Your Working Squad',
      applicantName: req.applicantName || 'Collaborator',
      applicantEmail: req.applicantEmail || 'builder@canopy.earth',
      role: req.role || 'Contributor',
      note: req.note || '',
      skills: req.skills || [],
      availability: req.availability || 'Full sprint (2–4 weeks)',
      portfolioUrl: req.portfolioUrl || '',
      status: 'pending_review',
      createdAt: new Date().toISOString()
    };
    data.received.unshift(newRecord);
    this.save(data);
    this.render();
    return newRecord;
  },

  acceptRequest(id) {
    const data = this.load();
    const item = data.received.find(r => r.id === id);
    if (item) {
      item.status = 'accepted';
      item.acceptedAt = new Date().toISOString();
      item.revealedContact = 'matrix: #sprint-' + (item.sprintId || 'squad') + ':canopy.earth';
      this.save(data);
      this.render();
      window.dispatchEvent(new CustomEvent('canopy:request-accepted', { detail: item }));
      return item;
    }
    return null;
  },

  declineRequest(id) {
    const data = this.load();
    const item = data.received.find(r => r.id === id);
    if (item) {
      item.status = 'declined';
      item.declinedAt = new Date().toISOString();
      this.save(data);
      this.render();
      return item;
    }
    return null;
  },

  render() {
    const data = this.load();
    const badgeEl = document.getElementById('navNotificationBadge');
    const drawerBadgeEl = document.getElementById('drawerNotificationBadge');
    const count = this.getUnreadCount();

    if (badgeEl) {
      badgeEl.textContent = count;
      badgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
      if (count > 0) badgeEl.classList.add('pulse');
    }
    if (drawerBadgeEl) {
      drawerBadgeEl.textContent = count;
      drawerBadgeEl.style.display = count > 0 ? 'inline-flex' : 'none';
    }

    // Render Sent Tab
    const sentListEl = document.getElementById('notifSentList');
    if (sentListEl) {
      if (!data.sent || data.sent.length === 0) {
        sentListEl.innerHTML = `
          <div class="notif-empty">
            <span style="font-size:1.8rem;">🌱</span>
            <p><strong>No planted notes yet</strong></p>
            <span class="hint-small">When you click "Join Squad" or "Plant this note" on a sprint, your submissions will appear here.</span>
          </div>`;
      } else {
        sentListEl.innerHTML = data.sent.map(item => {
          const isAccepted = item.status === 'accepted';
          const isDeclined = item.status === 'declined';
          const statusClass = isAccepted ? 'status-accepted' : isDeclined ? 'status-declined' : 'status-pending';
          const statusText = isAccepted 
            ? '✓ Accepted to Squad' 
            : isDeclined ? '✕ Cycle Filled / Closed' : '⏳ Pending Review by Squad Lead';

          const timeAgo = formatTimeAgo(item.createdAt);

          return `
            <div class="notif-card ${statusClass}" data-id="${item.id}">
              <div class="notif-card-header">
                <div>
                  <h5 class="notif-card-title">${escapeHtml(item.sprintTitle)}</h5>
                  <div class="notif-card-sub">
                    Role offered: <strong>${escapeHtml(item.role)}</strong> · Lead: ${escapeHtml(item.leadAuthor || 'Sprint Lead')}
                  </div>
                </div>
                <span class="notif-badge-chip ${statusClass}">${statusText}</span>
              </div>
              ${item.note ? `<div class="notif-note-quote">"${escapeHtml(item.note)}"</div>` : ''}
              ${item.skills && item.skills.length ? `
                <div class="notif-skills-row">
                  ${item.skills.map(s => `<span class="notif-mini-tag">${escapeHtml(s)}</span>`).join('')}
                  <span class="notif-avail-tag">⏱ ${escapeHtml(item.availability || 'Full cycle')}</span>
                </div>` : ''}
              ${isAccepted ? `
                <div class="notif-accepted-banner">
                  <span class="banner-icon">🎉</span>
                  <div>
                    <strong>Squad formed! Your note was accepted.</strong>
                    <div style="font-size:0.78rem;color:var(--forest);margin-top:2px;">
                      Channel unlocked: <code>${escapeHtml(item.revealedContact || '#sprint-chat:canopy.earth')}</code>
                    </div>
                  </div>
                </div>` : ''}
              <div class="notif-card-foot">
                <span class="hint-small">Planted ${timeAgo}</span>
                <span class="hint-small">${isAccepted ? '✓ Mutual Consent Confirmed' : 'Lead notified'}</span>
              </div>
            </div>`;
        }).join('');
      }
    }

    // Render Received Tab
    const recListEl = document.getElementById('notifReceivedList');
    if (recListEl) {
      if (!data.received || data.received.length === 0) {
        recListEl.innerHTML = `
          <div class="notif-empty">
            <span style="font-size:1.8rem;">🌿</span>
            <p><strong>No incoming squad requests</strong></p>
            <span class="hint-small">When you post what you are working on, notes planted by potential collaborators will appear here for your review.</span>
          </div>`;
      } else {
        recListEl.innerHTML = data.received.map(item => {
          const isPending = item.status === 'pending_review';
          const isAccepted = item.status === 'accepted';
          const isDeclined = item.status === 'declined';
          const statusClass = isAccepted ? 'status-accepted' : isDeclined ? 'status-declined' : 'status-pending';
          const statusText = isAccepted ? '✓ Accepted to Squad' : isDeclined ? '✕ Declined' : '⏳ Needs Your Review';
          const timeAgo = formatTimeAgo(item.createdAt);

          return `
            <div class="notif-card ${statusClass}" data-id="${item.id}">
              <div class="notif-card-header">
                <div>
                  <h5 class="notif-card-title">${escapeHtml(item.applicantName)}</h5>
                  <div class="notif-card-sub">
                    Applying to: <strong>${escapeHtml(item.sprintTitle)}</strong> as <em>${escapeHtml(item.role)}</em>
                  </div>
                </div>
                <span class="notif-badge-chip ${statusClass}">${statusText}</span>
              </div>
              ${item.note ? `<div class="notif-note-quote">"${escapeHtml(item.note)}"</div>` : ''}
              <div class="notif-skills-row">
                ${(item.skills || []).map(s => `<span class="notif-mini-tag">${escapeHtml(s)}</span>`).join('')}
                <span class="notif-avail-tag">⏱ ${escapeHtml(item.availability || 'Full cycle')}</span>
                ${item.portfolioUrl ? `
                  <a href="${escapeHtml(item.portfolioUrl)}" target="_blank" rel="noopener noreferrer" class="notif-link-tag">
                    Shipped Proof ↗
                  </a>` : ''}
              </div>
              ${isPending ? `
                <div class="notif-action-row">
                  <button type="button" class="btn btn-stamp btn-xs notif-btn-accept" data-id="${item.id}">
                    ✓ Accept to Squad
                  </button>
                  <button type="button" class="btn btn-ghost btn-xs notif-btn-decline" data-id="${item.id}">
                    ✕ Decline
                  </button>
                </div>` : ''}
              ${isAccepted ? `
                <div class="notif-accepted-banner">
                  <span class="banner-icon">✓</span>
                  <div>
                    <strong>Added to your squad members!</strong>
                    <div style="font-size:0.78rem;color:var(--forest);margin-top:2px;">
                      Email: <code>${escapeHtml(item.applicantEmail || 'builder@canopy.earth')}</code>
                    </div>
                  </div>
                </div>` : ''}
              <div class="notif-card-foot">
                <span class="hint-small">Received ${timeAgo}</span>
                <span class="hint-small">${isAccepted ? 'Squad member locked' : isDeclined ? 'Archived' : 'Awaiting your call'}</span>
              </div>
            </div>`;
        }).join('');
      }
    }
  }
};

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
  // Ensure header has notification bell
  const headerRight = document.querySelector('header .header-inner > div:last-child');
  if (headerRight && !document.getElementById('navNotificationsBtn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost btn-sm notification-bell-btn';
    btn.id = 'navNotificationsBtn';
    btn.setAttribute('aria-label', 'Open Notification Corner');
    btn.title = 'Collaboration & Notification Corner';
    btn.innerHTML = `
      <svg class="icon" aria-hidden="true" style="width:16px;height:16px;">
        <use href="#icon-bell"/>
      </svg>
      <span class="notification-badge" id="navNotificationBadge" style="display:none;">0</span>
    `;
    // Place right before navPostCall or as first button
    const postCall = document.getElementById('navPostCall');
    if (postCall) {
      headerRight.insertBefore(btn, postCall);
    } else {
      headerRight.prepend(btn);
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
              <h4 class="notif-panel-title">Notification Corner</h4>
              <p class="notif-panel-sub">Track planted notes, squad reviews &amp; who accepted</p>
            </div>
          </div>
          <button type="button" class="notif-close-btn" id="closeNotifPanel" aria-label="Close notification panel">✕</button>
        </div>

        <div class="notif-tabs" role="tablist">
          <button type="button" class="notif-tab active" id="tabNotifSent" role="tab" aria-selected="true">
            Planted Notes (Sent)
          </button>
          <button type="button" class="notif-tab" id="tabNotifReceived" role="tab" aria-selected="false">
            Incoming Requests
          </button>
        </div>

        <div class="notif-panel-body">
          <div class="notif-tab-content active" id="contentNotifSent">
            <div class="notif-list" id="notifSentList"></div>
          </div>
          <div class="notif-tab-content" id="contentNotifReceived" style="display:none;">
            <div class="notif-list" id="notifReceivedList"></div>
          </div>
        </div>

        <div class="notif-panel-foot">
          <span class="hint-small" style="font-size:0.75rem;">Canopy Mutual Consent Protocol · High-context collaboration</span>
        </div>
      </aside>
    `;
    document.body.appendChild(panelWrap);
  }

  // Event handlers for open/close
  const notifBtn = document.getElementById('navNotificationsBtn');
  const panel = document.getElementById('notificationsPanel');
  const backdrop = document.getElementById('notifPanelBackdrop');
  const closeBtn = document.getElementById('closeNotifPanel');

  function openPanel() {
    if (!panel || !backdrop) return;
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
    tabSent.addEventListener('click', () => {
      tabSent.classList.add('active');
      tabSent.setAttribute('aria-selected', 'true');
      tabRec.classList.remove('active');
      tabRec.setAttribute('aria-selected', 'false');
      contentSent.style.display = 'block';
      contentRec.style.display = 'none';
    });

    tabRec.addEventListener('click', () => {
      tabRec.classList.add('active');
      tabRec.setAttribute('aria-selected', 'true');
      tabSent.classList.remove('active');
      tabSent.setAttribute('aria-selected', 'false');
      contentSent.style.display = 'none';
      contentRec.style.display = 'block';
    });
  }

  // Accept and Decline button delegation
  document.addEventListener('click', async (e) => {
    const acceptBtn = e.target.closest('.notif-btn-accept');
    if (acceptBtn) {
      const id = acceptBtn.getAttribute('data-id');
      acceptBtn.disabled = true;
      acceptBtn.textContent = 'Accepting...';
      try {
        const res = notificationCenter.acceptRequest(id);
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = `✓ Collaborator accepted to squad! Contact channel unlocked.`;
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3500);
        }
      } catch (err) {
        alert(err.message || 'Failed to accept application.');
      }
      return;
    }

    const declineBtn = e.target.closest('.notif-btn-decline');
    if (declineBtn) {
      const id = declineBtn.getAttribute('data-id');
      declineBtn.disabled = true;
      notificationCenter.declineRequest(id);
      return;
    }
  });

  // Initial render
  notificationCenter.render();
}
