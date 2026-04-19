import { getWorkerUrl, getProgress, getWeakWords } from './storage.js';
import { speak } from './tts.js';

const MODEL = 'claude-haiku-4-5';
const MAX_TOKENS = 1024;

function buildSystemPrompt(vocab, progress) {
  const weak = getWeakWords(vocab, progress, 20);
  const weakSection = weak.length > 0
    ? `\n\nWords the student struggles with most (prioritise these in drills):\n${weak.map(w => `  • ${w.thai} = ${w.english}${w.notes ? ` (${w.notes})` : ''} — failed ${progress[w.id]?.failures}×`).join('\n')}`
    : '';

  const wordList = vocab.words.map(w =>
    `${w.thai} = ${w.english}${w.notes ? ` [${w.notes}]` : ''}${w.category ? ` {${w.category}}` : ''}`
  ).join('\n');

  const sentences = (vocab.sentences || []).slice(0, 40).map(s =>
    `${s.thai} — ${s.english}`
  ).join('\n');

  return `You are ครูน้อย (Kru Noi), a warm and encouraging Thai language teacher. Your student is a German male living in Bangkok, intermediate level, attending Thai classes twice a week.

TEACHING STYLE:
- Short, punchy responses — this is a phone app, keep messages under 150 words unless drilling
- Mix Thai script with English explanations naturally
- When the student makes a mistake, gently correct and explain WHY (e.g. tone, register, particle)
- Use ครับ yourself as a male speaker politely
- Celebrate progress warmly but briefly
- If asked about a word not in the vocabulary list, teach it but note it's bonus material

STUDENT'S CURRENT VOCABULARY (${vocab.words.length} words):
${wordList}
${sentences.length > 0 ? `\nSENTENCE PATTERNS STUDIED:\n${sentences}` : ''}${weakSection}

When drilling, pick from the weak words list first. Format drills as: show English → student types/says Thai. Confirm correct answers immediately.`;
}

function addMessage(messagesEl, role, html, rawText) {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${role === 'user' ? 'flex-end' : 'flex-start'};${role === 'user' ? 'margin-left:auto' : ''};max-width:88%`;

  const bubble = document.createElement('div');
  bubble.classList.add(role === 'user' ? 'bubble-user' : 'bubble-assistant');
  bubble.style.cssText = 'line-height:1.6;white-space:pre-wrap;word-break:break-word';
  if (html) {
    bubble.innerHTML = html;
  } else {
    bubble.textContent = rawText || '';
  }
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

async function* streamMessage(workerUrl, messages, systemPrompt) {
  const res = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      stream: true,
      messages,
    }),
  });

  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      errMsg = err.error?.message || errMsg;
    } catch {}
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
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          yield evt.delta.text;
        }
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
        <div id="tutor-status" class="muted" style="font-size:0.8rem"></div>
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
  const statusEl = document.getElementById('tutor-status');

  if (!workerUrl) {
    statusEl.textContent = 'Set your Worker URL in Profile → Kru Noi Connection first.';
    addMessage(messagesEl, 'assistant', null,
      'สวัสดีครับ! I\'m Kru Noi — your personal Thai teacher.\n\nTo connect me, go to Profile → "Kru Noi Connection" and paste your Cloudflare Worker URL. The cloudflare-worker.js file is in the repo — deploy it in 2 minutes at dash.cloudflare.com ครับ.');
    input.disabled = true;
    document.getElementById('send-btn').disabled = true;
    return;
  }

  addMessage(messagesEl, 'assistant', null,
    'สวัสดีครับ! I\'m your Thai teacher. I know all your vocabulary and which words give you trouble. What shall we work on today? Tap a button above or just ask me anything ครับ!');
  input.focus();

  async function sendUserMessage(text) {
    if (!text.trim()) return;
    input.value = '';
    input.disabled = true;
    document.getElementById('send-btn').disabled = true;
    document.getElementById('quick-actions').style.display = 'none';

    addMessage(messagesEl, 'user', null, text);
    history.push({ role: 'user', content: text });

    const thinkingEl = document.createElement('div');
    thinkingEl.style.cssText = 'color:var(--text-muted);font-style:italic;font-size:0.82rem;padding:0.25rem 0.25rem';
    thinkingEl.textContent = 'ครูน้อย is thinking…';
    messagesEl.appendChild(thinkingEl);
    messagesEl.scrollTop = messagesEl.scrollHeight;

    try {
      const bubble = addMessage(messagesEl, 'assistant', null, '');
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
      addMessage(messagesEl, 'assistant', null, `Connection error: ${err.message}\n\nCheck your Worker URL in Profile ครับ.`);
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

  document.getElementById('quick-actions').addEventListener('click', e => {
    const btn = e.target.closest('[data-mode]');
    if (!btn) return;
    const prompts = {
      drill: 'Drill me on my weak words — quiz me one at a time, show the English and I\'ll type the Thai.',
      talk:  'Let\'s have a short Thai conversation. Start us off with something easy ครับ.',
      recap: 'Give me a quick recap of the words I\'ve been struggling with lately and one tip for each.',
    };
    sendUserMessage(prompts[btn.dataset.mode]);
  });
}
