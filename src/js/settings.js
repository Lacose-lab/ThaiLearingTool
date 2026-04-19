import { getApiKey, saveApiKey, clearProgress, exportProgressCSV, getProgress, getReminderTime, setReminderTime } from './storage.js';
import { fetchLiveVocab, getLastSync } from './sheets.js';

function notifStatus() {
  if (!('Notification' in window)) return { supported: false };
  return { supported: true, permission: Notification.permission };
}

export function render(container, vocab) {
  const currentKey = getApiKey();
  const lastSync = getLastSync();
  const syncLabel = lastSync ? lastSync.toLocaleString() : 'Never — will sync on next load';
  const reminderTime = getReminderTime();
  const { supported, permission } = notifStatus();

  const notifHTML = supported ? `
    <div class="card">
      <h2 style="margin-bottom:0.625rem">Daily reminder</h2>
      ${permission === 'granted' ? `
        <div style="display:flex;align-items:center;gap:0.625rem;margin-bottom:0.75rem">
          <svg width="16" height="16" style="color:var(--success);flex-shrink:0"><use href="#i-check"/></svg>
          <span class="muted" style="font-size:0.875rem">Notifications on</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">
          <span class="muted" style="font-size:0.875rem;flex-shrink:0">Remind me at</span>
          <input type="time" id="reminder-time" value="${reminderTime}"
            style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;
            color:var(--text);font-family:var(--font-ui);font-size:0.95rem;padding:0.4rem 0.6rem;outline:none;flex:1">
          <button class="btn btn-ghost" id="save-reminder" style="width:auto;padding:0.4rem 0.875rem;font-size:0.875rem;flex-shrink:0">Save</button>
        </div>
        <div id="reminder-status" class="muted" style="font-size:0.8rem"></div>
        <div class="muted" style="font-size:0.75rem;margin-top:0.5rem">
          Notification fires if you haven't practiced by this time. Requires the app to open that day.
        </div>
      ` : permission === 'denied' ? `
        <div class="muted" style="font-size:0.875rem">Notifications blocked in your browser settings. Enable them to get daily reminders.</div>
      ` : `
        <div class="muted" style="margin-bottom:0.75rem;font-size:0.875rem">Get a push reminder if you haven't practiced by a set time each day.</div>
        <button class="btn btn-primary" id="enable-notif">Enable daily reminder</button>
        <div id="notif-status" class="muted" style="font-size:0.8rem;margin-top:0.5rem"></div>
      `}
    </div>
  ` : '';

  container.innerHTML = `
    <h1 style="margin-bottom:1.125rem">Profile</h1>

    <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
      <div style="
        width:72px;height:72px;margin:0 auto 0.75rem;border-radius:20px;
        background:linear-gradient(180deg,#1c1c1e,#000);border:1px solid var(--gold-hair);
        display:flex;align-items:center;justify-content:center;
        color:var(--gold);font-family:var(--font-thai);font-size:2.1rem;font-weight:700;
      "><span lang="th">น</span></div>
      <h2>Learner</h2>
      <div class="muted" style="margin-top:0.2rem">Intermediate · male register · ${vocab.words.length} words</div>
    </div>

    ${notifHTML}

    <div class="card">
      <h2 style="margin-bottom:0.75rem">Anthropic API Key</h2>
      <input id="api-key-input" type="password" placeholder="sk-ant-…"
        value="${currentKey || ''}"
        style="margin-bottom:0.5rem;font-family:var(--font-mono);font-size:0.875rem">
      <button class="btn btn-primary" id="save-key" style="margin-bottom:0.625rem">Save key</button>
      <div id="key-status" class="muted" style="font-size:0.8rem"></div>
      <div class="muted" style="font-size:0.75rem;margin-top:0.375rem">Sent only to api.anthropic.com — never stored elsewhere.</div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.75rem">Vocabulary Sync</h2>
      <div class="muted" style="font-size:0.875rem;margin-bottom:0.75rem">
        <span id="word-count">${vocab.words.length}</span> words
        · Last synced: <span id="sync-time">${syncLabel}</span>
      </div>
      <button class="btn btn-ghost" id="sync-btn" style="display:flex;align-items:center;justify-content:center;gap:0.4rem">
        <svg width="16" height="16"><use href="#i-sync"/></svg> Sync from Google Sheets
      </button>
      <div id="sync-status" class="muted" style="font-size:0.8rem;margin-top:0.5rem"></div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.625rem">Progress</h2>
      <div class="muted" style="margin-bottom:0.875rem">${Object.keys(getProgress()).length} words with recorded progress</div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <button class="btn btn-ghost" id="export-btn">Export progress CSV</button>
        <button class="btn btn-danger" id="clear-btn">Clear all progress</button>
      </div>
    </div>
  `;

  // Notification enable
  document.getElementById('enable-notif')?.addEventListener('click', async () => {
    const result = await Notification.requestPermission();
    const status = document.getElementById('notif-status');
    if (result === 'granted') {
      status.textContent = 'Reminders enabled! Set your time above.';
      setTimeout(() => render(container, vocab), 800);
    } else {
      status.textContent = 'Permission denied.';
    }
  });

  // Save reminder time
  document.getElementById('save-reminder')?.addEventListener('click', () => {
    const time = document.getElementById('reminder-time').value;
    setReminderTime(time);
    const s = document.getElementById('reminder-status');
    s.textContent = `Reminder set for ${time} ✓`;
    setTimeout(() => { s.textContent = ''; }, 2000);
  });

  document.getElementById('save-key').onclick = () => {
    const key = document.getElementById('api-key-input').value.trim();
    if (!key) { document.getElementById('key-status').textContent = 'Please enter a key.'; return; }
    saveApiKey(key);
    document.getElementById('key-status').textContent = 'Key saved.';
    setTimeout(() => { document.getElementById('key-status').textContent = ''; }, 2000);
  };

  document.getElementById('sync-btn').onclick = async () => {
    const btn = document.getElementById('sync-btn');
    const status = document.getElementById('sync-status');
    btn.disabled = true;
    status.textContent = 'Syncing\u2026';
    try {
      const live = await fetchLiveVocab(vocab);
      Object.assign(vocab, live);
      document.getElementById('word-count').textContent = vocab.words.length;
      document.getElementById('sync-time').textContent = getLastSync()?.toLocaleString() || '';
      status.textContent = `Done — ${vocab.words.length} words loaded.`;
    } catch {
      status.textContent = 'Sync failed. Check your connection.';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('export-btn').onclick = () => {
    const csv = exportProgressCSV(vocab);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'thai_progress.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  document.getElementById('clear-btn').onclick = () => {
    if (confirm('Clear all SRS progress? This cannot be undone.')) {
      clearProgress(); render(container, vocab);
    }
  };
}
