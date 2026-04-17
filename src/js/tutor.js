import { getApiKey } from './storage.js';
import { speak } from './tts.js';

function buildSystemPrompt(vocab) {
  const wordList = vocab.words.map(w =>
    `${w.thai} = ${w.english}${w.notes ? ` (${w.notes})` : ''}`
  ).join('\n');

  const sentenceList = vocab.sentences.map(s =>
    `${s.thai} = ${s.english}`
  ).join('\n');

  return `You are Kru Noi (ครูน้อย), a friendly Thai language tutor.
Your student is a German male living in Bangkok, intermediate level, studying Thai 3x per week with a teacher.
Always use male speech register — ครับ, ผม. Never use ฉัน or ค่ะ.
Keep responses concise and practical. Use Thai script when giving examples.

The student's full vocabulary list (${vocab.words.length} words):
${wordList}

Sentence patterns studied:
${sentenceList}

Help with: word explanations, example sentences, conversation practice, grammar questions, custom drills.`;
}

export function render(container, vocab) {
  const history = [];
  const systemPrompt = buildSystemPrompt(vocab);

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:calc(100dvh - var(--nav-h) - 2rem)">
      <div style="margin-bottom:0.75rem;flex-shrink:0">
        <h1>ครูน้อย</h1>
        <div class="muted">Your Thai tutor &middot; ${vocab.words.length} words in memory</div>
      </div>
      <div id="chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0.75rem;padding-bottom:0.5rem"></div>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-shrink:0">
        <input id="chat-input" type="text" placeholder="Ask Kru Noi anything…"
          style="flex:1;padding:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:1rem;outline:none">
        <button class="btn btn-primary" id="send-btn" style="width:auto;padding:0.75rem 1.25rem;flex-shrink:0">Send</button>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');

  function addMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${role === 'user' ? 'flex-end' : 'flex-start'};max-width:88%;${role === 'user' ? 'margin-left:auto' : ''}`;

    const div = document.createElement('div');
    const isUser = role === 'user';
    div.style.cssText = `
      padding:0.75rem 1rem;
      border-radius:var(--radius);
      line-height:1.6;
      white-space:pre-wrap;
      word-break:break-word;
      ${isUser
        ? 'background:var(--accent);color:#000;'
        : 'background:var(--surface2);color:var(--text);border:1px solid var(--border);'}
    `;
    div.textContent = text;
    wrapper.appendChild(div);

    if (!isUser) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.style.cssText = 'padding:0.2rem 0.6rem;font-size:0.75rem;margin-top:0.25rem;align-self:flex-start';
      btn.textContent = '🔊 Speak';
      btn.onclick = () => speak(text);
      wrapper.appendChild(btn);
    }

    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  async function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    const apiKey = getApiKey();
    if (!apiKey) {
      addMessage('assistant', 'Please add your Anthropic API key in Settings first ครับ.');
      return;
    }

    input.value = '';
    input.disabled = true;
    document.getElementById('send-btn').disabled = true;

    addMessage('user', text);
    history.push({ role: 'user', content: text });

    const thinking = document.createElement('div');
    thinking.style.cssText = 'color:var(--text-muted);font-style:italic;align-self:flex-start;padding:0.5rem 1rem;font-size:0.875rem';
    thinking.textContent = 'ครูน้อย is thinking\u2026';
    messagesEl.appendChild(thinking);
    messagesEl.scrollTop = messagesEl.scrollHeight;

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
          max_tokens: 1024,
          system: systemPrompt,
          messages: history
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
      const reply = data.content?.[0]?.text || '\u0E02\u0E2D\u0E42\u0E17\u0E29\u0E04\u0E23\u0E31\u0E1A, something went wrong.';
      thinking.remove();
      history.push({ role: 'assistant', content: reply });
      addMessage('assistant', reply);
    } catch (err) {
      thinking.remove();
      addMessage('assistant', `Error: ${err.message}`);
    } finally {
      input.disabled = false;
      document.getElementById('send-btn').disabled = false;
      input.focus();
    }
  }

  document.getElementById('send-btn').onclick = sendMessage;
  input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(); });

  addMessage('assistant', '\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A! I\'m Kru Noi. Ask me anything about Thai — vocabulary, sentences, grammar, or let\'s practice together \u0E04\u0E23\u0E31\u0E1A!');
}
