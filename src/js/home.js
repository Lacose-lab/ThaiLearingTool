import { getStreak, getProgress } from './storage.js';
import { getDueWords } from './srs.js';

export function render(container, vocab) {
  const streak = getStreak();
  const progress = getProgress();
  const due = getDueWords(vocab, progress);
  const dueCount = due.length;

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
}
