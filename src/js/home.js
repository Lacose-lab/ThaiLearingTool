import { getPracticeDays, getProgress, getStreak, getWeakWords } from './storage.js';
import { getDueWords } from './srs.js';

const DAY_MS = 86400000;

function dateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / DAY_MS);
}

function renderLearningYear(days, today) {
  const year = today.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const totalDays = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  const todayIndex = dayOfYear(today);

  return Array.from({ length: totalDays }, (_, i) => {
    const date = new Date(yearStart);
    date.setDate(yearStart.getDate() + i);
    const key = dateKey(date);
    const day = i + 1;
    const classes = [
      'year-dot',
      days[key] ? 'is-practiced' : '',
      day === todayIndex ? 'is-today' : '',
      day > todayIndex ? 'is-future' : '',
    ].filter(Boolean).join(' ');
    const label = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `<span class="${classes}" title="${label}" aria-label="${label}${days[key] ? ', practiced' : ''}"></span>`;
  }).join('');
}

export function render(container, vocab) {
  const streak = getStreak();
  const progress = getProgress();
  const practiceDays = getPracticeDays();
  const due = getDueWords(vocab, progress);
  const dueCount = due.length;
  const weak = getWeakWords(vocab, progress);
  const reviewedCount = Object.keys(progress).length;
  const today = new Date();
  const year = today.getFullYear();
  const totalDays = new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
  const practicedThisYear = Object.keys(practiceDays).filter(d => d.startsWith(`${year}-`)).length;
  const yearPct = Math.round((practicedThisYear / totalDays) * 100);
  const yearPctLabel = practicedThisYear > 0 && yearPct === 0 ? '<1' : yearPct;
  const duePct = Math.min(100, Math.round((dueCount / Math.max(vocab.words.length, 1)) * 100));
  const dateStr = today.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
    ' / ' + today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  container.innerHTML = `
    <section class="glass-dashboard">
      <div class="dashboard-top">
        <div>
          <div class="eyebrow">${dateStr}</div>
          <h1>Thai Learning</h1>
          <div class="thai-title thai-text" lang="th">ภาษาไทย · ${year}</div>
        </div>
      </div>

      <div class="year-panel">
        <div class="panel-caption">
          <span>Learning Year</span>
          <strong>${practicedThisYear}/${totalDays}</strong>
        </div>
        <div class="year-grid" aria-label="Learning year practice grid">
          ${renderLearningYear(practiceDays, today)}
        </div>
      </div>

      <div class="year-progress-block">
        <div class="glass-progress">
          <div class="glass-progress-fill" style="width:${yearPct}%"></div>
        </div>
        <div class="progress-meta">
          <span>${practicedThisYear} practice days</span>
          <strong>${yearPctLabel}% complete</strong>
        </div>
      </div>
    </section>

    <section class="dashboard-metrics" aria-label="Daily practice summary">
      <div class="metric-card">
        <span class="metric-label">Streak</span>
        <strong>${streak}</strong>
        <span class="metric-sub">days</span>
      </div>
      <div class="metric-card is-hot">
        <span class="metric-label">Due</span>
        <strong>${dueCount}</strong>
        <span class="metric-sub">words</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Started</span>
        <strong>${reviewedCount}</strong>
        <span class="metric-sub">${duePct}% due</span>
      </div>
    </section>

    <section class="quick-glass-grid">
      ${[
        { tab: 'flashcards', title: 'Flashcards', meta: `${dueCount} due`, icon: 'i-book', primary: true },
        { tab: 'typing', title: 'Type Thai', meta: 'Recall script', icon: 'i-review' },
        { tab: 'quiz', title: 'Quiz', meta: 'Fast practice', icon: 'i-lotus' },
        { tab: 'tutor', title: 'Tutor', meta: 'Ask teacher', icon: 'i-chat' },
      ].map(item => `
        <button class="quick-glass-card ${item.primary ? 'is-primary' : ''}" data-goto="${item.tab}">
          <svg><use href="#${item.icon}"/></svg>
          <span>${item.title}</span>
          <small>${item.meta}</small>
        </button>
      `).join('')}
    </section>

    <section class="glass-card practice-card">
      <div class="section-heading">
        <div>
          <h2>Today&apos;s focus</h2>
          <div class="muted">${vocab.words.length} words in your deck</div>
        </div>
        <button class="link-btn" id="quick5-btn">Quick 5</button>
      </div>
      <div class="glass-progress thin">
        <div class="glass-progress-fill" style="width:${duePct}%"></div>
      </div>
    </section>

    ${weak.length > 0 ? `
      <section class="glass-card">
        <div class="section-heading">
          <div>
            <h2>Needs work</h2>
            <div class="muted">Most-missed words</div>
          </div>
          <button class="link-btn" id="weak-practice-btn">Drill</button>
        </div>
        <div class="word-stack">
          ${weak.slice(0, 4).map(w => `
            <div class="word-row">
              <div>
                <span class="thai-text" lang="th">${w.thai}</span>
                <small>${w.english}</small>
              </div>
              <span class="fail-pill">${progress[w.id]?.failures || 0} missed</span>
            </div>
          `).join('')}
        </div>
      </section>
    ` : ''}
  `;

  document.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`[data-tab="${btn.dataset.goto}"]`).click();
    });
  });

  document.getElementById('quick5-btn')?.addEventListener('click', () => {
    sessionStorage.setItem('flashcards_mode', 'quick5');
    document.querySelector('[data-tab="flashcards"]').click();
  });

  document.getElementById('weak-practice-btn')?.addEventListener('click', () => {
    sessionStorage.setItem('flashcards_mode', 'weak');
    document.querySelector('[data-tab="flashcards"]').click();
  });
}
