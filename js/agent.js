// Agent to fetch and normalize a Google Sheet into a deck
// Priorities: minimal user interaction, robust header detection, public hosting friendly

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/u/1/d/e/2PACX-1vTbVBGDEoEZGkzT9IXpUUdgfSzldlHB1-54IMjZL6G1Rdo3RPpej6OXSSXVyxBHO_dFB9R_wlOMCoBE/pubhtml?gid=1246544354&single=true";

function toCsvUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // handle pubhtml → csv
    if (u.pathname.endsWith('/pubhtml')) {
      u.pathname = u.pathname.replace('/pubhtml', '/pub');
      u.searchParams.set('output', 'csv');
      return u.toString();
    }
    // ensure output=csv for /pub
    if (u.pathname.endsWith('/pub')) {
      u.searchParams.set('output', 'csv');
      return u.toString();
    }
    // already csv or export? leave as-is
    if (u.searchParams.get('output') === 'csv') return u.toString();
    return url;
  } catch (_) { return url; }
}

function withCorsProxy(url) {
  if (!url) return null;
  // Use a generic CORS proxy for GitHub Pages hosting (no backend)
  // You can change this to your own proxy if needed.
  const proxied = `https://corsproxy.io/?${encodeURIComponent(url)}`;
  return proxied;
}

function inferColumn(headers, candidates) {
  const lower = headers.map(h => (h || '').toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.findIndex(h => h === c || h.includes(c));
    if (i !== -1) return i;
  }
  return -1;
}

function romanizeLocal(text) {
  try { return romanizeThai(text); } catch (_) { return ''; }
}

function candidatesFor(url) {
  // Multiple proxy candidates to survive iOS Safari quirks
  return [
    url, // direct (may fail due to CORS, but cheap to try)
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    `https://cors.isomorphic-git.org/${url}`,
    `https://corsproxy.io/?${encodeURIComponent(url)}`
  ];
}

function fetchWithTimeout(resource, opts = {}) {
  const { timeout = 8000, ...rest } = opts;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(resource, { ...rest, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function fetchDeck({ sheetUrl, useProxy = true }) {
  const normalized = toCsvUrl(sheetUrl || DEFAULT_SHEET_URL);
  const attempts = useProxy ? candidatesFor(normalized) : [normalized];
  let text = null;
  let lastErr = null;
  for (const url of attempts) {
    try {
      const res = await fetchWithTimeout(url, { headers: { 'cache-control': 'no-cache' }, cache: 'no-store', timeout: 8000 });
      if (!res.ok) { lastErr = new Error(`Fetch failed ${res.status}`); continue; }
      text = await res.text();
      if (text && text.length > 0) break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!text) throw lastErr || new Error('Unable to fetch deck');
  const rows = parseCSV(text);
  if (!rows.length) throw new Error('Sheet is empty');

  // normalize headers
  let headers = rows[0].map(h => String(h || '').replace(/^\ufeff/, '').replace(/\"/g, '').trim().toLowerCase());
  const thaiIdx = inferColumn(headers, ['thai', 'th']);
  const engIdx = inferColumn(headers, ['english', 'en', 'meaning', 'translation']);
  const romIdx = inferColumn(headers, ['roman', 'romanization', 'rtgs', 'pronunciation']);
  if (thaiIdx === -1 || engIdx === -1) {
    throw new Error('Could not detect Thai/English columns');
  }

  const dataRows = rows.slice(1).filter(r => r && (r[thaiIdx] || '').trim() && (r[engIdx] || '').trim());
  const deck = dataRows.map(r => {
    const thai = (r[thaiIdx] || '').trim();
    const en = (r[engIdx] || '').trim();
    const roman = romIdx !== -1 ? (r[romIdx] || '').trim() : romanizeLocal(thai);
    return { thai, en, roman };
  }).filter(d => d.thai && d.en);

  // dedupe by thai
  const seen = new Set();
  const deduped = [];
  for (const d of deck) {
    if (seen.has(d.thai)) continue;
    seen.add(d.thai);
    deduped.push(d);
  }

  return deduped;
}

function getInitialSheetUrl() {
  const fromQuery = new URLSearchParams(location.search).get('sheet');
  if (fromQuery) return fromQuery;
  const stored = localStorage.getItem('sheet-url');
  if (stored) return stored;
  return DEFAULT_SHEET_URL;
}

