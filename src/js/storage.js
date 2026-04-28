const KEYS = {
  progress: 'yt_research_progress',
  streak: 'yt_research_streak',
  lastSeen: 'yt_research_last_seen',
  reminderTime: 'yt_reminder_time',
  lastPractice: 'yt_last_practice',
  practiceDays: 'yt_practice_days',
  workerUrl: 'kru_noi_worker_url',
  llmProvider: 'kru_noi_llm_provider',
  llmModel: 'kru_noi_llm_model',
};

export function getWorkerUrl() {
  return localStorage.getItem(KEYS.workerUrl) || 'https://thai-learning-proxy.lindnermanuel1992.workers.dev';
}

export function setWorkerUrl(url) {
  localStorage.setItem(KEYS.workerUrl, url);
}

export function getLlmProvider() {
  return localStorage.getItem(KEYS.llmProvider) || 'anthropic';
}

export function setLlmProvider(provider) {
  localStorage.setItem(KEYS.llmProvider, provider === 'openai' ? 'openai' : 'anthropic');
}

export function getLlmModel() {
  const provider = getLlmProvider();
  const saved = localStorage.getItem(KEYS.llmModel);
  if (saved) return saved;
  return provider === 'openai' ? 'gpt-4.1-mini' : 'claude-haiku-4-5-20251001';
}

export function setLlmModel(model) {
  localStorage.setItem(KEYS.llmModel, model.trim());
}

export function getProgress() {
  return JSON.parse(localStorage.getItem(KEYS.progress) || '{}');
}

export function saveProgress(progress) {
  localStorage.setItem(KEYS.progress, JSON.stringify(progress));
}

export function getReminderTime() {
  return localStorage.getItem(KEYS.reminderTime) || '20:00';
}

export function setReminderTime(time) {
  localStorage.setItem(KEYS.reminderTime, time);
}

function dateKey(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function getPracticeDays() {
  return JSON.parse(localStorage.getItem(KEYS.practiceDays) || '{}');
}

export function markPracticed() {
  const today = new Date();
  const days = getPracticeDays();
  days[dateKey(today)] = true;
  localStorage.setItem(KEYS.practiceDays, JSON.stringify(days));
  localStorage.setItem(KEYS.lastPractice, today.toDateString());
}

export function hasPracticedToday() {
  return localStorage.getItem(KEYS.lastPractice) === new Date().toDateString();
}

export function getWeakWords(vocab, progress, limit = 8) {
  return vocab.words
    .filter(w => (progress[w.id]?.failures || 0) > 0)
    .sort((a, b) => (progress[b.id]?.failures || 0) - (progress[a.id]?.failures || 0))
    .slice(0, limit);
}

export function clearProgress() {
  localStorage.removeItem(KEYS.progress);
  localStorage.removeItem(KEYS.streak);
  localStorage.removeItem(KEYS.lastSeen);
  localStorage.removeItem(KEYS.practiceDays);
}

export function getStreak() {
  const today = new Date().toDateString();
  const lastSeen = localStorage.getItem(KEYS.lastSeen);
  const streak = parseInt(localStorage.getItem(KEYS.streak) || '0');
  if (lastSeen === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (lastSeen === yesterday) {
    const newStreak = streak + 1;
    localStorage.setItem(KEYS.streak, newStreak);
    localStorage.setItem(KEYS.lastSeen, today);
    return newStreak;
  }
  localStorage.setItem(KEYS.streak, '1');
  localStorage.setItem(KEYS.lastSeen, today);
  return 1;
}

export function exportProgressCSV(vocab) {
  const progress = getProgress();
  const rows = [['id', 'thai', 'english', 'interval', 'easeFactor', 'nextReview', 'reviews']];
  vocab.words.forEach(w => {
    const p = progress[w.id] || {};
    rows.push([w.id, w.thai, w.english, p.interval || 0, p.easeFactor || 2.5, p.nextReview || '', p.reviews || 0]);
  });
  return rows.map(r => r.join(',')).join('\n');
}
