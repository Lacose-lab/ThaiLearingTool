// App state and UI logic
let deck = [];

// SRS state
let reviewState = JSON.parse(localStorage.getItem('thai-srs') || '{}');
if (!reviewState.cards) {
  reviewState = { cards: {}, stats: { seen: 0, correct: 0 } };
}
function saveState() { localStorage.setItem('thai-srs', JSON.stringify(reviewState)); }

function schedule(card, grade) {
  const now = Date.now();
  if (!reviewState.cards[card.thai]) {
    reviewState.cards[card.thai] = { ease: 2.5, interval: 1, due: now, streak: 0 };
  }
  const st = reviewState.cards[card.thai];
  if (grade < 3) { st.interval = 1; st.streak = 0; }
  else {
    st.streak = (st.streak || 0) + 1;
    if (st.streak === 1) st.interval = 1;
    else if (st.streak === 2) st.interval = 6;
    else st.interval = Math.round(st.interval * st.ease);
  }
  st.ease = Math.max(1.3, st.ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));
  st.due = now + st.interval * 24 * 3600 * 1000;
  saveState();
}

// UI elements
const flashEl = document.getElementById('flashcard');
const thaiEl = document.getElementById('thai-word');
const romanEl = document.getElementById('romanization');
const transEl = document.getElementById('translation');
const quizEl = document.getElementById('quiz');
const qQ = document.getElementById('quiz-question');
const qOpts = document.getElementById('quiz-options');
const ttsFrontBtn = document.getElementById('tts-front');
const ttsBackBtn = document.getElementById('tts-back');
const ttsQuizBtn = document.getElementById('tts-quiz');
const statusEl = document.getElementById('status');

let currentCard = null;
let showRoman = true;

function updateStats() {
  const { seen, correct } = reviewState.stats;
  const acc = seen ? Math.round((correct / seen) * 100) : 0;
  document.getElementById('stats').textContent = `Seen: ${seen} | Correct: ${correct} | Accuracy: ${acc}%`;
}

function nextFlashcard() {
  const due = deck.filter(c => {
    const st = reviewState.cards[c.thai];
    return !st || st.due <= Date.now();
  });
  if (due.length === 0 && deck.length) {
    statusEl.textContent = 'All cards scheduled for later. Tap Reset or use Quiz.';
    return;
  }
  currentCard = due[Math.floor(Math.random() * due.length)];
  thaiEl.textContent = currentCard?.thai || '';
  romanEl.textContent = showRoman ? (currentCard?.roman || '') : '';
  transEl.textContent = currentCard?.en || '';
  flashEl.classList.remove('flipped');
}

flashEl?.addEventListener('click', () => {
  flashEl.classList.toggle('flipped');
  if (flashEl.classList.contains('flipped') && currentCard) {
    schedule(currentCard, 4);
    updateStats();
  }
});

function nextQuiz() {
  if (!deck.length) return;
  currentCard = deck[Math.floor(Math.random() * deck.length)];
  qQ.textContent = currentCard.thai;
  let opts = [currentCard.en];
  while (opts.length < 4 && opts.length < deck.length) {
    const cand = deck[Math.floor(Math.random() * deck.length)].en;
    if (!opts.includes(cand)) opts.push(cand);
  }
  opts = opts.sort(() => Math.random() - 0.5);
  qOpts.innerHTML = '';
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'quiz-option w-full px-4 py-5 text-lg sm:text-xl rounded-2xl shadow hover:shadow-md active:scale-[.99] text-left border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100';
    const span = document.createElement('span');
    span.className = 'inline-block w-full';
    span.textContent = opt;
    b.appendChild(span);
    b.dataset.correct = String(opt === currentCard.en);
    b.onclick = () => {
      // Disable all buttons to prevent double answers
      Array.from(qOpts.children).forEach(btn => {
        btn.disabled = true;
        btn.classList.add('pointer-events-none');
      });

      const isCorrect = opt === currentCard.en;
      if (isCorrect) {
        b.classList.add('correct');
        haptic('success');
        reviewState.stats.correct++;
        schedule(currentCard, 5);
      } else {
        b.classList.add('wrong');
        span.classList.add('animate-shake');
        haptic('error');
        // Highlight the correct answer
        const correctBtn = Array.from(qOpts.children).find(btn => btn.dataset.correct === 'true');
        if (correctBtn) {
          correctBtn.classList.add('correct');
        }
        schedule(currentCard, 1);
      }
      reviewState.stats.seen++;
      saveState();
      updateStats();
      setTimeout(nextQuiz, isCorrect ? 450 : 900);
    };
    qOpts.appendChild(b);
  });
}

// Nav and settings
document.getElementById('flash-btn')?.addEventListener('click', () => {
  quizEl.classList.add('hidden');
  flashEl.classList.remove('hidden');
  nextFlashcard();
});
document.getElementById('quiz-btn')?.addEventListener('click', () => {
  flashEl.classList.add('hidden');
  quizEl.classList.remove('hidden');
  nextQuiz();
});
document.getElementById('reset-btn')?.addEventListener('click', () => {
  reviewState = { cards: {}, stats: { seen: 0, correct: 0 } };
  saveState(); updateStats();
  statusEl.textContent = 'Progress reset.';
});
document.getElementById('toggle-roman')?.addEventListener('change', (e) => {
  showRoman = !!e.target.checked;
  romanEl.textContent = showRoman ? (currentCard?.roman || '') : '';
});

// Text-to-Speech (Thai)
let ttsPending = null;
function speakThai(text) {
  if (!text || !('speechSynthesis' in window)) return;
  const synth = window.speechSynthesis;
  // Some browsers load voices asynchronously; if none yet, retry shortly
  const voices = synth.getVoices();
  if (!voices || voices.length === 0) {
    clearTimeout(ttsPending);
    ttsPending = setTimeout(() => speakThai(text), 200);
    return;
  }
  const utter = new SpeechSynthesisUtterance(text);
  const th = voices.find(v => v.lang?.toLowerCase().startsWith('th')) || voices.find(v => v.lang?.toLowerCase().includes('th'));
  if (th) utter.voice = th;
  utter.lang = th?.lang || 'th-TH';
  utter.rate = 0.95;
  utter.pitch = 1.0;
  try { synth.cancel(); } catch (_) {}
  synth.speak(utter);
}

// Some browsers load voices asynchronously; warm them up
if ('speechSynthesis' in window) {
  // trigger voices to load
  window.speechSynthesis.getVoices();
}

ttsFrontBtn?.addEventListener('click', (e) => { e.stopPropagation(); speakThai(currentCard?.thai); });
ttsBackBtn?.addEventListener('click', (e) => { e.stopPropagation(); speakThai(currentCard?.thai); });
ttsQuizBtn?.addEventListener('click', () => speakThai(currentCard?.thai));

// Haptics (Android/Chromium). iOS Safari does not support vibrate.
function haptic(kind) {
  if (!('vibrate' in navigator)) return;
  if (kind === 'success') navigator.vibrate(20);
  else if (kind === 'error') navigator.vibrate([15, 30, 15]);
}

// Swipe gestures on flashcards
let touchStartX = 0, touchStartY = 0, isSwiping = false;
const SWIPE_THRESHOLD = 50; // px
flashEl?.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX; touchStartY = t.clientY; isSwiping = true;
});
flashEl?.addEventListener('touchmove', (e) => {
  if (!isSwiping) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX; const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy)) {
    e.preventDefault(); // horizontal intent
  }
});
flashEl?.addEventListener('touchend', (e) => {
  if (!isSwiping || !currentCard) return;
  isSwiping = false;
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX; const dy = t.clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > SWIPE_THRESHOLD) {
    if (dx > 0) {
      // swipe right: easy
      schedule(currentCard, 5); haptic('success');
    } else {
      // swipe left: hard
      schedule(currentCard, 2); haptic('error');
    }
    updateStats();
    nextFlashcard();
  }
});

// Theme: system + toggle with animated thumb
const themeBtn = document.getElementById('theme-btn');
const themeThumb = themeBtn ? themeBtn.querySelector('.thumb') : null;
function applyTheme() {
  const pref = localStorage.getItem('theme');
  const systemDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = pref ? (pref === 'dark') : systemDark;
  document.documentElement.classList.toggle('dark', dark);
  if (themeBtn) themeBtn.setAttribute('aria-pressed', dark ? 'true' : 'false');
  if (themeThumb) {
    themeThumb.classList.toggle('translate-x-6', dark);
    themeThumb.classList.toggle('translate-x-0', !dark);
  }
}
if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const current = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', current ? 'light' : 'dark');
    applyTheme();
  });
}
if (window.matchMedia) {
  const mm = window.matchMedia('(prefers-color-scheme: dark)');
  if (mm.addEventListener) {
    mm.addEventListener('change', () => { if (!localStorage.getItem('theme')) applyTheme(); });
  } else if (mm.addListener) {
    mm.addListener(() => { if (!localStorage.getItem('theme')) applyTheme(); });
  }
}
try { applyTheme(); } catch (_) {}  updateStats();
  const sheetUrl = getInitialSheetUrl();
  try {
    statusEl.textContent = 'Syncing deck...';
    deck = await fetchDeck({ sheetUrl, useProxy: true });
    // Ensure romanization fallback for any missing fields
    deck = deck.map(d => ({ ...d, roman: d.roman && d.roman.trim() ? d.roman : (typeof romanizeThai === 'function' ? romanizeThai(d.thai) : '') }));
    try { localStorage.setItem('last-deck', JSON.stringify(deck)); } catch (_) {}
    statusEl.textContent = `Loaded ${deck.length} words`;
    // default to Quiz view
    document.getElementById('quiz-btn').click();
  } catch (e) {
    console.error(e);
    // Fallback to cached deck if available
    try {
      const cached = JSON.parse(localStorage.getItem('last-deck') || '[]');
      if (cached.length) {
        deck = cached;
        statusEl.textContent = `Loaded ${deck.length} words (cached)`;
        document.getElementById('quiz-btn').click();
        return;
      }
    } catch(_) {}
    statusEl.textContent = 'Failed to load deck. Open Settings to fix the URL.';
  }
}

init();


