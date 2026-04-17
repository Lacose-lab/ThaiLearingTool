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
  '\u0E30':'a', '\u0E31':'a', '\u0E32':'a',   // ะ ั า
  '\u0E34':'i', '\u0E35':'i',                  // ิ ี
  '\u0E36':'ue','\u0E37':'ue',                 // ึ ื
  '\u0E38':'u', '\u0E39':'u',                  // ุ ู
  '\u0E47':'',                                 // ็
  '\u0E48':'','\u0E49':'','\u0E4A':'','\u0E4B':'', // tone marks
  '\u0E4C':'',                                 // ์ silencer
  '\u0E4D':'m',                                // ํ nikhahit
  '\u0E46':'...',                              // ๆ repetition
};

// เ แ โ ใ ไ — appear before the consonant they belong to
const LEADING = {
  '\u0E40':'e', '\u0E41':'ae', '\u0E42':'o',
  '\u0E43':'ai','\u0E44':'ai',
};

export function romanize(text) {
  const chars = [...text];
  let out = '';
  let i = 0;
  while (i < chars.length) {
    const ch = chars[i];
    if (LEADING[ch] !== undefined) {
      const vow = LEADING[ch];
      i++;
      if (i < chars.length && C[chars[i]] !== undefined) {
        out += C[chars[i]] + vow;
        i++;
      } else {
        out += vow;
      }
    } else if (C[ch] !== undefined) {
      out += C[ch]; i++;
    } else if (V[ch] !== undefined) {
      out += V[ch]; i++;
    } else if (ch === ' ' || ch === '\n') {
      out += ch; i++;
    } else {
      i++;
    }
  }
  return out || text;
}
