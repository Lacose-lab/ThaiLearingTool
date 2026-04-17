import { getProgress, saveProgress } from './storage.js';
import { updateCard } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

function speakBtn(thai, style = '') {
  return `<button class="btn btn-ghost speak-thai" data-thai="${thai.replace(/"/g, '&quot;')}"
    style="padding:0.3rem 0.6rem;font-size:0.8rem;flex-shrink:0;${style}">&#128266;</button>`;
}

function romanBtn(thai, id, style = '') {
  return `<button class="btn btn-ghost roman-toggle" data-thai="${thai.replace(/"/g, '&quot;')}" data-target="${id}"
    style="padding:0.3rem 0.6rem;font-size:0.8rem;flex-shrink:0;${style}">A&#257;</button>`;
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
        <div class="card" style="text-align:center;margin-top:4rem">
          <div style="font-size:3rem">&#127942;</div>
          <h1>${score} / ${pool.length}</h1>
          <div class="muted" style="margin-bottom:1rem">${score === pool.length ? 'Perfect!' : score >= pool.length * 0.7 ? 'Great job!' : 'Keep practicing!'}</div>
          <button class="btn btn-primary" id="restart">Play again</button>
        </div>`;
      document.getElementById('restart').onclick = () => render(container, vocab);
      return;
    }

    const correct = pool[idx];
    const distractors = shuffle(vocab.words.filter(w => w.id !== correct.id && w.category === correct.category)).slice(0, 3);
    const fallback = shuffle(vocab.words.filter(w => w.id !== correct.id)).slice(0, 3 - distractors.length);
    const options = shuffle([correct, ...distractors, ...fallback].slice(0, 4));

    if (mode === 'thai-to-en') {
      // Thai question → pick English answer
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
          <div class="muted">${idx + 1} / ${pool.length}</div>
          <div class="muted">Score: ${score}</div>
        </div>
        <div class="card" style="text-align:center;margin:1rem 0;min-height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem">
          <div class="thai" style="font-size:2rem;font-weight:600">${correct.thai}</div>
          <div style="display:flex;gap:0.5rem;justify-content:center">
            ${speakBtn(correct.thai)}
            ${romanBtn(correct.thai, 'roman-q')}
          </div>
          <div id="roman-q" style="display:none;color:var(--text-muted);font-size:0.85rem;letter-spacing:0.05em"></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${options.map(o => `
            <button class="btn btn-ghost option-btn" data-id="${o.id}" style="text-align:left;justify-content:flex-start">
              ${o.english}
            </button>`).join('')}
        </div>
      `;
    } else {
      // English question → pick Thai answer
      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
          <div class="muted">${idx + 1} / ${pool.length}</div>
          <div class="muted">Score: ${score}</div>
        </div>
        <div class="card" style="text-align:center;margin:1rem 0;min-height:110px;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:1.3rem;font-weight:600">${correct.english}</div>
          ${correct.german ? `<div class="muted" style="font-size:0.9rem;margin-top:0.25rem">${correct.german}</div>` : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:0.5rem">
          ${options.map(o => `
            <div style="display:flex;align-items:center;gap:0.4rem">
              <button class="btn btn-ghost option-btn" data-id="${o.id}"
                style="flex:1;text-align:left;justify-content:flex-start;font-size:1.2rem">
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
          btn.style.cssText += ';background:var(--accent2);color:#000;border-color:var(--accent2)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 3);
        } else {
          btn.style.cssText += ';background:var(--danger);color:#fff;border-color:var(--danger)';
          const correctBtn = container.querySelector(`[data-id="${correct.id}"]`);
          if (correctBtn) correctBtn.style.cssText += ';background:var(--accent2);color:#000;border-color:var(--accent2)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 0);
        }

        speak(correct.thai);
        saveProgress(progress);
        setTimeout(() => {
          idx++;
          mode = Math.random() < 0.5 ? 'thai-to-en' : 'en-to-thai';
          showQuestion();
        }, 900);
      };
    });
  }

  showQuestion();
}
