// Minimal OpenAI client (Responses API + Images API) using global fetch.
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const BASE = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';

if (!OPENAI_KEY) {
  console.error('✗ OPENAI_API_KEY manquant dans l\'environnement.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function callResponses(body, { retries = 5, timeoutMs = 300_000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = Number(res.headers.get('retry-after')) || 0;
        throw Object.assign(new Error(`HTTP ${res.status}`), { retryAfter, transient: true });
      }
      const json = await res.json();
      if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
      if (json.status === 'incomplete') {
        throw Object.assign(new Error(`incomplete: ${json.incomplete_details?.reason}`), { transient: true });
      }
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const base = err.retryAfter ? err.retryAfter * 1000 : Math.min(32_000, 2000 * 2 ** attempt);
      const jitter = 250 + (attempt * 137) % 500;
      await sleep(base + jitter);
    }
  }
  throw lastErr;
}

// Extract the concatenated text output of a Responses API result.
export function outputText(resp) {
  let text = '';
  for (const item of resp.output || []) {
    if (item.type === 'message') {
      for (const c of item.content || []) {
        if (c.type === 'output_text' || c.type === 'text') text += c.text || '';
      }
    }
  }
  return text.trim();
}

export async function generateImage(body, { retries = 4, timeoutMs = 240_000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${BASE}/images/generations`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 429 || res.status >= 500) throw Object.assign(new Error(`HTTP ${res.status}`), { transient: true });
      const json = await res.json();
      if (!res.ok) throw new Error(`Images ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
      return json;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      await sleep(Math.min(30_000, 2500 * 2 ** attempt));
    }
  }
  throw lastErr;
}
