import { getProgress, saveProgress } from './storage.js';
import { updateCard } from './srs.js';

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
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

    const question = mode === 'thai-to-en' ? correct.thai : correct.english;
    const getOption = w => mode === 'thai-to-en' ? w.english : w.thai;
    const isThai = mode === 'en-to-thai';

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem">
        <div class="muted">${idx + 1} / ${pool.length}</div>
        <div class="muted">Score: ${score}</div>
      </div>
      <div class="card" style="text-align:center;margin:1rem 0;min-height:100px;display:flex;align-items:center;justify-content:center">
        <div class="${mode === 'thai-to-en' ? 'thai' : ''}" style="font-size:${mode === 'thai-to-en' ? '2rem' : '1.3rem'};font-weight:600">${question}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:0.5rem">
        ${options.map(o => `
          <button class="btn btn-ghost option-btn" data-id="${o.id}"
            style="text-align:left;justify-content:flex-start;font-size:${isThai ? '1.2rem' : '1rem'}">
            ${getOption(o)}
          </button>`).join('')}
      </div>
    `;

    container.querySelectorAll('.option-btn').forEach(btn => {
      btn.onclick = () => {
        const chosen = parseInt(btn.dataset.id);
        const isCorrect = chosen === correct.id;

        container.querySelectorAll('.option-btn').forEach(b => b.disabled = true);

        if (isCorrect) {
          score++;
          btn.style.cssText += 'background:var(--accent2);color:#000;border-color:var(--accent2)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 3);
        } else {
          btn.style.cssText += 'background:var(--danger);color:#fff;border-color:var(--danger)';
          const correctBtn = container.querySelector(`[data-id="${correct.id}"]`);
          if (correctBtn) correctBtn.style.cssText += 'background:var(--accent2);color:#000;border-color:var(--accent2)';
          progress[correct.id] = updateCard(progress[correct.id] || {}, 0);
        }

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
