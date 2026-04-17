const WORDRECAP_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTbVBGDEoEZGkzT9IXpUUdgfSzldlHB1-54IMjZL6G1Rdo3RPpej6OXSSXVyxBHO_dFB9R_wlOMCoBE/pub?output=csv';

const LAST_SYNC_KEY = 'yt_research_last_sync';

const CATEGORY_MAP = {
  'คำกริยา': 'verbs', 'คำนาม': 'nouns', 'คำคุณศัพท์': 'adjectives',
  'คำถาม': 'question', 'ตัวเลข': 'numbers', 'วันใน1สัปดาห์': 'days',
  'เดือน': 'months', 'ร่างกาย': 'body', 'อาหาร': 'food',
  'เครื่องดื่ม': 'drinks', 'สี': 'colors', 'สถานที่': 'places',
  'การเดินทาง': 'transport', 'ทั่วไป': 'general',
};

function parseCSVRow(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function isThai(text) {
  return /[\u0E00-\u0E7F]/.test(text);
}

export function getLastSync() {
  const ts = localStorage.getItem(LAST_SYNC_KEY);
  return ts ? new Date(parseInt(ts)) : null;
}

export async function fetchLiveVocab(fallback) {
  try {
    const res = await fetch(WORDRECAP_URL, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const lines = text.split('\n').filter(l => l.trim());
    const parsed = [];
    let category = 'general';
    const seen = new Set();

    for (const line of lines) {
      const cols = parseCSVRow(line);
      const thai = cols[0] || '';
      const english = cols[1] || '';
      const german = cols[2] || '';
      const notes = cols[3] || '';

      if (!thai || !isThai(thai)) continue;
      if (CATEGORY_MAP[thai]) { category = CATEGORY_MAP[thai]; continue; }
      if (!english || seen.has(thai)) continue;

      seen.add(thai);
      parsed.push({ thai, english, german, notes, category, source: 'Wordrecap' });
    }

    if (parsed.length < 10) throw new Error('Too few words parsed — aborting');

    // Assign stable IDs: reuse existing ID if Thai text matches, else assign new
    const existingById = {};
    for (const w of fallback.words) existingById[w.thai] = w.id;
    let nextId = fallback.words.length ? Math.max(...fallback.words.map(w => w.id)) + 1 : 1;

    const words = parsed.map(w => ({
      ...w,
      id: existingById[w.thai] !== undefined ? existingById[w.thai] : nextId++,
    }));

    localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    return { ...fallback, words };
  } catch (e) {
    console.warn('[sheets] Live fetch failed, using cached vocab:', e.message);
    return fallback;
  }
}
