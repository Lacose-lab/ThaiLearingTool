const KEYS = {
  progress: 'yt_research_progress',
  apiKey: 'yt_research_api_key',
  streak: 'yt_research_streak',
  lastSeen: 'yt_research_last_seen',
  reminderTime: 'yt_reminder_time',
  lastPractice: 'yt_last_practice',
};

export function getApiKey() {
  return localStorage.getItem(KEYS.apiKey) || '__ANTHROPIC_API_KEY__';
}

export function saveApiKey(key) {
  localStorage.setItem(KEYS.apiKey, key);
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

export function markPracticed() {
  localStorage.setItem(KEYS.lastPractice, new Date().toDateString());
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
