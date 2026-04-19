import { getStreak, getProgress, getWeakWords } from './storage.js';
import { getDueWords } from './srs.js';

export function render(container, vocab) {
  const streak = getStreak();
  const progress = getProgress();
  const due = getDueWords(vocab, progress);
  const dueCount = due.length;

  const weak = getWeakWords(vocab, progress);
  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
    ' / ' + now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  container.innerHTML = `
    <div style="margin-bottom:1.25rem">
      <h1 style="font-size:2rem;margin-bottom:0.2rem">Kru Noi</h1>
      <div style="display:flex;align-items:center;gap:0.5rem">
        <span class="thai-text gold-text" style="font-size:1.05rem" lang="th">ครูน้อย</span>
        <span style="color:var(--text-dim)">·</span>
        <span class="muted">Learn Thai</span>
      </div>
    </div>

    <div class="card card-hero">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:0.6rem">
        <h2 style="margin-bottom:0">Today</h2>
        <span class="muted" style="font-size:0.72rem;letter-spacing:0.04em">${dateStr}</span>
      </div>
      <div class="gold-num" style="font-size:3.5rem">${streak}</div>
      <div class="muted" style="margin-top:0.25rem">day streak</div>
      <div class="progress-bar" style="margin-top:0.875rem">
        <div class="progress-bar-fill" style="width:${Math.min(100, Math.round(dueCount / Math.max(vocab.words.length, 1) * 100))}%"></div>
      </div>
      <div class="muted" style="margin-top:0.5rem;display:flex;justify-content:space-between">
        <span>${dueCount} due today</span>
        <span>${vocab.words.length} words total</span>
      </div>
    </div>

    <div class="card">
      <h2>Due today</h2>
      <div class="gold-num" style="font-size:2.6rem">${dueCount}</div>
      <div class="muted" style="margin-top:0.2rem;margin-bottom:1rem">words ready for review</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem">
        <button class="btn btn-primary" data-goto="flashcards">Flashcards</button>
        <button class="btn btn-ghost" data-goto="quiz">Practice</button>
        <button class="btn btn-dim" data-goto="typing">Type Thai</button>
        <button class="btn btn-ghost" data-goto="tutor">Kru Noi</button>
      </div>
    </div>

    ${weak.length > 0 ? `
    <div class="card">
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin-bottom:0.75rem">
        <h2 style="margin-bottom:0">Needs work</h2>
        <span class="muted" style="font-size:0.75rem">${weak.length} word${weak.length > 1 ? 's' : ''}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:0.875rem">
        ${weak.map(w => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0.625rem;background:var(--surface3);border-radius:8px">
            <div style="display:flex;align-items:center;gap:0.625rem">
              <span class="thai-text" style="font-size:1.1rem" lang="th">${w.thai}</span>
              <span class="muted" style="font-size:0.82rem">${w.english}</span>
            </div>
            <span style="font-size:0.7rem;color:var(--danger);background:rgba(181,82,74,0.15);border:1px solid rgba(181,82,74,0.3);padding:0.15rem 0.45rem;border-radius:6px;white-space:nowrap">
              failed ${progress[w.id]?.failures}×
            </span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-ghost" id="weak-practice-btn">Drill these words →</button>
    </div>
    ` : ''}

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.625rem">
      ${[
        { th: 'วันสงกรานต์', en: 'Songkran', date: '13–15 Apr', icon: 'i-flame' },
        { th: 'วันวิสาขบูชา', en: 'Visakha',  date: '22 May',   icon: 'i-star' },
        { th: 'วันเฉลิมฯ',   en: "King's",   date: '28 Jul',   icon: 'i-lotus' },
      ].map(f => `
        <div class="card" style="padding:0.875rem 0.625rem;text-align:center;margin-bottom:0">
          <div style="color:var(--gold);display:flex;justify-content:center;margin-bottom:0.5rem">
            <svg width="26" height="26" style="color:var(--gold)"><use href="#${f.icon}"/></svg>
          </div>
          <div class="thai-text" style="font-size:0.8rem;line-height:1.35" lang="th">${f.th}</div>
          <div class="muted" style="font-size:0.7rem;margin-top:0.2rem">${f.en}</div>
          <div style="font-size:0.65rem;color:var(--gold);margin-top:0.4rem;letter-spacing:0.04em">${f.date}</div>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`[data-tab="${btn.dataset.goto}"]`).click();
    });
  });

  const weakBtn = document.getElementById('weak-practice-btn');
  if (weakBtn) {
    weakBtn.addEventListener('click', () => {
      sessionStorage.setItem('flashcards_mode', 'weak');
      document.querySelector('[data-tab="flashcards"]').click();
    });
  }
}
