import { getApiKey } from './storage.js';
import { speak } from './tts.js';

const AGENT_ID = 'agent_011Ca9hSNnqrQbmwSVf4rXZu';
const ENV_ID = 'env_01WoCSBTbrJoDVTBFcALFZ2g';
const BASE = 'https://api.anthropic.com';
const BETA = 'managed-agents-2026-04-01';

function headers(apiKey, withBody = false) {
  return {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': BETA,
    'anthropic-dangerous-direct-browser-access': 'true',
    ...(withBody ? { 'content-type': 'application/json' } : {}),
  };
}

async function createSession(apiKey) {
  const res = await fetch(`${BASE}/v1/sessions?beta=true`, {
    method: 'POST',
    headers: headers(apiKey, true),
    body: JSON.stringify({ agent: AGENT_ID, environment_id: ENV_ID }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `HTTP ${res.status}`);
  return data.id;
}

async function sendMessage(sessionId, text, apiKey) {
  await fetch(`${BASE}/v1/sessions/${sessionId}/events?beta=true`, {
    method: 'POST',
    headers: headers(apiKey, true),
    body: JSON.stringify({
      events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
    }),
  });
}

async function* openStream(sessionId, apiKey) {
  const res = await fetch(`${BASE}/v1/sessions/${sessionId}/events/stream?beta=true`, {
    headers: headers(apiKey),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Stream HTTP ${res.status}`);
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
      try { yield JSON.parse(json); } catch {}
    }
  }
}

function buildVocabContext(vocab) {
  const words = vocab.words.map(w =>
    `${w.thai} = ${w.english}${w.notes ? ` (${w.notes})` : ''}`
  ).join('\n');
  const sentences = vocab.sentences.map(s => `${s.thai} = ${s.english}`).join('\n');
  return `[Student context — German male, Bangkok, intermediate Thai, studies 3x/week]\n\nVocabulary (${vocab.words.length} words):\n${words}\n\nSentence patterns:\n${sentences}`;
}

export function render(container, vocab) {
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:calc(100dvh - var(--nav-h) - 2rem)">
      <div style="margin-bottom:0.75rem;flex-shrink:0">
        <h1>ครูน้อย</h1>
        <div class="muted" id="tutor-status">Connecting\u2026</div>
      </div>
      <div id="chat-messages" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:0.75rem;padding-bottom:0.5rem"></div>
      <div style="display:flex;gap:0.5rem;margin-top:0.5rem;flex-shrink:0">
        <input id="chat-input" type="text" placeholder="Ask Kru Noi anything\u2026" disabled
          style="flex:1;padding:0.75rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);color:var(--text);font-size:1rem;outline:none">
        <button class="btn btn-primary" id="send-btn" disabled style="width:auto;padding:0.75rem 1.25rem;flex-shrink:0">Send</button>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const statusEl = document.getElementById('tutor-status');

  function setStatus(text) { statusEl.textContent = text; }

  function addMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${role === 'user' ? 'flex-end' : 'flex-start'};max-width:88%;${role === 'user' ? 'margin-left:auto' : ''}`;
    const div = document.createElement('div');
    div.style.cssText = `padding:0.75rem 1rem;border-radius:var(--radius);line-height:1.6;white-space:pre-wrap;word-break:break-word;${
      role === 'user'
        ? 'background:var(--accent);color:#000;'
        : 'background:var(--surface2);color:var(--text);border:1px solid var(--border);'
    }`;
    div.textContent = text;
    wrapper.appendChild(div);
    if (role === 'assistant') {
      const btn = document.createElement('button');
      btn.className = 'btn btn-ghost';
      btn.style.cssText = 'padding:0.2rem 0.6rem;font-size:0.75rem;margin-top:0.25rem';
      btn.textContent = '🔊 Speak';
      btn.onclick = () => speak(text);
      wrapper.appendChild(btn);
    }
    messagesEl.appendChild(wrapper);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  // Event queue — stream runs in background, sendMessage drains events per turn
  let eventQueue = [];
  let eventResolver = null;

  function pushEvent(evt) {
    if (eventResolver) { eventResolver(evt); eventResolver = null; }
    else eventQueue.push(evt);
  }

  function nextEvent() {
    return new Promise(resolve => {
      if (eventQueue.length) resolve(eventQueue.shift());
      else eventResolver = resolve;
    });
  }

  async function waitForIdle(onMessage) {
    while (true) {
      const evt = await nextEvent();
      if (evt.type === 'agent.message') {
        const text = (evt.content || []).map(b => b.text || '').join('');
        if (text) onMessage(text);
      } else if (evt.type === 'session.status_idle') {
        return;
      } else if (evt.type === 'session.error' || evt.type === 'session.status_terminated') {
        throw new Error(evt.error?.message || evt.type);
      }
    }
  }

  async function init() {
    const apiKey = getApiKey();
    if (!apiKey || apiKey === '__ANTHROPIC_API_KEY__') {
      setStatus('Add your API key in Settings first ครับ.');
      return;
    }

    try {
      const sessionId = await createSession(apiKey);

      // Start background stream
      (async () => {
        try {
          for await (const evt of openStream(sessionId, apiKey)) pushEvent(evt);
        } catch (e) {
          pushEvent({ type: 'session.error', error: { message: e.message } });
        }
      })();

      // Send vocab context silently
      setStatus('Loading vocabulary context\u2026');
      await sendMessage(sessionId, buildVocabContext(vocab), apiKey);
      await waitForIdle(() => {});

      // Ready
      setStatus(`Your Thai tutor \u00b7 ${vocab.words.length} words in memory`);
      input.disabled = false;
      document.getElementById('send-btn').disabled = false;
      addMessage('assistant', '\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35\u0E04\u0E23\u0E31\u0E1A! I\'m Kru Noi. Ask me anything about Thai \u2014 vocabulary, sentences, grammar, or let\'s practice together \u0E04\u0E23\u0E31\u0E1A!');
      input.focus();

      async function handleSend() {
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        input.disabled = true;
        document.getElementById('send-btn').disabled = true;
        addMessage('user', text);

        const thinking = document.createElement('div');
        thinking.style.cssText = 'color:var(--text-muted);font-style:italic;padding:0.5rem 1rem;font-size:0.875rem';
        thinking.textContent = 'ครูน้อย is thinking\u2026';
        messagesEl.appendChild(thinking);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
          await sendMessage(sessionId, text, apiKey);
          let reply = '';
          await waitForIdle(msg => { reply += msg; });
          thinking.remove();
          if (reply) addMessage('assistant', reply);
        } catch (err) {
          thinking.remove();
          addMessage('assistant', `Error: ${err.message}`);
        } finally {
          input.disabled = false;
          document.getElementById('send-btn').disabled = false;
          input.focus();
        }
      }

      document.getElementById('send-btn').onclick = handleSend;
      input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) handleSend(); });

    } catch (err) {
      setStatus(`Connection failed: ${err.message}`);
    }
  }

  init();
}
