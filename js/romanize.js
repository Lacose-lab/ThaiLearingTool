// Simplified Thai romanization (approximate RTGS). Not phoneme-perfect,
// but provides readable hints when a romanization column is absent.
// For best accuracy, supply a 'romanization' column in your sheet.

function romanizeThai(input) {
  if (!input) return '';
  const map = {
    // consonants
    'ก':'k','ข':'kh','ฃ':'kh','ค':'kh','ฅ':'kh','ฆ':'kh','ง':'ng','จ':'ch','ฉ':'ch','ช':'ch','ซ':'s','ฌ':'ch',
    'ญ':'y','ย':'y','ฎ':'d','ฏ':'t','ฐ':'th','ฑ':'th','ฒ':'th','ด':'d','ต':'t','ถ':'th','ท':'th','ธ':'th',
    'น':'n','บ':'b','ป':'p','ผ':'ph','พ':'ph','ภ':'ph','ฝ':'f','ฟ':'f','ม':'m','ห':'h','ฮ':'h','ร':'r','ล':'l','ว':'w','ฬ':'l',
    'ศ':'s','ษ':'s','ส':'s','อ':'o', // 'อ' as carrier approximated to 'o'
    'ฤ':'rue','ฦ':'lue',
    // vowels and signs
    'ะ':'a','า':'a','ั':'a','ิ':'i','ี':'i','ึ':'ue','ื':'ue','ุ':'u','ู':'u','เ':'e','แ':'ae','โ':'o','ใ':'ai','ไ':'ai','ำ':'am'
  };
  // Remove silent mark and tone marks
  const stripRe = /[\u0E3A\u0E4C-\u0E4E]/g; // phinthu, thanthakhat, nikkhahit, yamakkan
  const s = input.replace(stripRe, '');
  let out = '';
  for (const ch of s) {
    out += (map[ch] !== undefined) ? map[ch] : ch;
  }
  // collapse repeats like 'aaaa' → 'aa'
  out = out.replace(/([aouiey])\1{2,}/g, '$1$1');
  return out;
}

