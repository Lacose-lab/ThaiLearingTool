import { getProgress, saveProgress } from './storage.js';
import { updateCard, getDueWords } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';

export function render(container, vocab) {
  const progress = getProgress();
  const allDue = getDueWords(vocab, progress);
  const queue = allDue.length > 0 ? [...allDue] : [...vocab.words].sort(() => Math.random() - 0.5).slice(0, 20);
  const mode = allDue.length > 0 ? 'review' : 'practice';
  let idx = 0;
  let revealed = false;
  let romanVisible = false;

  function showCard() {
    if (idx >= queue.length) {
      container.innerHTML = `
        <div style="margin-top:3rem">
          <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
            <div style="color:var(--gold);display:flex;justify-content:center;margin-bottom:0.75rem">
              <svg width="40" height="40"><use href="#i-star"/></svg>
            </div>
            <h1>Session complete</h1>
            <div class="muted" style="margin-top:0.25rem;margin-bottom:1.25rem">${queue.length} cards ${mode === 'review' ? 'reviewed' : 'practiced'}</div>
            <button class="btn btn-primary" id="again-btn">Go again</button>
          </div>
        </div>`;
      document.getElementById('again-btn').onclick = () => render(container, vocab);
      return;
    }

    const w = queue[idx];
    const p = progress[w.id];
    const intervalBadge = p?.interval ? `<span class="badge">+${p.interval}d</span>` : '<span class="badge">new</span>';

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
        <span class="muted">${idx + 1} / ${queue.length}</span>
        <div><span class="badge">${w.category}</span>${intervalBadge}</div>
      </div>

      <div class="card card-hero" id="card-face" style="
        min-height:240px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;cursor:pointer;
        user-select:none;text-align:center;padding:2rem 1.25rem;
      ">
        <div class="thai-lg thai-text" lang="th">${w.thai}</div>
        ${!revealed ? `
          <div class="muted" style="margin-top:1.25rem;letter-spacing:0.06em;text-transform:uppercase;font-size:0.7rem">Tap to reveal</div>
        ` : `
          <div style="margin-top:1.125rem;font-family:var(--font-serif);font-size:1.6rem;font-weight:500;color:var(--gold)">${w.english}</div>
          ${w.german ? `<div class="muted" style="margin-top:0.25rem;font-style:italic">${w.german}</div>` : ''}
          ${w.notes ? `<div class="muted" style="margin-top:0.5rem;font-size:0.78rem;color:var(--text-dim)">${w.notes}</div>` : ''}
        `}
      </div>

      <div style="display:flex;gap:0.5rem;margin-top:-0.25rem;margin-bottom:0.75rem;justify-content:center">
        <button class="btn btn-dim" id="speak-btn" style="width:auto;padding:0.5rem 1.1rem;font-size:0.875rem;gap:0.35rem;display:flex;align-items:center">
          <svg width="16" height="16"><use href="#i-audio"/></svg> Speak
        </button>
        <button class="btn btn-dim" id="roman-btn" style="width:auto;padding:0.5rem 1.1rem;font-size:0.875rem">Āā Roman</button>
      </div>
      <div id="roman-text" style="display:none;text-align:center;color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem;letter-spacing:0.05em"></div>

      ${revealed ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem">
          <button class="btn btn-danger" id="btn-fail">Again</button>
          <button class="btn btn-ghost" id="btn-hard">Hard</button>
          <button class="btn btn-success" id="btn-good">Good</button>
        </div>
      ` : ''}
    `;

    document.getElementById('card-face').onclick = () => {
      if (!revealed) { revealed = true; speak(w.thai); showCard(); }
    };

    document.getElementById('speak-btn').onclick = e => { e.stopPropagation(); speak(w.thai); };

    document.getElementById('roman-btn').onclick = e => {
      e.stopPropagation();
      romanVisible = !romanVisible;
      const el = document.getElementById('roman-text');
      if (romanVisible) { el.textContent = romanize(w.thai); el.style.display = 'block'; }
      else el.style.display = 'none';
    };

    if (revealed) {
      document.getElementById('btn-fail').onclick = () => rate(0);
      document.getElementById('btn-hard').onclick = () => rate(1);
      document.getElementById('btn-good').onclick = () => rate(3);
    }
  }

  function rate(quality) {
    const w = queue[idx];
    const card = updateCard(progress[w.id] || {}, quality);
    progress[w.id] = card;
    saveProgress(progress);
    idx++;
    revealed = false;
    romanVisible = false;
    showCard();
  }

  showCard();
}
