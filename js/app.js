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
  qQ.textContent = `What does "${currentCard.thai}" mean?`;
  let opts = [currentCard.en];
  while (opts.length < 4 && opts.length < deck.length) {
    const cand = deck[Math.floor(Math.random() * deck.length)].en;
    if (!opts.includes(cand)) opts.push(cand);
  }
  opts = opts.sort(() => Math.random() - 0.5);
  qOpts.innerHTML = '';
  opts.forEach(opt => {
    const b = document.createElement('button');
    b.className = 'w-full px-3 py-3 border rounded bg-white active:scale-[.99]';
    b.textContent = opt;
    b.onclick = () => {
      if (opt === currentCard.en) {
        b.classList.add('bg-green-200');
        reviewState.stats.correct++;
        schedule(currentCard, 5);
      } else {
        b.classList.add('bg-red-200');
        schedule(currentCard, 1);
      }
      reviewState.stats.seen++;
      saveState();
      updateStats();
      setTimeout(nextQuiz, 450);
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

const settingsDlg = document.getElementById('settings');
document.getElementById('settings-btn')?.addEventListener('click', () => {
  const input = document.getElementById('sheet-url');
  input.value = localStorage.getItem('sheet-url') || getInitialSheetUrl() || '';
  settingsDlg.showModal();
});
document.getElementById('save-settings')?.addEventListener('click', () => {
  const url = document.getElementById('sheet-url').value.trim();
  if (url) localStorage.setItem('sheet-url', url);
});

async function init() {
  updateStats();
  const sheetUrl = getInitialSheetUrl();
  try {
    statusEl.textContent = 'Syncing deck…';
    deck = await fetchDeck({ sheetUrl, useProxy: true });
    statusEl.textContent = `Loaded ${deck.length} words`;
    // show flashcards by default
    document.getElementById('flash-btn').click();
  } catch (e) {
    console.error(e);
    statusEl.textContent = 'Failed to load deck. Open Settings to fix the URL.';
  }
}

init();

