import { getProgress, saveProgress, getWeakWords } from './storage.js';
import { updateCard, getDueWords } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';

export function render(container, vocab) {
  const progress = getProgress();

  // Mode flags set by home screen via sessionStorage
  const modeOverride = sessionStorage.getItem('flashcards_mode');
  sessionStorage.removeItem('flashcards_mode');

  // Category filter — pick a subset of vocab
  const categories = ['all', ...new Set(vocab.words.map(w => w.category).filter(Boolean))].sort();
  let selectedCat = sessionStorage.getItem('flashcards_cat') || 'all';
  sessionStorage.removeItem('flashcards_cat');

  function wordsForCat(cat) {
    return cat === 'all' ? vocab.words : vocab.words.filter(w => w.category === cat);
  }

  let queue, modeName;
  if (modeOverride === 'weak') {
    queue = getWeakWords(vocab, progress, 20);
    modeName = 'weak';
    if (!queue.length) { queue = wordsForCat(selectedCat).sort(() => Math.random() - 0.5).slice(0, 20); modeName = 'practice'; }
  } else if (modeOverride === 'quick5') {
    const due = getDueWords({ words: wordsForCat(selectedCat) }, progress);
    queue = (due.length >= 5 ? due : wordsForCat(selectedCat).sort(() => Math.random() - 0.5)).slice(0, 5);
    modeName = 'quick5';
  } else {
    const catWords = wordsForCat(selectedCat);
    const allDue = getDueWords({ words: catWords }, progress);
    queue = allDue.length > 0 ? [...allDue] : [...catWords].sort(() => Math.random() - 0.5).slice(0, 20);
    modeName = allDue.length > 0 ? 'review' : 'practice';
  }

  let idx = 0;
  let revealed = false;
  let romanVisible = false;

  function renderCatChips() {
    return `
      <div style="display:flex;gap:0.375rem;flex-wrap:wrap;margin-bottom:0.75rem;overflow-x:auto;padding-bottom:2px">
        ${categories.slice(0, 8).map(cat => `
          <button class="cat-chip" data-cat="${cat}" style="
            padding:0.25rem 0.75rem;border-radius:9999px;font-size:0.72rem;
            font-family:var(--font-ui);cursor:pointer;white-space:nowrap;
            border:1px solid ${cat === selectedCat ? 'var(--gold)' : 'var(--border)'};
            background:${cat === selectedCat ? 'rgba(212,175,55,0.12)' : 'transparent'};
            color:${cat === selectedCat ? 'var(--gold)' : 'var(--text-muted)'};
          ">${cat}</button>
        `).join('')}
      </div>
    `;
  }

  function showCard() {
    if (idx >= queue.length) {
      container.innerHTML = `
        <div style="margin-top:3rem">
          <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
            <div style="color:var(--gold);display:flex;justify-content:center;margin-bottom:0.75rem">
              <svg width="40" height="40"><use href="#i-star"/></svg>
            </div>
            <h1>Session complete</h1>
            <div class="muted" style="margin-top:0.25rem;margin-bottom:1.25rem">
              ${queue.length} cards ${modeName === 'review' ? 'reviewed' : modeName === 'weak' ? 'drilled' : modeName === 'quick5' ? 'done' : 'practiced'}
            </div>
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
      ${modeOverride !== 'quick5' && modeOverride !== 'weak' ? renderCatChips() : ''}

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
        <span class="muted">${idx + 1} / ${queue.length}</span>
        <div><span class="badge">${w.category}</span>${intervalBadge}</div>
      </div>

      <div class="card card-hero" id="card-face" style="
        min-height:240px;display:flex;flex-direction:column;
        align-items:center;justify-content:center;cursor:pointer;
        user-select:none;text-align:center;padding:2rem 1.25rem;
        transition:border-color 0.2s;
      ">
        <div class="thai-lg thai-text" lang="th">${w.thai}</div>
        ${!revealed ? `
          <div class="muted" style="margin-top:1.25rem;letter-spacing:0.06em;text-transform:uppercase;font-size:0.7rem">Tap to reveal</div>
          ${w.notes ? `<div style="margin-top:0.625rem;font-size:0.78rem;color:var(--text-dim);font-style:italic">${w.notes}</div>` : ''}
        ` : `
          <div style="margin-top:1.125rem;font-family:var(--font-serif);font-size:1.6rem;font-weight:500;color:var(--gold)">${w.english}</div>
          ${w.notes ? `<div class="muted" style="margin-top:0.5rem;font-size:0.78rem;color:var(--text-dim);font-style:italic">${w.notes}</div>` : ''}
        `}
      </div>

      <div style="display:flex;gap:0.5rem;margin-top:-0.25rem;margin-bottom:0.75rem;justify-content:center">
        <button class="btn btn-dim" id="speak-btn" style="width:auto;padding:0.5rem 1.1rem;font-size:0.875rem;display:flex;align-items:center;gap:0.35rem">
          <svg width="16" height="16"><use href="#i-audio"/></svg> Speak
        </button>
        <button class="btn btn-dim" id="roman-btn" style="width:auto;padding:0.5rem 1.1rem;font-size:0.875rem;color:${romanVisible ? 'var(--gold)' : ''}">Āā Roman</button>
      </div>
      <div id="roman-text" style="display:${romanVisible ? 'block' : 'none'};text-align:center;color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem;letter-spacing:0.05em"></div>

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

    // Sticky romanization — restore state immediately
    const romanEl = document.getElementById('roman-text');
    if (romanVisible) romanEl.textContent = romanize(w.thai);

    document.getElementById('roman-btn').onclick = e => {
      e.stopPropagation();
      romanVisible = !romanVisible;
      romanEl.style.display = romanVisible ? 'block' : 'none';
      document.getElementById('roman-btn').style.color = romanVisible ? 'var(--gold)' : '';
      if (romanVisible) romanEl.textContent = romanize(w.thai);
    };

    // Category chip handlers
    container.querySelectorAll('.cat-chip').forEach(btn => {
      btn.onclick = () => {
        selectedCat = btn.dataset.cat;
        idx = 0; revealed = false;
        const catWords = wordsForCat(selectedCat);
        const allDue = getDueWords({ words: catWords }, progress);
        queue = allDue.length > 0 ? [...allDue] : [...catWords].sort(() => Math.random() - 0.5).slice(0, 20);
        modeName = allDue.length > 0 ? 'review' : 'practice';
        showCard();
      };
    });

    if (revealed) {
      document.getElementById('btn-fail').onclick = () => rate(0);
      document.getElementById('btn-hard').onclick = () => rate(1);
      document.getElementById('btn-good').onclick = () => rate(3);
    }
  }

  function rate(quality) {
    const w = queue[idx];
    progress[w.id] = updateCard(progress[w.id] || {}, quality);
    saveProgress(progress);
    idx++;
    revealed = false;
    // romanVisible intentionally NOT reset — sticky across cards
    showCard();
  }

  showCard();
}
