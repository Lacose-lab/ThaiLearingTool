import { getProgress, saveProgress } from './storage.js';
import { updateCard } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';
import { getDueWords } from './srs.js';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function speakBtn(thai, style = '') {
  return `<button class="btn btn-dim speak-thai" data-thai="${thai.replace(/"/g, '&quot;')}"
    style="width:auto;padding:0.3rem 0.6rem;font-size:0.8rem;flex-shrink:0;${style}">
    <svg width="14" height="14"><use href="#i-audio"/></svg>
  </button>`;
}

function romanBtn(thai, id, style = '') {
  return `<button class="btn btn-dim roman-toggle" data-thai="${thai.replace(/"/g, '&quot;')}" data-target="${id}"
    style="width:auto;padding:0.3rem 0.6rem;font-size:0.8rem;flex-shrink:0;${style}">Āā</button>`;
}

function bindSpeakRoman(container) {
  container.querySelectorAll('.speak-thai').forEach(btn => {
    btn.onclick = e => { e.stopPropagation(); speak(btn.dataset.thai); };
  });
  container.querySelectorAll('.roman-toggle').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      const el = document.getElementById(btn.dataset.target);
      if (!el) return;
      const visible = el.style.display !== 'none';
      el.textContent = romanize(btn.dataset.thai);
      el.style.display = visible ? 'none' : 'block';
    };
  });
}

export function render(container, vocab) {
  const progress = getProgress();
  const pool = shuffle(vocab.words).slice(0, 20);
  let idx = 0;
  let score = 0;
  let mode = Math.random() < 0.5 ? 'thai-to-en' : 'en-to-thai';

  function showQuestion() {
    if (idx >= pool.length) {
      container.innerHTML = `
        <div style="margin-top:3rem">
          <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
            <div style="color:var(--gold);display:flex;justify-content:center;margin-bottom:0.75rem">
              <svg width="40" height="40"><use href="#i-star"/></svg>
            </div>
            <h1>${score} / ${pool.length}</h1>
            <div class="muted" style="margin-top:0.25rem;margin-bottom:1.25rem">${score === pool.length ? 'Perfect!' : score >= pool.length * 0.7 ? 'Great job!' : 'Keep practicing!'}</div>
            <button class="btn btn-primary" id="restart">Play again</button>
          </div>
        </div>`;
      document.getElementById('restart').onclick = () => render(container, vocab);
      return;
    }

    const correct = pool[idx];
    const distractors = shuffle(vocab.words.filter(w => w.id !== correct.id && w.category === correct.category)).slice(0, 3);
    const fallback = shuffle(vocab.words.filter(w => w.id !== correct.id)).slice(0, 3 - distractors.length);
    const options = shuffle([correct, ...distractors, ...fallback].slice(0, 4));

    if (mode === 'thai-to-en') {
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">
          <span class="muted">${idx + 1} / ${pool.length}</span>
          <span class="muted">Score: ${score}</span>
        </div>
        <div class="card card-hero" style="text-align:center;padding:1.75rem 1.25rem;min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.625rem">
          <div class="thai-lg thai-text" lang="th">${correct.thai}</div>
          <div style="display:flex;gap:0.5rem;justify-content:center">
            ${speakBtn(correct.thai)}
            ${romanBtn(correct.thai, 'roman-q')}
          </div>
          <div id="roman-q" style="display:none;color:var(--text-muted);font-size:0.85rem;letter-spacing:0.05em"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${options.map(o => `
            <button class="btn btn-dim option-btn" data-id="${o.id}" style="text-align:left;justify-content:flex-start">
              ${o.english}
            </button>`).join('')}
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">
          <span class="muted">${idx + 1} / ${pool.length}</span>
          <span class="muted">Score: ${score}</span>
        </div>
        <div class="card card-hero" style="text-align:center;padding:1.75rem 1.25rem;min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-family:var(--font-serif);font-size:1.8rem;font-weight:500">${correct.english}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${options.map(o => `
            <div style="display:flex;align-items:center;gap:0.4rem">
              <button class="btn btn-dim option-btn" data-id="${o.id}"
                style="flex:1;text-align:left;justify-content:flex-start;font-family:var(--font-thai);font-size:1.2rem">
                ${o.thai}
              </button>
              ${speakBtn(o.thai)}
              ${romanBtn(o.thai, `roman-opt-${o.id}`)}
            </div>
            <div id="roman-opt-${o.id}" style="display:none;color:var(--text-muted);font-size:0.8rem;padding:0 0.25rem;letter-spacing:0.05em"></div>
          `).join('')}
        </div>
      `;
    }

    bindSpeakRoman(container);

    container.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = () => {
        const chosen = parseInt(btn.dataset.id);
        const isCorrect = chosen === correct.id;

        container.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

        if (isCorrect) {
          score++;
          btn.style.cssText += ';background:var(--success);color:#0a0a0a;border-color:var(--success)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 3);
          speak(correct.thai);
          saveProgress(progress);
          setTimeout(() => { idx++; mode = Math.random() < 0.5 ? 'thai-to-en' : 'en-to-thai'; showQuestion(); }, 900);
        } else {
          btn.style.cssText += ';background:var(--danger);color:var(--text);border-color:var(--danger)';
          const correctBtn = container.querySelector(`[data-id="${correct.id}"]`);
          if (correctBtn) correctBtn.style.cssText += ';background:var(--success);color:#0a0a0a;border-color:var(--success)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 0);
          speak(correct.thai);
          saveProgress(progress);

          // Show learning panel: romanization + notes + "Got it" button
          const panel = document.createElement('div');
          panel.style.cssText = 'margin-top:0.875rem;padding:1rem;background:var(--surface2);border:1px solid var(--gold-hair);border-radius:var(--radius);';
          panel.innerHTML = `
            <div class="thai-text" style="font-size:1.5rem" lang="th">${correct.thai}</div>
            <div style="color:var(--text-muted);font-size:0.85rem;letter-spacing:0.05em;margin-top:0.25rem">${romanize(correct.thai)}</div>
            ${correct.notes ? `<div style="color:var(--gold);font-size:0.82rem;margin-top:0.5rem;font-style:italic">${correct.notes}</div>` : ''}
            <button class="btn btn-primary" id="gotit-btn" style="margin-top:0.875rem">Got it →</button>
          `;
          container.appendChild(panel);
          document.getElementById('gotit-btn').onclick = () => {
            idx++;
            mode = Math.random() < 0.5 ? 'thai-to-en' : 'en-to-thai';
            showQuestion();
          };
        }
      };
    });
  }

  showQuestion();
}
