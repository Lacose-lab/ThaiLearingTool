// Thai Learning unified Cloudflare Worker proxy.
//
// Required secrets:
//   wrangler secret put ANTHROPIC_API_KEY
//   wrangler secret put OPENAI_API_KEY
//
// The browser sends provider-neutral JSON:
// { provider, model, messages, system, stream, max_tokens }

const DEFAULTS = {
  anthropic: 'claude-haiku-4-5-20251001',
  openai: 'gpt-4.1-mini',
};

function corsHeaders(request) {
  return {
    'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function jsonResponse(request, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), 'Content-Type': 'application/json' },
  });
}

function normalizeMessages(messages = []) {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: typeof m.content === 'string' ? m.content : String(m.content || ''),
  }));
}

function anthroSystem(system) {
  if (Array.isArray(system)) return system;
  return system ? [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }] : undefined;
}

async function callAnthropic(request, env, body) {
  if (!env.ANTHROPIC_API_KEY) {
    return jsonResponse(request, { error: { message: 'ANTHROPIC_API_KEY secret not set on Worker' } }, 500);
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || DEFAULTS.anthropic,
      max_tokens: body.max_tokens || 1024,
      system: anthroSystem(body.system),
      stream: body.stream !== false,
      messages: normalizeMessages(body.messages),
    }),
  });

  if (body.stream === false) {
    const data = await upstream.json();
    return jsonResponse(request, {
      text: data.content?.map(part => part.text || '').join('') || '',
      raw: data,
    }, upstream.status);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': upstream.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

function openAiInput(messages = []) {
  return normalizeMessages(messages).map(m => ({ role: m.role, content: m.content }));
}

async function callOpenAI(request, env, body) {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(request, { error: { message: 'OPENAI_API_KEY secret not set on Worker' } }, 500);
  }

  const upstream = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: body.model || DEFAULTS.openai,
      instructions: body.system || undefined,
      input: openAiInput(body.messages),
      max_output_tokens: body.max_tokens || 1024,
      stream: body.stream !== false,
    }),
  });

  if (body.stream === false) {
    const data = await upstream.json();
    const text = data.output_text ||
      data.output?.flatMap(item => item.content || []).map(part => part.text || '').join('') ||
      '';
    return jsonResponse(request, { text, raw: data }, upstream.status);
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';

  async function pump() {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (!payload || payload === '[DONE]') continue;
          const evt = JSON.parse(payload);
          if (evt.type === 'response.output_text.delta' && evt.delta) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ text: evt.delta })}\n\n`));
          }
        }
      }
    } catch (err) {
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
    } finally {
      await writer.close();
    }
  }

  pump();

  return new Response(readable, {
    status: upstream.status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    if (request.method !== 'POST') {
      return jsonResponse(request, { error: { message: 'Method not allowed' } }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse(request, { error: { message: 'Invalid JSON body' } }, 400);
    }

    const provider = body.provider === 'openai' ? 'openai' : 'anthropic';
    return provider === 'openai'
      ? callOpenAI(request, env, body)
      : callAnthropic(request, env, body);
  },
};
