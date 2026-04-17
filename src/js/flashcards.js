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

  function showCard() {
    if (idx >= queue.length) {
      container.innerHTML = `
        <div class="card" style="text-align:center;margin-top:4rem">
          <div style="font-size:3rem">&#127881;</div>
          <h1>Session complete!</h1>
          <div class="muted">${queue.length} cards ${mode === 'review' ? 'reviewed' : 'practiced'}</div>
          <button class="btn btn-primary" style="margin-top:1rem" id="again-btn">Go again</button>
        </div>`;
      document.getElementById('again-btn').onclick = () => render(container, vocab);
      return;
    }
    const w = queue[idx];
    const p = progress[w.id];
    const intervalInfo = p && p.interval ? `<span class="badge">+${p.interval}d</span>` : '<span class="badge">new</span>';

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem">
        <div class="muted">${idx + 1} / ${queue.length}</div>
        <div class="muted"><span class="badge">${w.category}</span>${intervalInfo}</div>
      </div>
      <div class="card" style="text-align:center;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;user-select:none" id="card-face">
        <div class="thai">${w.thai}</div>
        ${!revealed ? `<div class="muted" style="margin-top:1.5rem">Tap to reveal</div>` : `
          <div style="margin-top:1.25rem;font-size:1.2rem;font-weight:600">${w.english}</div>
          ${w.german ? `<div class="muted" style="margin-top:0.25rem">${w.german}</div>` : ''}
          ${w.notes ? `<div class="muted" style="font-style:italic;margin-top:0.5rem;font-size:0.8rem">${w.notes}</div>` : ''}
        `}
      </div>
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem;justify-content:center">
        <button class="btn btn-ghost" id="speak-btn" style="padding:0.5rem 1.25rem">&#128266; Speak</button>
        <button class="btn btn-ghost" id="roman-btn" style="padding:0.5rem 1.25rem">A&#257; Roman</button>
      </div>
      <div id="roman-text" style="display:none;text-align:center;color:var(--text-muted);font-size:0.9rem;margin-top:0.5rem;letter-spacing:0.05em"></div>
      ${revealed ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:0.5rem;margin-top:1rem">
          <button class="btn btn-danger" id="btn-fail">Again</button>
          <button class="btn btn-ghost" id="btn-hard">Hard</button>
          <button class="btn btn-success" id="btn-good">Good</button>
        </div>
      ` : ''}
    `;

    document.getElementById('card-face').onclick = () => {
      revealed = true;
      showCard();
    };

    document.getElementById('speak-btn').onclick = (e) => {
      e.stopPropagation();
      speak(w.thai);
    };

    let romanVisible = false;
    document.getElementById('roman-btn').onclick = (e) => {
      e.stopPropagation();
      const el = document.getElementById('roman-text');
      romanVisible = !romanVisible;
      if (romanVisible) {
        el.textContent = romanize(w.thai);
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
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
    showCard();
  }

  showCard();
}
