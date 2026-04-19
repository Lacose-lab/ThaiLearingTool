import { fetchLiveVocab } from './sheets.js';
import { getReminderTime, hasPracticedToday, getProgress } from './storage.js';

let vocab = null;
let currentTab = 'home';
const tabs = {};

async function loadVocab() {
  const res = await fetch('src/data/vocab.json');
  vocab = await res.json();
}

async function loadTab(name) {
  if (!tabs[name]) {
    const mod = await import(`./${name}.js`);
    tabs[name] = mod;
  }
  return tabs[name];
}

async function showTab(name) {
  currentTab = name;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  const content = document.getElementById('content');
  content.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading\u2026</div>';
  const mod = await loadTab(name);
  mod.render(content, vocab);
}

document.getElementById('bottom-nav').addEventListener('click', e => {
  const btn = e.target.closest('.nav-btn');
  if (btn) showTab(btn.dataset.tab);
});

// Register service worker
async function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('/ThaiLearingTool/sw.js');
  } catch {}
}

// Schedule a daily reminder notification
function scheduleReminder() {
  if (Notification.permission !== 'granted') return;
  if (hasPracticedToday()) return;

  const [hh, mm] = getReminderTime().split(':').map(Number);
  const now = new Date();
  const fire = new Date();
  fire.setHours(hh, mm, 0, 0);

  const delay = fire - now;
  if (delay <= 0) {
    // Already past reminder time today and haven't practiced — show now
    showReminderNotification();
    return;
  }

  setTimeout(() => {
    if (!hasPracticedToday()) showReminderNotification();
  }, delay);
}

function showReminderNotification() {
  if (Notification.permission !== 'granted') return;
  if (!navigator.serviceWorker.controller) {
    // Fallback if SW not controlling yet
    new Notification('ครูน้อย — Time to practice! \uD83C\uDDF9\uD83C\uDDED', {
      body: 'Your Thai words are waiting. Keep the streak going \u0E04\u0E23\u0E31\u0E1A!',
      icon: '/ThaiLearingTool/icon.svg',
      tag: 'kru-noi-daily',
    });
    return;
  }
  navigator.serviceWorker.controller.postMessage({
    type: 'SHOW_REMINDER',
    title: 'ครูน้อย — Time to practice! 🇹🇭',
    body: 'Your Thai words are waiting. Keep the streak going ครับ!',
  });
}

async function init() {
  await registerSW();
  await loadVocab();
  showTab('home');
  scheduleReminder();

  // Live sheet sync in background — refreshes current tab if word count changed
  fetchLiveVocab(vocab).then(live => {
    if (live.words.length !== vocab.words.length) {
      vocab = live;
      showTab(currentTab);
    } else {
      vocab = live;
    }
  });
}

init();
