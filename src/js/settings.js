import { getApiKey, saveApiKey, clearProgress, exportProgressCSV, getProgress } from './storage.js';
import { fetchLiveVocab, getLastSync } from './sheets.js';

export function render(container, vocab) {
  const currentKey = getApiKey();
  const lastSync = getLastSync();
  const syncLabel = lastSync
    ? lastSync.toLocaleString()
    : 'Never — will sync on next load';

  container.innerHTML = `
    <h1 style="margin-bottom:1.125rem">Profile</h1>

    <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
      <div style="
        width:72px;height:72px;margin:0 auto 0.75rem;
        border-radius:20px;
        background:linear-gradient(180deg,#1c1c1e,#000);
        border:1px solid var(--gold-hair);
        display:flex;align-items:center;justify-content:center;
        color:var(--gold);font-family:var(--font-thai);font-size:2.1rem;font-weight:700;
      "><span lang="th">น</span></div>
      <h2>Learner</h2>
      <div class="muted" style="margin-top:0.2rem">Intermediate · male register · ${vocab.words.length} words</div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.75rem">Anthropic API Key</h2>
      <input id="api-key-input" type="password" placeholder="sk-ant-…"
        value="${currentKey || ''}"
        style="margin-bottom:0.5rem;font-family:var(--font-mono);font-size:0.875rem">
      <button class="btn btn-primary" id="save-key" style="margin-bottom:0.625rem">Save key</button>
      <div id="key-status" class="muted" style="font-size:0.8rem"></div>
      <div class="muted" style="font-size:0.75rem;margin-top:0.375rem">
        Sent only to api.anthropic.com — never stored elsewhere.
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.75rem">Vocabulary Sync</h2>
      <div class="muted" style="font-size:0.875rem;margin-bottom:0.75rem">
        <span id="word-count">${vocab.words.length}</span> words loaded
        &middot; Last synced: <span id="sync-time">${syncLabel}</span>
      </div>
      <button class="btn btn-ghost" id="sync-btn" style="display:flex;align-items:center;justify-content:center;gap:0.4rem">
        <svg width="16" height="16"><use href="#i-sync"/></svg> Sync from Google Sheets
      </button>
      <div id="sync-status" class="muted" style="font-size:0.8rem;margin-top:0.5rem"></div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.375rem">Model</h2>
      <div class="muted" style="font-family:var(--font-mono);font-size:0.875rem">claude-haiku-4-5-20251001</div>
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
    a.href = url;
    a.download = 'thai_progress.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  document.getElementById('clear-btn').onclick = () => {
    if (confirm('Clear all SRS progress? This cannot be undone.')) {
      clearProgress();
      render(container, vocab);
    }
  };
}
