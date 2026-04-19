import { getWorkerUrl, getProgress, getWeakWords } from './storage.js';
import { getDueWords } from './srs.js';
import { speak } from './tts.js';
import { romanize } from './romanize.js';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSystemPrompt(vocab, progress) {
  const weak = getWeakWords(vocab, progress, 20);
  const weakSection = weak.length > 0
    ? `\n\nWords the student struggles with most:\n${weak.map(w => `  • ${w.thai} = ${w.english}${w.notes ? ` (${w.notes})` : ''} — failed ${progress[w.id]?.failures}×`).join('\n')}`
    : '';

  const wordList = vocab.words.map(w =>
    `${w.thai} = ${w.english}${w.notes ? ` [${w.notes}]` : ''}${w.category ? ` {${w.category}}` : ''}`
  ).join('\n');

  const sentences = (vocab.sentences || []).slice(0, 40).map(s =>
    `${s.thai} — ${s.english}`
  ).join('\n');

  return `You are a warm, encouraging Thai language teacher. Your student is a German male living in Bangkok, intermediate level, attending Thai classes twice a week.

STYLE: Short punchy responses (phone app). Mix Thai script + English naturally. Correct mistakes gently and explain WHY. Use ครับ as a male speaker. Celebrate progress briefly.

STUDENT VOCABULARY (${vocab.words.length} words):
${wordList}
${sentences.length > 0 ? `\nSENTENCE PATTERNS:\n${sentences}` : ''}${weakSection}`;
}

function addMessage(messagesEl, role, rawText) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${role === 'user' ? 'flex-end' : 'flex-start'};${role === 'user' ? 'margin-left:auto' : ''};max-width:88%`;

  const bubble = document.createElement('div');
  bubble.classList.add(role === 'user' ? 'bubble-user' : 'bubble-assistant');
  bubble.style.cssText = 'line-height:1.6;white-space:pre-wrap;word-break:break-word';
  bubble.textContent = rawText || '';
  wrapper.appendChild(bubble);

  if (role === 'assistant' && rawText) {
    const speakBtn = document.createElement('button');
    speakBtn.className = 'btn btn-ghost';
    speakBtn.style.cssText = 'padding:0.2rem 0.6rem;font-size:0.72rem;margin-top:0.2rem;width:auto';
    speakBtn.textContent = '🔊 Speak';
    speakBtn.onclick = () => speak(rawText);
    wrapper.appendChild(speakBtn);
  }

  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return bubble;
}

function startDrill(vocab, progress, messagesEl, quickActionsEl) {
  const weak = getWeakWords(vocab, progress, 30);
  const due = getDueWords(vocab, progress);
  const pool = weak.length >= 5 ? weak : due.length >= 5 ? due : vocab.words;
  const queue = shuffle(pool).slice(0, 10);

  quickActionsEl.style.display = 'none';

  let idx = 0;
  let correct = 0;

  function nextCard() {
    if (idx >= queue.length) {
      const summaryEl = document.createElement('div');
      summaryEl.className = 'card';
      summaryEl.style.cssText = 'text-align:center;margin-bottom:0';
      summaryEl.innerHTML = `
        <div class="gold-num" style="font-size:2.5rem">${correct}/${queue.length}</div>
        <div class="muted" style="margin:0.5rem 0 1rem">words correct</div>
        <button class="btn btn-primary" id="drill-again">Drill again ⚡</button>
      `;
      messagesEl.appendChild(summaryEl);
      messagesEl.scrollTop = messagesEl.scrollHeight;
      summaryEl.querySelector('#drill-again').onclick = () => {
        summaryEl.remove();
        startDrill(vocab, progress, messagesEl, quickActionsEl);
      };
      return;
    }

    const word = queue[idx];
    const roman = romanize(word.thai);

    // 3 wrong options from full vocab
    const wrong = shuffle(vocab.words.filter(w => w.id !== word.id)).slice(0, 3);
    const options = shuffle([word, ...wrong]);

    const card = document.createElement('div');
    card.className = 'card';
    card.style.cssText = 'margin-bottom:0';
    card.innerHTML = `
      <div style="text-align:center;margin-bottom:1rem">
        <div style="font-size:0.72rem;color:var(--text-dim);margin-bottom:0.5rem;letter-spacing:0.06em">WHAT DOES THIS MEAN?</div>
        <div class="thai-text" style="font-size:2.8rem;line-height:1.2;margin-bottom:0.75rem" lang="th">${word.thai}</div>
        <div style="display:flex;justify-content:center;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-ghost" id="show-roman" style="font-size:0.78rem;padding:0.25rem 0.75rem;width:auto">
            Show pronunciation
          </button>
          <button class="btn btn-ghost" id="speak-word" style="font-size:0.78rem;padding:0.25rem 0.75rem;width:auto">
            🔊 Hear it
          </button>
        </div>
        <div id="roman-reveal" style="font-size:0.95rem;color:var(--gold);margin-top:0.5rem;min-height:1.4rem;font-style:italic"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem" id="options-grid">
        ${options.map(o => `
          <button class="btn btn-ghost drill-opt" data-id="${o.id}"
            style="font-size:0.88rem;text-align:center;padding:0.6rem 0.5rem;line-height:1.3">
            ${o.english}
          </button>
        `).join('')}
      </div>
      <div id="drill-feedback" style="margin-top:0.75rem;text-align:center;font-size:0.875rem;min-height:1.4rem"></div>
      <div style="text-align:right;margin-top:0.25rem">
        <span class="muted" style="font-size:0.72rem">${idx + 1} / ${queue.length}</span>
      </div>
    `;

    messagesEl.appendChild(card);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    card.querySelector('#show-roman').onclick = () => {
      card.querySelector('#roman-reveal').textContent = roman;
    };
    card.querySelector('#speak-word').onclick = () => speak(word.thai);

    card.querySelectorAll('.drill-opt').forEach(btn => {
      btn.onclick = () => {
        const isCorrect = btn.dataset.id === word.id;
        if (isCorrect) correct++;

        card.querySelectorAll('.drill-opt').forEach(b => {
          b.disabled = true;
          if (b.dataset.id === word.id) {
            b.style.cssText += ';background:rgba(80,200,120,0.2);border-color:rgba(80,200,120,0.5);color:#50c878';
          } else if (b === btn && !isCorrect) {
            b.style.cssText += ';background:rgba(181,82,74,0.2);border-color:rgba(181,82,74,0.5);color:var(--danger)';
          }
        });

        // always show romanization after answer
        card.querySelector('#roman-reveal').textContent = roman;

        const feedback = card.querySelector('#drill-feedback');
        if (isCorrect) {
          feedback.textContent = '✓ Correct!';
          feedback.style.color = '#50c878';
        } else {
          feedback.textContent = `✗  "${word.english}"${word.notes ? ' · ' + word.notes : ''}`;
          feedback.style.color = 'var(--danger)';
        }

        idx++;
        setTimeout(nextCard, isCorrect ? 900 : 1800);
      };
    });
  }

  nextCard();
}

async function* streamMessage(workerUrl, messages, systemPrompt) {
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
      stream: true,
      messages,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { const e = await res.json(); errMsg = e.error?.message || errMsg; } catch {}
    throw new Error(errMsg);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (!json || json === '[DONE]') continue;
      try {
        const evt = JSON.parse(json);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') yield evt.delta.text;
      } catch {}
    }
  }
}

export function render(container, vocab) {
  const workerUrl = getWorkerUrl();
  const progress = getProgress();
  const systemPrompt = buildSystemPrompt(vocab, progress);
  const history = [];

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:calc(100dvh - var(--nav-h) - 2rem)">
      <div style="flex-shrink:0;margin-bottom:0.625rem">
        <div style="display:flex;align-items:baseline;gap:0.5rem;margin-bottom:0.2rem">
          <h1 style="margin-bottom:0">Thai Teacher</h1>
          <span class="muted" style="font-size:0.8rem">· ${vocab.words.length} words in memory</span>
        </div>
      </div>

      <div id="quick-actions" style="display:flex;gap:0.5rem;margin-bottom:0.625rem;flex-wrap:wrap;flex-shrink:0">
        <button class="btn btn-ghost" data-mode="drill" style="font-size:0.82rem;padding:0.4rem 0.875rem;width:auto">⚡ Drill me</button>
        <button class="btn btn-ghost" data-mode="talk"  style="font-size:0.82rem;padding:0.4rem 0.875rem;width:auto">💬 Let's talk</button>
        <button class="btn btn-ghost" data-mode="recap" style="font-size:0.82rem;padding:0.4rem 0.875rem;width:auto">📖 Recap today</button>
      </div>

      <div id="chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0.625rem;padding-bottom:0.5rem"></div>

      <div style="display:flex;gap:0.5rem;padding-top:0.625rem;flex-shrink:0">
        <input id="chat-input" type="text" placeholder="Ask anything…"
          style="flex:1;padding:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:1rem;outline:none">
        <button class="btn btn-primary" id="send-btn" style="width:auto;padding:0.75rem 1.25rem;flex-shrink:0">Send</button>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const quickActionsEl = document.getElementById('quick-actions');

  addMessage(messagesEl, 'assistant',
    'สวัสดีครับ! Ready to practice? Tap ⚡ Drill me for a multiple choice quiz on your words, or just ask me anything ครับ!');
  input.focus();

  async function sendUserMessage(text) {
    if (!text.trim()) return;
    input.value = '';
    input.disabled = true;
    document.getElementById('send-btn').disabled = true;
    quickActionsEl.style.display = 'none';

    addMessage(messagesEl, 'user', text);
    history.push({ role: 'user', content: text });

    const thinkingEl = document.createElement('div');
    thinkingEl.style.cssText = 'color:var(--text-muted);font-style:italic;font-size:0.82rem;padding:0.25rem';
    thinkingEl.textContent = 'Thinking…';
    messagesEl.appendChild(thinkingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const bubble = addMessage(messagesEl, 'assistant', '');
      thinkingEl.remove();
      let fullText = '';

      for await (const chunk of streamMessage(workerUrl, history, systemPrompt)) {
        fullText += chunk;
        bubble.textContent = fullText;
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      history.push({ role: 'assistant', content: fullText });

      const speakBtn = document.createElement('button');
      speakBtn.className = 'btn btn-ghost';
      speakBtn.style.cssText = 'padding:0.2rem 0.6rem;font-size:0.72rem;margin-top:0.2rem;width:auto';
      speakBtn.textContent = '🔊 Speak';
      speakBtn.onclick = () => speak(fullText);
      bubble.parentElement.appendChild(speakBtn);

    } catch (err) {
      thinkingEl.remove();
      addMessage(messagesEl, 'assistant', `Connection error: ${err.message}`);
    } finally {
      input.disabled = false;
      document.getElementById('send-btn').disabled = false;
      input.focus();
    }
  }

  document.getElementById('send-btn').onclick = () => sendUserMessage(input.value.trim());
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) sendUserMessage(input.value.trim());
  });

  quickActionsEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    if (btn.dataset.mode === 'drill') {
      startDrill(vocab, progress, messagesEl, quickActionsEl);
    } else {
      const prompts = {
        talk:  'Let\'s have a short Thai conversation. Start us off with something easy ครับ.',
        recap: 'Give me a quick recap of the words I\'ve been struggling with lately and one tip for each.',
      };
      sendUserMessage(prompts[btn.dataset.mode]);
    }
  });
}
