import { getStreak, getProgress } from './storage.js';
import { getDueWords } from './srs.js';

export function render(container, vocab) {
  const streak = getStreak();
  const progress = getProgress();
  const due = getDueWords(vocab, progress);

  container.innerHTML = `
    <h1>\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A \uD83D\uDC4B</h1>
    <div class="card" style="text-align:center;margin-bottom:1.5rem">
      <div style="font-size:3rem;font-weight:700;color:var(--accent)">${streak}</div>
      <div class="muted">day streak</div>
    </div>
    <div class="card">
      <h2>Due today</h2>
      <div style="font-size:2.5rem;font-weight:700;color:${due.length > 0 ? 'var(--accent)' : 'var(--accent2)'}">${due.length}</div>
      <div class="muted">words ready for review</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;margin-top:1rem">
      <button class="btn btn-primary" data-goto="flashcards">Flashcards</button>
      <button class="btn btn-ghost" data-goto="quiz">Quiz</button>
      <button class="btn btn-ghost" data-goto="typing">Typing</button>
      <button class="btn btn-success" data-goto="tutor">Kru Noi</button>
    </div>
    <div class="card" style="margin-top:1rem">
      <div class="muted">${vocab.words.length} words &middot; ${vocab.sentences.length} sentences &middot; ${vocab.recall.length} recall entries</div>
    </div>
  `;

  container.querySelectorAll('[data-goto]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelector(`[data-tab="${btn.dataset.goto}"]`).click();
    });
  });
}
