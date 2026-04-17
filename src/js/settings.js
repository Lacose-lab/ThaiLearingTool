import { getApiKey, saveApiKey, clearProgress, exportProgressCSV, getProgress } from './storage.js';
import { fetchLiveVocab, getLastSync } from './sheets.js';

export function render(container, vocab) {
  const currentKey = getApiKey();
  const lastSync = getLastSync();
  const syncLabel = lastSync
    ? lastSync.toLocaleString()
    : 'Never — will sync on next load';

  container.innerHTML = `
    <h1>Settings</h1>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin-bottom:0.75rem">Anthropic API Key</h2>
      <input id="api-key-input" type="password" placeholder="sk-ant-…"
        value="${currentKey || ''}"
        style="margin-bottom:0.5rem;font-family:monospace;font-size:0.875rem">
      <button class="btn btn-primary" id="save-key" style="margin-bottom:0.75rem">Save Key</button>
      <div id="key-status" class="muted" style="font-size:0.8rem"></div>
      <div class="muted" style="font-size:0.75rem;margin-top:0.5rem">
        Sent only to api.anthropic.com — never stored elsewhere.
      </div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin-bottom:0.75rem">Vocabulary Sync</h2>
      <div class="muted" style="font-size:0.875rem;margin-bottom:0.75rem">
        <span id="word-count">${vocab.words.length}</span> words loaded &middot; Last synced: <span id="sync-time">${syncLabel}</span>
      </div>
      <button class="btn btn-ghost" id="sync-btn">&#8635; Sync from Google Sheets</button>
      <div id="sync-status" class="muted" style="font-size:0.8rem;margin-top:0.5rem"></div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin-bottom:0.5rem">Model</h2>
      <div class="muted" style="font-family:monospace;font-size:0.875rem">claude-haiku-4-5-20251001</div>
    </div>

    <div class="card" style="margin-bottom:1rem">
      <h2 style="margin-bottom:0.75rem">Progress</h2>
      <div class="muted" style="margin-bottom:1rem;font-size:0.875rem">
        ${Object.keys(getProgress()).length} words with recorded progress
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        <button class="btn btn-ghost" id="export-btn">Export Progress CSV</button>
        <button class="btn btn-danger" id="clear-btn">Clear All Progress</button>
      </div>
    </div>

    <div class="card">
      <h2 style="margin-bottom:0.5rem">About</h2>
      <div class="muted" style="font-size:0.875rem;line-height:1.6">
        YT-Research &middot; ${vocab.words.length} words &middot; ${vocab.sentences.length} sentences<br>
        Thai vocabulary SRS with AI tutor Kru Noi (ครูน้อย)
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
