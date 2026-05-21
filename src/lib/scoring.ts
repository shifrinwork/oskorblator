export function scoreInsult(insult: string): number {
  if (!insult || insult.trim().length < 2) return 0;

  const text = insult.trim();
  let score = 12;

  // Length bonus (sweet spot 30–180 chars)
  const len = text.length;
  if (len >= 10) score += Math.min(20, Math.floor(len / 7));
  if (len > 200) score -= Math.floor((len - 200) / 15);

  // Word richness
  const words = text.split(/\s+/).filter((w) => w.length > 1);
  score += Math.min(12, words.length * 1.3);

  // Uppercase letters (Russian + Latin) = emotional intensity
  const upperMatches = text.match(/[А-ЯA-Z]/g) || [];
  score += Math.min(10, upperMatches.length * 0.6);

  // Entire words in CAPS = SCREAMING
  const capsWords = words.filter(
    (w) => w.length > 2 && w === w.toUpperCase() && /[А-ЯA-Z]/.test(w)
  );
  score += Math.min(20, capsWords.length * 7);

  // Punctuation violence
  const exclamations = (text.match(/!/g) || []).length;
  score += Math.min(12, exclamations * 4);

  // Dramatic pause
  if (text.includes("...")) score += 4;

  // Multi-punctuation combo !!! ???
  if (/[!?]{2,}/.test(text)) score += 5;

  // Deterministic pseudo-random variance based on content hash
  // (same text always gets same score bonus — no server needed)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (((hash << 5) - hash + text.charCodeAt(i)) | 0);
  }
  const variance = (Math.abs(hash) % 22) - 8; // -8 to +13
  score += variance;

  return Math.max(1, Math.min(100, Math.round(score)));
}

export const BOT_INSULTS = [
  { text: "Ты немного неприятный человечек.", baseScore: 14 },
  { text: "Твой интеллект оставляет желать лучшего.", baseScore: 22 },
  { text: "Ты такой серый, что даже стены не смотрят в твою сторону!", baseScore: 35 },
  { text: "Твои мысли — это не идеи, это помехи в эфире!", baseScore: 45 },
  { text: "Ты настолько скучный, что даже зевота засыпает рядом с тобой!", baseScore: 55 },
  { text: "Твоя голова — не для думания, она просто для хранения шапки!", baseScore: 63 },
  { text: "Ты такой тупой, что можешь споткнуться о беспроводной интернет!", baseScore: 70 },
  { text: "ПРИРОДА СДЕЛАЛА ТЕБЯ ШЕДЕВРОМ АБСОЛЮТНОЙ БЕСПОЛЕЗНОСТИ!", baseScore: 78 },
  {
    text: "Ты — живое доказательство того, что эволюция иногда делает шаг назад... два шага... и падает в яму!",
    baseScore: 86,
  },
  {
    text: "ТЫ НАСТОЛЬКО НИЧТОЖЕН, ЧТО ДАЖЕ ТВОЯ ТЕНЬ СТЕСНЯЕТСЯ ТЕБЯ СОПРОВОЖДАТЬ!!!",
    baseScore: 94,
  },
];

export function getBotInsult(playerScore: number): { text: string; score: number } {
  // Bot tries to be competitive — win roughly 50% of the time
  const targetScore = Math.max(
    5,
    Math.min(99, playerScore + Math.floor(Math.random() * 31) - 15)
  );

  const sorted = [...BOT_INSULTS].sort(
    (a, b) => Math.abs(a.baseScore - targetScore) - Math.abs(b.baseScore - targetScore)
  );

  const top = sorted.slice(0, 3);
  const chosen = top[Math.floor(Math.random() * top.length)];
  const variance = Math.floor(Math.random() * 11) - 5;

  return {
    text: chosen.text,
    score: Math.max(1, Math.min(100, chosen.baseScore + variance)),
  };
}
