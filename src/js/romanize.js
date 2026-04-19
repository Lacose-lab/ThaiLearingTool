// Approximate RTGS romanization for Thai. Handles syllable-level vowel patterns
// for the most common cases; output is readable guidance, not linguistically perfect.

const C = {
  'ก':'k','ข':'kh','ค':'kh','ฆ':'kh','ง':'ng',
  'จ':'ch','ฉ':'ch','ช':'ch','ซ':'s','ฌ':'ch',
  'ญ':'y','ฎ':'d','ฏ':'t','ฐ':'th','ฑ':'th',
  'ฒ':'th','ณ':'n','ด':'d','ต':'t','ถ':'th',
  'ท':'th','ธ':'th','น':'n','บ':'b','ป':'p',
  'ผ':'ph','ฝ':'f','พ':'ph','ฟ':'f','ภ':'ph',
  'ม':'m','ย':'y','ร':'r','ล':'l','ว':'w',
  'ศ':'s','ษ':'s','ส':'s','ห':'h','ฬ':'l',
  'อ':'','ฮ':'h','ฃ':'kh','ฅ':'kh',
};

const V = {
  '\u0E30':'a',  // ะ
  '\u0E31':'a',  // ั
  '\u0E32':'a',  // า
  '\u0E34':'i',  // ิ
  '\u0E35':'i',  // ี
  '\u0E36':'ue', // ึ
  '\u0E37':'ue', // ื
  '\u0E38':'u',  // ุ
  '\u0E39':'u',  // ู
  '\u0E47':'',   // ็
  '\u0E48':'','\u0E49':'','\u0E4A':'','\u0E4B':'', // tone marks
  '\u0E4C':'',   // ์ silencer
  '\u0E4D':'m',  // ํ nikhahit
  '\u0E46':'...', // ๆ repetition
};

// Leading vowels — appear before the consonant they modify
const LEADING = {
  '\u0E40':'e',  // เ
  '\u0E41':'ae', // แ
  '\u0E42':'o',  // โ
  '\u0E43':'ai', // ใ
  '\u0E44':'ai', // ไ
};

const TONES = new Set(['\u0E48','\u0E49','\u0E4A','\u0E4B','\u0E47']); // ่้๊๋็

function skipTones(chars, j) {
  while (j < chars.length && TONES.has(chars[j])) j++;
  return j;
}

export function romanize(text) {
  const chars = [...text];
  const out = [];
  let i = 0;

  while (i < chars.length) {
    const ch = chars[i];

    if (LEADING[ch] !== undefined) {
      const lead = ch;
      const leadVow = LEADING[ch];
      i++;

      // Consume consonant
      let cons = '';
      if (i < chars.length && C[chars[i]] !== undefined) {
        cons = C[chars[i]];
        i++;
      }

      // Skip tone marks between consonant and following vowel chars
      i = skipTones(chars, i);

      // Compound patterns after เ
      if (lead === '\u0E40') {
        if (i < chars.length && chars[i] === '\u0E32') {
          // เ-า = "ao"  (เกา, เขา, เดา)
          out.push(cons + 'ao'); i++;
        } else if (i < chars.length && chars[i] === '\u0E37') {
          // เ-ื... check for เ-ือ = "ua"
          i++; i = skipTones(chars, i);
          if (i < chars.length && chars[i] === '\u0E2D') { // อ
            out.push(cons + 'ua'); i++; // เ-ือ
          } else {
            out.push(cons + 'ue');      // เ-ื (rare)
          }
        } else if (i < chars.length && (chars[i] === '\u0E35' || chars[i] === '\u0E34')) {
          // เ-ี or เ-ิ — check for เ-ีย = "ia"
          const vv = V[chars[i]]; i++;
          i = skipTones(chars, i);
          if (i < chars.length && chars[i] === '\u0E22') { // ย
            out.push(cons + 'ia'); i++; // เ-ีย
          } else {
            out.push(cons + (vv || 'i'));
          }
        } else if (i < chars.length && chars[i] === '\u0E2D') {
          // เ-อ = "oe" (เดอ, เกอ)
          i++; i = skipTones(chars, i);
          if (i < chars.length && chars[i] === '\u0E30') { // ะ → เอะ = "e"
            out.push(cons + 'e'); i++;
          } else {
            out.push(cons + 'oe');
          }
        } else {
          out.push(cons + leadVow);
        }
      } else {
        out.push(cons + leadVow);
      }

    } else if (C[ch] !== undefined) {
      const cons = C[ch];
      i++;

      // Peek ahead (skip tones) for compound suffix patterns
      const j = skipTones(chars, i);
      if (j < chars.length && chars[j] === '\u0E32') {
        // Consume tone marks + า
        i = j + 1;
        const k = skipTones(chars, i);
        if (k < chars.length && chars[k] === '\u0E27') {
          // า + ว = "ao"  (ขาว, เดาว, ราว)
          out.push(cons + 'ao'); i = k + 1;
        } else if (k < chars.length && chars[k] === '\u0E22') {
          // า + ย = "ai"  (กาย, ตาย)
          out.push(cons + 'ai'); i = k + 1;
        } else {
          out.push(cons + 'a');
        }
      } else if (j < chars.length && chars[j] === '\u0E31') {
        // ั — check ัว = "ua", ัย = "ai"
        i = j + 1;
        const k = skipTones(chars, i);
        if (k < chars.length && chars[k] === '\u0E27') {
          out.push(cons + 'ua'); i = k + 1;
        } else if (k < chars.length && chars[k] === '\u0E22') {
          out.push(cons + 'ai'); i = k + 1;
        } else {
          out.push(cons + 'a');
        }
      } else {
        out.push(cons);
      }

    } else if (V[ch] !== undefined) {
      // Standalone vowel chars (ิ ี า ุ ู etc.)
      const val = V[ch];
      i++;
      if (val === 'a' || val === '') {
        // า — check for าว = ao, าย = ai suffix
        const j = skipTones(chars, i);
        if (j < chars.length && chars[j] === '\u0E27') {
          out.push('ao'); i = j + 1;
        } else if (j < chars.length && chars[j] === '\u0E22') {
          out.push('ai'); i = j + 1;
        } else {
          out.push(val);
        }
      } else {
        out.push(val);
      }
    } else if (ch === ' ' || ch === '\n') {
      out.push(ch); i++;
    } else {
      i++; // skip unknown (punctuation, numbers)
    }
  }

  const result = out.join('').replace(/\s+/g, ' ').trim();
  return result || text;
}
