import {
  getLlmModel,
  getLlmProvider,
  getProgress,
  getWorkerUrl,
  markPracticed,
  saveProgress,
} from './storage.js';
import { updateCard } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';

function fuzzyMatch(input, target) {
  const a = input.trim().toLowerCase().replace(/\s+/g, '');
  const b = target.trim().toLowerCase().replace(/\s+/g, '');
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 3) return false;
  let matches = 0;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++;
  }
  return matches / longer.length > 0.75;
}

export function render(container, vocab) {
  const progress = getProgress();
  const pool = [...vocab.words].sort(() => Math.random() - 0.5).slice(0, 15);
  let idx = 0;

  function showPrompt() {
    if (idx >= pool.length) {
      container.innerHTML = `
        <div style="margin-top:3rem">
          <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem">
            <div style="color:var(--success);display:flex;justify-content:center;margin-bottom:0.75rem">
              <svg width="40" height="40"><use href="#i-check"/></svg>
            </div>
            <h1>Done</h1>
            <div class="muted" style="margin-top:0.25rem;margin-bottom:1.25rem">${pool.length} words practiced</div>
            <button class="btn btn-primary" id="again">Go again</button>
          </div>
        </div>`;
      document.getElementById('again').onclick = () => render(container, vocab);
      return;
    }

    const w = pool[idx];
    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:0.75rem">
        <span class="muted">${idx + 1} / ${pool.length}</span>
        <span class="muted" style="letter-spacing:0.04em">Review</span>
      </div>
      <div class="card card-hero" style="text-align:center;padding:2rem 1.25rem;margin-bottom:0.75rem">
        <div class="muted" style="margin-bottom:0.625rem;letter-spacing:0.06em;text-transform:uppercase;font-size:0.7rem">Type the Thai for</div>
        <div style="font-family:var(--font-serif);font-size:2rem;font-weight:500">${w.english}</div>
      </div>
      <input id="answer" type="text" placeholder="Type Thai\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="margin-bottom:0.625rem;font-family:var(--font-thai);font-size:1.2rem">
      <button class="btn btn-primary" id="submit">Check</button>
      <div id="feedback" style="margin-top:1rem"></div>
    `;

    const input = document.getElementById('answer');
    input.focus();

    function check() {
      const answer = input.value;
      if (!answer.trim()) return;
      const exact = answer.trim() === w.thai.trim();
      const close = !exact && fuzzyMatch(answer, w.thai);
      const feedback = document.getElementById('feedback');

      if (exact || close) {
        feedback.innerHTML = `
          <div style="color:var(--success);font-weight:600;display:flex;align-items:center;gap:0.375rem">
            <svg width="18" height="18"><use href="#i-check"/></svg>
            ${exact ? 'Correct' : 'Close enough'}
          </div>
          <div class="thai-text thai-sm" style="margin-top:0.25rem;color:var(--text-muted)" lang="th">${w.thai}</div>
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
            <button class="btn btn-dim" id="speak-ans" style="width:auto;padding:0.4rem 0.875rem;font-size:0.8rem;display:flex;align-items:center;gap:0.3rem">
              <svg width="14" height="14"><use href="#i-audio"/></svg> Hear
            </button>
            <button class="btn btn-dim" id="roman-ans" style="width:auto;padding:0.4rem 0.875rem;font-size:0.8rem">Āā Roman</button>
          </div>
          <div id="roman-text" style="display:none;color:var(--text-muted);font-size:0.85rem;margin-top:0.25rem;letter-spacing:0.05em"></div>
        `;
        progress[w.id] = updateCard(progress[w.id] || {}, exact ? 3 : 2);
        saveProgress(progress);
        markPracticed();
        bindSpeakRoman(w.thai);
        setTimeout(() => { idx++; showPrompt(); }, 1800);
      } else {
        progress[w.id] = updateCard(progress[w.id] || {}, 0);
        saveProgress(progress);
        markPracticed();
        feedback.innerHTML = `
          <div style="color:var(--danger);font-weight:600;display:flex;align-items:center;gap:0.375rem">
            <svg width="18" height="18"><use href="#i-close"/></svg> Correct answer
          </div>
          <div class="thai-text thai-sm" style="margin:0.25rem 0" lang="th">${w.thai}</div>
          ${w.notes ? `<div class="muted" style="font-style:italic;font-size:0.8rem">${w.notes}</div>` : ''}
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
            <button class="btn btn-dim" id="speak-ans" style="width:auto;padding:0.4rem 0.875rem;font-size:0.8rem;display:flex;align-items:center;gap:0.3rem">
              <svg width="14" height="14"><use href="#i-audio"/></svg> Hear
            </button>
            <button class="btn btn-dim" id="roman-ans" style="width:auto;padding:0.4rem 0.875rem;font-size:0.8rem">Āā Roman</button>
          </div>
          <div id="roman-text" style="display:none;color:var(--text-muted);font-size:0.85rem;margin-top:0.25rem;letter-spacing:0.05em"></div>
          <div id="tutor-feedback" class="muted" style="margin-top:0.75rem;font-size:0.875rem">Getting a tutor tip\u2026</div>
          <button class="btn btn-ghost" style="margin-top:0.75rem" id="next-btn">Next \u2192</button>
        `;
        document.getElementById('next-btn').onclick = () => { idx++; showPrompt(); };
        bindSpeakRoman(w.thai);
        speak(w.thai);
        getTutorFeedback(w, answer);
      }
    }

    document.getElementById('submit').onclick = check;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  function bindSpeakRoman(thai) {
    document.getElementById('speak-ans').onclick = () => speak(thai);
    let romanVisible = false;
    document.getElementById('roman-ans').onclick = () => {
      romanVisible = !romanVisible;
      const el = document.getElementById('roman-text');
      if (romanVisible) { el.textContent = romanize(thai); el.style.display = 'block'; }
      else el.style.display = 'none';
    };
  }

  async function getTutorFeedback(word, userAnswer) {
    try {
      const res = await fetch(getWorkerUrl(), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: getLlmProvider(),
          model: getLlmModel(),
          max_tokens: 120,
          stream: false,
          system: 'You are a concise and encouraging Thai tutor. End short feedback with ครับ.',
          messages: [{
            role: 'user',
            content: `Student tried to write "${word.thai}" (${word.english}) but wrote "${userAnswer}". One short encouraging tip in English, max 2 sentences. End with ครับ.`
          }]
        })
      });
      const data = await res.json();
      const el = document.getElementById('tutor-feedback');
      if (el) el.textContent = data.text || data.content?.[0]?.text || 'Keep practicing \u0E04\u0E23\u0E31\u0E1A!';
    } catch {
      const el = document.getElementById('tutor-feedback');
      if (el) el.textContent = 'Keep practicing \u0E04\u0E23\u0E31\u0E1A!';
    }
  }

  showPrompt();
}
