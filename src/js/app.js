import { fetchLiveVocab } from './sheets.js';

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

async function init() {
  await loadVocab();
  showTab('home');

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
