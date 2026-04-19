export function getDefaultCard() {
  return { interval: 0, easeFactor: 2.5, nextReview: null, reviews: 0 };
}

export function updateCard(card, quality) {
  // quality: 0=fail, 1=hard, 2=good, 3=easy
  const c = { ...card };
  c.reviews = (c.reviews || 0) + 1;

  if (quality < 1) {
    c.interval = 1;
    c.easeFactor = Math.max(1.3, (c.easeFactor || 2.5) - 0.2);
    c.failures = (c.failures || 0) + 1;
  } else {
    const ef = c.easeFactor || 2.5;
    if (!c.interval || c.interval === 0) c.interval = 1;
    else if (c.interval === 1) c.interval = 6;
    else c.interval = Math.round(c.interval * ef);

    const efDelta = 0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02);
    c.easeFactor = Math.max(1.3, ef + efDelta);
  }

  const next = new Date();
  next.setDate(next.getDate() + c.interval);
  c.nextReview = next.toISOString().split('T')[0];
  return c;
}

export function isDue(card) {
  if (!card || !card.nextReview) return true;
  return card.nextReview <= new Date().toISOString().split('T')[0];
}

export function getDueWords(vocab, progress) {
  return vocab.words.filter(w => isDue(progress[w.id]));
}
