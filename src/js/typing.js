import { getProgress, saveProgress, getApiKey } from './storage.js';
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
        <div class="card" style="text-align:center;margin-top:4rem">
          <div style="font-size:3rem">&#10003;</div>
          <h1>Done!</h1>
          <div class="muted" style="margin-bottom:1rem">15 words practiced</div>
          <button class="btn btn-primary" id="again">Go again</button>
        </div>`;
      document.getElementById('again').onclick = () => render(container, vocab);
      return;
    }

    const w = pool[idx];
    container.innerHTML = `
      <div class="muted">${idx + 1} / ${pool.length}</div>
      <div class="card" style="text-align:center;margin:1rem 0">
        <div class="muted" style="margin-bottom:0.5rem">Type the Thai for:</div>
        <div style="font-size:1.5rem;font-weight:700">${w.english}</div>
        ${w.german ? `<div class="muted" style="margin-top:0.25rem">${w.german}</div>` : ''}
      </div>
      <input id="answer" type="text" placeholder="Type Thai\u2026" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        style="margin-bottom:0.75rem;font-size:1.2rem">
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
          <div style="color:var(--accent2);font-size:1.1rem;font-weight:600">${exact ? '&#10003; Correct!' : '&#128077; Close enough!'}</div>
          <div class="thai-sm" style="margin-top:0.25rem;color:var(--text-muted)">${w.thai}</div>
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
            <button class="btn btn-ghost" id="speak-ans" style="padding:0.35rem 0.75rem;font-size:0.8rem">&#128266; Hear it</button>
            <button class="btn btn-ghost" id="roman-ans" style="padding:0.35rem 0.75rem;font-size:0.8rem">A&#257; Roman</button>
          </div>
          <div id="roman-text" style="display:none;color:var(--text-muted);font-size:0.85rem;margin-top:0.25rem;letter-spacing:0.05em"></div>
        `;
        progress[w.id] = updateCard(progress[w.id] || {}, exact ? 3 : 2);
        saveProgress(progress);
        bindSpeakRoman(w.thai);
        setTimeout(() => { idx++; showPrompt(); }, 1800);
      } else {
        progress[w.id] = updateCard(progress[w.id] || {}, 0);
        saveProgress(progress);
        feedback.innerHTML = `
          <div style="color:var(--danger);font-weight:600">&#10007; Correct answer:</div>
          <div class="thai-sm" style="margin:0.25rem 0">${w.thai}</div>
          ${w.notes ? `<div class="muted" style="font-style:italic;font-size:0.8rem">${w.notes}</div>` : ''}
          <div style="display:flex;gap:0.5rem;margin-top:0.5rem">
            <button class="btn btn-ghost" id="speak-ans" style="padding:0.35rem 0.75rem;font-size:0.8rem">&#128266; Hear it</button>
            <button class="btn btn-ghost" id="roman-ans" style="padding:0.35rem 0.75rem;font-size:0.8rem">A&#257; Roman</button>
          </div>
          <div id="roman-text" style="display:none;color:var(--text-muted);font-size:0.85rem;margin-top:0.25rem;letter-spacing:0.05em"></div>
          <div id="tutor-feedback" class="muted" style="margin-top:0.75rem;font-size:0.875rem">Getting tip from Kru Noi\u2026</div>
          <button class="btn btn-ghost" style="margin-top:0.75rem" id="next-btn">Next &#8594;</button>
        `;
        document.getElementById('next-btn').onclick = () => { idx++; showPrompt(); };
        bindSpeakRoman(w.thai);
        speak(w.thai);
        const apiKey = getApiKey();
        if (apiKey) getTutorFeedback(w, answer, apiKey);
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

  async function getTutorFeedback(word, userAnswer, apiKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [{
            role: 'user',
            content: `Student tried to write "${word.thai}" (${word.english}) but wrote "${userAnswer}". One short encouraging tip in English, max 2 sentences. End with ครับ.`
          }]
        })
      });
      const data = await res.json();
      const el = document.getElementById('tutor-feedback');
      if (el) el.textContent = data.content?.[0]?.text || 'Keep practicing \u0E04\u0E23\u0E31\u0E1A!';
    } catch {
      const el = document.getElementById('tutor-feedback');
      if (el) el.textContent = 'Keep practicing \u0E04\u0E23\u0E31\u0E1A!';
    }
  }

  showPrompt();
}
