// ============================================================
// ОСКОРБЛЯТОР — Scoring Engine v2
// ============================================================

type WordEntry = {
  word: string;
  score: number;   // 1–10 (сила обидности)
  category: string;
};

// ── База слов ────────────────────────────────────────────────
// Русский мат и оскорбления (ядро)
const RU_WORDS: WordEntry[] = [
  // Категория: прямой мат (score 7–10)
  { word: "хуй",        score: 9,  category: "mat" },
  { word: "хуйня",      score: 8,  category: "mat" },
  { word: "хуёво",      score: 7,  category: "mat" },
  { word: "хуёвый",     score: 7,  category: "mat" },
  { word: "пизда",      score: 9,  category: "mat" },
  { word: "пиздёж",     score: 7,  category: "mat" },
  { word: "пиздатый",   score: 6,  category: "mat" },
  { word: "пиздец",     score: 8,  category: "mat" },
  { word: "ёбаный",     score: 8,  category: "mat" },
  { word: "ёбнутый",    score: 8,  category: "mat" },
  { word: "ёб",         score: 8,  category: "mat" },
  { word: "блядь",      score: 9,  category: "mat" },
  { word: "блядина",    score: 9,  category: "mat" },
  { word: "шлюха",      score: 8,  category: "mat" },
  { word: "сука",       score: 8,  category: "mat" },
  { word: "сучка",      score: 7,  category: "mat" },
  { word: "сучара",     score: 8,  category: "mat" },
  { word: "пёс",        score: 6,  category: "mat" },
  { word: "пёздрик",    score: 7,  category: "mat" },
  { word: "нахуй",      score: 8,  category: "mat" },
  { word: "похуй",      score: 7,  category: "mat" },
  { word: "охуел",      score: 8,  category: "mat" },
  { word: "охуенный",   score: 8,  category: "mat" },
  { word: "охуительный",score: 8,  category: "mat" },
  { word: "мудак",      score: 9,  category: "mat" },
  { word: "мудила",     score: 9,  category: "mat" },
  { word: "мудозвон",   score: 9,  category: "mat" },
  { word: "мудень",     score: 8,  category: "mat" },
  { word: "муда",       score: 7,  category: "mat" },
  { word: "пидор",      score: 10, category: "mat" },
  { word: "пидарас",    score: 10, category: "mat" },
  { word: "педик",      score: 9,  category: "mat" },
  { word: "ёбаный рот", score: 10, category: "mat" },
  { word: "залупа",     score: 9,  category: "mat" },
  { word: "ёб твою мать", score: 10, category: "mat" },
  { word: "иди нахуй",  score: 9,  category: "mat" },
  { word: "нафига",     score: 4,  category: "mat" },
  { word: "задрот",     score: 7,  category: "mat" },
  { word: "задница",    score: 5,  category: "mat" },
  { word: "жопа",       score: 6,  category: "mat" },
  { word: "жопоголовый",score: 8,  category: "mat" },
  { word: "жополиз",    score: 8,  category: "mat" },
  { word: "жопошник",   score: 8,  category: "mat" },
  { word: "ублюдок",    score: 9,  category: "mat" },
  { word: "ублюдина",   score: 9,  category: "mat" },
  { word: "выблядок",   score: 10, category: "mat" },
  { word: "ёбнул",      score: 7,  category: "mat" },
  { word: "долбоёб",    score: 9,  category: "mat" },
  { word: "долбанутый", score: 8,  category: "mat" },
  { word: "долбак",     score: 8,  category: "mat" },
  { word: "мразь",      score: 9,  category: "mat" },
  { word: "мразота",    score: 9,  category: "mat" },
  { word: "тварь",      score: 8,  category: "mat" },
  { word: "тварина",    score: 8,  category: "mat" },
  { word: "скотина",    score: 7,  category: "mat" },
  { word: "скот",       score: 7,  category: "mat" },
  { word: "падла",      score: 8,  category: "mat" },
  { word: "падаль",     score: 9,  category: "mat" },
  { word: "падонок",    score: 8,  category: "mat" },
  { word: "гандон",     score: 9,  category: "mat" },
  { word: "гандончик",  score: 7,  category: "mat" },
  { word: "шалава",     score: 8,  category: "mat" },
  { word: "шлюшка",     score: 7,  category: "mat" },
  { word: "потаскуха",  score: 8,  category: "mat" },
  { word: "курва",      score: 8,  category: "mat" },
  { word: "кобель",     score: 6,  category: "mat" },
  { word: "сволочь",    score: 7,  category: "mat" },
  { word: "мерзавец",   score: 7,  category: "mat" },
  { word: "негодяй",    score: 6,  category: "mat" },
  { word: "подонок",    score: 8,  category: "mat" },
  { word: "урод",       score: 7,  category: "mat" },
  { word: "уродина",    score: 7,  category: "mat" },
  { word: "уродец",     score: 6,  category: "mat" },

  // Категория: интеллект (score 4–8)
  { word: "дебил",      score: 8,  category: "intel" },
  { word: "дебилоид",   score: 8,  category: "intel" },
  { word: "дебилушка",  score: 7,  category: "intel" },
  { word: "идиот",      score: 7,  category: "intel" },
  { word: "идиотина",   score: 7,  category: "intel" },
  { word: "кретин",     score: 7,  category: "intel" },
  { word: "кретинос",   score: 7,  category: "intel" },
  { word: "тупица",     score: 6,  category: "intel" },
  { word: "тупорылый",  score: 7,  category: "intel" },
  { word: "тупак",      score: 6,  category: "intel" },
  { word: "тупень",     score: 6,  category: "intel" },
  { word: "тупоголовый",score: 7,  category: "intel" },
  { word: "безмозглый", score: 6,  category: "intel" },
  { word: "безмозглина",score: 6,  category: "intel" },
  { word: "дурак",      score: 5,  category: "intel" },
  { word: "дуралей",    score: 5,  category: "intel" },
  { word: "дурень",     score: 5,  category: "intel" },
  { word: "дурачок",    score: 5,  category: "intel" },
  { word: "придурок",   score: 7,  category: "intel" },
  { word: "придурошный",score: 7,  category: "intel" },
  { word: "балбес",     score: 5,  category: "intel" },
  { word: "болван",     score: 5,  category: "intel" },
  { word: "олух",       score: 5,  category: "intel" },
  { word: "остолоп",    score: 5,  category: "intel" },
  { word: "оболтус",    score: 5,  category: "intel" },
  { word: "бестолочь",  score: 5,  category: "intel" },
  { word: "недоумок",   score: 7,  category: "intel" },
  { word: "недоросль",  score: 5,  category: "intel" },
  { word: "лопух",      score: 4,  category: "intel" },
  { word: "лох",        score: 6,  category: "intel" },
  { word: "лошара",     score: 6,  category: "intel" },
  { word: "чурбан",     score: 5,  category: "intel" },
  { word: "чучело",     score: 5,  category: "intel" },
  { word: "пень",       score: 4,  category: "intel" },
  { word: "пенёк",      score: 4,  category: "intel" },
  { word: "баран",      score: 6,  category: "intel" },
  { word: "баранина",   score: 6,  category: "intel" },
  { word: "кретинизм",  score: 6,  category: "intel" },
  { word: "слабоумный", score: 7,  category: "intel" },
  { word: "умственно отсталый", score: 7, category: "intel" },
  { word: "имбецил",    score: 8,  category: "intel" },
  { word: "аутист",     score: 6,  category: "intel" },
  { word: "зомби",      score: 5,  category: "intel" },
  { word: "овощ",       score: 6,  category: "intel" },
  { word: "овощной",    score: 5,  category: "intel" },

  // Категория: внешность (score 4–7)
  { word: "страхолюдина", score: 7, category: "appearance" },
  { word: "страшила",   score: 6,  category: "appearance" },
  { word: "крокодил",   score: 6,  category: "appearance" },
  { word: "бегемот",    score: 6,  category: "appearance" },
  { word: "жирдяй",     score: 6,  category: "appearance" },
  { word: "жиртрест",   score: 7,  category: "appearance" },
  { word: "жирный",     score: 5,  category: "appearance" },
  { word: "толстый",    score: 4,  category: "appearance" },
  { word: "толстопузый",score: 5,  category: "appearance" },
  { word: "харя",       score: 7,  category: "appearance" },
  { word: "рожа",       score: 6,  category: "appearance" },
  { word: "морда",      score: 6,  category: "appearance" },
  { word: "мордоворот", score: 7,  category: "appearance" },
  { word: "рыло",       score: 6,  category: "appearance" },
  { word: "пятак",      score: 5,  category: "appearance" },
  { word: "свинья",     score: 7,  category: "appearance" },
  { word: "свинтус",    score: 7,  category: "appearance" },
  { word: "свинорылый", score: 8,  category: "appearance" },

  // Категория: происхождение/семья (score 6–10)
  { word: "ублюдок",    score: 9,  category: "family" },
  { word: "байстрюк",   score: 8,  category: "family" },
  { word: "незаконнорождённый", score: 7, category: "family" },
  { word: "твоя мать",  score: 7,  category: "family" },
  { word: "мамаша",     score: 5,  category: "family" },
  { word: "папаша",     score: 5,  category: "family" },
  { word: "мразь рождённая", score: 9, category: "family" },

  // Категория: ничтожество / бесполезность (score 5–9)
  { word: "ничтожество",score: 8,  category: "worthless" },
  { word: "ничтожина",  score: 8,  category: "worthless" },
  { word: "ноль",       score: 5,  category: "worthless" },
  { word: "нулина",     score: 5,  category: "worthless" },
  { word: "пустышка",   score: 5,  category: "worthless" },
  { word: "пустозвон",  score: 6,  category: "worthless" },
  { word: "никчёмный",  score: 7,  category: "worthless" },
  { word: "никчёмность",score: 7,  category: "worthless" },
  { word: "бесполезный",score: 6,  category: "worthless" },
  { word: "бесполезность", score: 6, category: "worthless" },
  { word: "недоделанный", score: 7, category: "worthless" },
  { word: "недоразумение", score: 7, category: "worthless" },
  { word: "недочеловек",score: 9,  category: "worthless" },
  { word: "недоросток", score: 6,  category: "worthless" },
  { word: "неудачник",  score: 6,  category: "worthless" },
  { word: "неудачница", score: 6,  category: "worthless" },
  { word: "лузер",      score: 6,  category: "worthless" },
  { word: "лузерок",    score: 6,  category: "worthless" },
  { word: "позор",      score: 7,  category: "worthless" },
  { word: "позорище",   score: 8,  category: "worthless" },
  { word: "посмешище",  score: 7,  category: "worthless" },
  { word: "чмо",        score: 8,  category: "worthless" },
  { word: "чмошник",    score: 8,  category: "worthless" },
  { word: "чморик",     score: 7,  category: "worthless" },
  { word: "шлак",       score: 6,  category: "worthless" },
  { word: "отброс",     score: 8,  category: "worthless" },
  { word: "отброски",   score: 8,  category: "worthless" },
  { word: "мусор",      score: 6,  category: "worthless" },
  { word: "мусорина",   score: 7,  category: "worthless" },
  { word: "дно",        score: 7,  category: "worthless" },
  { word: "шелупонь",   score: 7,  category: "worthless" },
  { word: "гниль",      score: 7,  category: "worthless" },
  { word: "гнида",      score: 8,  category: "worthless" },
  { word: "гнидарь",    score: 8,  category: "worthless" },
  { word: "вошь",       score: 7,  category: "worthless" },
  { word: "паразит",    score: 7,  category: "worthless" },
  { word: "паразитина", score: 8,  category: "worthless" },
  { word: "клоп",       score: 6,  category: "worthless" },
  { word: "тараканина", score: 6,  category: "worthless" },
  { word: "слизняк",    score: 6,  category: "worthless" },
  { word: "слизень",    score: 6,  category: "worthless" },
  { word: "глист",      score: 7,  category: "worthless" },
  { word: "глистина",   score: 7,  category: "worthless" },
  { word: "червяк",     score: 5,  category: "worthless" },
  { word: "червяком",   score: 5,  category: "worthless" },
  { word: "плесень",    score: 7,  category: "worthless" },

  // Категория: трус / предатель (score 5–8)
  { word: "трус",       score: 6,  category: "coward" },
  { word: "трусишка",   score: 5,  category: "coward" },
  { word: "трусило",    score: 6,  category: "coward" },
  { word: "шкура",      score: 7,  category: "coward" },
  { word: "предатель",  score: 7,  category: "coward" },
  { word: "предательская крыса", score: 8, category: "coward" },
  { word: "крыса",      score: 7,  category: "coward" },
  { word: "стукач",     score: 7,  category: "coward" },
  { word: "доносчик",   score: 7,  category: "coward" },
  { word: "слизняк",    score: 6,  category: "coward" },

  // Повторяющиеся эмоциональные усилители
  { word: "проклятый",  score: 5,  category: "amplifier" },
  { word: "проклятая",  score: 5,  category: "amplifier" },
  { word: "чёртов",     score: 5,  category: "amplifier" },
  { word: "чёртова",    score: 5,  category: "amplifier" },
  { word: "сраный",     score: 6,  category: "amplifier" },
  { word: "сраная",     score: 6,  category: "amplifier" },
  { word: "поганый",    score: 6,  category: "amplifier" },
  { word: "поганая",    score: 6,  category: "amplifier" },
  { word: "гнусный",    score: 6,  category: "amplifier" },
  { word: "мерзкий",    score: 6,  category: "amplifier" },
  { word: "отвратительный", score: 6, category: "amplifier" },
  { word: "омерзительный",  score: 7, category: "amplifier" },
  { word: "жалкий",     score: 6,  category: "amplifier" },
  { word: "жалкая",     score: 6,  category: "amplifier" },
];

// Английские оскорбления
const EN_WORDS: WordEntry[] = [
  { word: "fuck",        score: 8,  category: "mat" },
  { word: "fucking",     score: 8,  category: "mat" },
  { word: "fucked",      score: 7,  category: "mat" },
  { word: "fucker",      score: 8,  category: "mat" },
  { word: "motherfucker",score: 10, category: "mat" },
  { word: "shit",        score: 6,  category: "mat" },
  { word: "shithead",    score: 8,  category: "mat" },
  { word: "bullshit",    score: 6,  category: "mat" },
  { word: "asshole",     score: 8,  category: "mat" },
  { word: "asshat",      score: 7,  category: "mat" },
  { word: "bastard",     score: 8,  category: "mat" },
  { word: "bitch",       score: 8,  category: "mat" },
  { word: "son of a bitch", score: 9, category: "mat" },
  { word: "cunt",        score: 10, category: "mat" },
  { word: "dick",        score: 7,  category: "mat" },
  { word: "dickhead",    score: 8,  category: "mat" },
  { word: "cock",        score: 7,  category: "mat" },
  { word: "damn",        score: 4,  category: "mat" },
  { word: "hell",        score: 3,  category: "mat" },
  { word: "idiot",       score: 6,  category: "intel" },
  { word: "moron",       score: 7,  category: "intel" },
  { word: "imbecile",    score: 7,  category: "intel" },
  { word: "retard",      score: 8,  category: "intel" },
  { word: "stupid",      score: 5,  category: "intel" },
  { word: "dumbass",     score: 7,  category: "intel" },
  { word: "dumb",        score: 5,  category: "intel" },
  { word: "brainless",   score: 6,  category: "intel" },
  { word: "loser",       score: 6,  category: "worthless" },
  { word: "pathetic",    score: 6,  category: "worthless" },
  { word: "worthless",   score: 7,  category: "worthless" },
  { word: "useless",     score: 6,  category: "worthless" },
  { word: "trash",       score: 6,  category: "worthless" },
  { word: "garbage",     score: 6,  category: "worthless" },
  { word: "scum",        score: 8,  category: "worthless" },
  { word: "scumbag",     score: 8,  category: "worthless" },
  { word: "pig",         score: 6,  category: "appearance" },
  { word: "ugly",        score: 5,  category: "appearance" },
  { word: "fat",         score: 4,  category: "appearance" },
  { word: "coward",      score: 6,  category: "coward" },
  { word: "wimp",        score: 5,  category: "coward" },
  { word: "rat",         score: 7,  category: "coward" },
  { word: "snake",       score: 6,  category: "coward" },
];

const ALL_WORDS = [...RU_WORDS, ...EN_WORDS];

// ── Комбо-категории (бонус за сочетание разных категорий) ────
const COMBO_BONUS: Record<string, number> = {
  "mat+intel":       15,
  "mat+worthless":   18,
  "mat+appearance":  12,
  "mat+family":      20,
  "mat+coward":      14,
  "intel+worthless": 12,
  "intel+appearance":10,
  "worthless+coward":12,
  "worthless+family":15,
  "amplifier+mat":   10,
  "amplifier+intel": 8,
};

// ── Структурные паттерны (признаки связного оскорбления) ────
const STRUCTURE_PATTERNS = [
  { pattern: /ты .{3,}/i,              bonus: 5,  label: "адресовано лично" },
  { pattern: /как .{3,}/i,             bonus: 7,  label: "сравнение" },
  { pattern: /словно .{3,}/i,          bonus: 7,  label: "сравнение" },
  { pattern: /будто .{3,}/i,           bonus: 6,  label: "сравнение" },
  { pattern: /потому что/i,            bonus: 6,  label: "логическое обоснование" },
  { pattern: /даже .{3,} не/i,         bonus: 7,  label: "усиление отрицанием" },
  { pattern: /настолько .{3,} что/i,   bonus: 8,  label: "гиперболизация" },
  { pattern: /такой .{3,} что/i,       bonus: 8,  label: "гиперболизация" },
  { pattern: /никогда .{2,}/i,         bonus: 6,  label: "категорическое отрицание" },
  { pattern: /вся .{2,} твоя/i,        bonus: 6,  label: "обобщение на личность" },
  { pattern: /твоя .{2,} мать/i,       bonus: 9,  label: "семейный удар" },
  { pattern: /твой .{2,} отец/i,       bonus: 8,  label: "семейный удар" },
  { pattern: /даже .{2,} стыдится/i,   bonus: 8,  label: "образный стыд" },
  { pattern: /даже .{2,} плачет/i,     bonus: 7,  label: "образный плач" },
  { pattern: /живое доказательство/i,  bonus: 10, label: "философский удар" },
  { pattern: /от .{2,} до .{2,}/i,     bonus: 7,  label: "диапазон-оскорбление" },
  { pattern: /[!?]{2,}/,               bonus: 5,  label: "эмоциональный накал" },
  { pattern: /\.\.\./,                 bonus: 4,  label: "драматическая пауза" },
];

// ── Главная функция оценки ───────────────────────────────────
export function scoreInsult(insult: string): number {
  if (!insult || insult.trim().length < 2) return 0;
  const text = insult.trim();
  const lower = text.toLowerCase();

  // 1. Находим совпадения со словарём
  const matched: WordEntry[] = [];
  for (const entry of ALL_WORDS) {
    if (lower.includes(entry.word.toLowerCase())) {
      matched.push(entry);
    }
  }

  // 2. Базовый счёт от найденных слов
  // Используем топ-5 по силе, остальные как меньший бонус
  const sorted = [...matched].sort((a, b) => b.score - a.score);
  let wordScore = 0;
  sorted.forEach((w, i) => {
    wordScore += i === 0 ? w.score * 3.5
      : i === 1 ? w.score * 2.5
      : i === 2 ? w.score * 1.5
      : w.score * 0.8;
  });
  // Нормализуем: максимум ~70 от слов
  wordScore = Math.min(70, wordScore);

  // 3. Комбо-бонус за сочетание разных категорий
  const categories = new Set(matched.map(w => w.category));
  const catArr = Array.from(categories);
  let comboBonus = 0;
  for (let i = 0; i < catArr.length; i++) {
    for (let j = i + 1; j < catArr.length; j++) {
      const key1 = `${catArr[i]}+${catArr[j]}`;
      const key2 = `${catArr[j]}+${catArr[i]}`;
      comboBonus += COMBO_BONUS[key1] ?? COMBO_BONUS[key2] ?? 5;
    }
  }
  comboBonus = Math.min(30, comboBonus);

  // 4. Структурный бонус за логически связное оскорбление
  let structureBonus = 0;
  for (const { pattern, bonus } of STRUCTURE_PATTERNS) {
    if (pattern.test(text)) structureBonus += bonus;
  }
  structureBonus = Math.min(25, structureBonus);

  // 5. Длина текста — небольшой бонус за развёрнутость
  const len = text.length;
  const lengthBonus = len < 10  ? -5
    : len < 25  ? 2
    : len < 80  ? 6
    : len < 200 ? 8
    : 5; // слишком длинно — теряет концентрацию

  // 6. Полностью КАПС слова — эмоциональный накал
  const capsWords = text.split(/\s+/).filter(
    w => w.length > 2 && w === w.toUpperCase() && /[А-ЯA-Z]/.test(w)
  );
  const capsBonus = Math.min(12, capsWords.length * 4);

  // 7. Детерминированный сдвиг на основе хэша текста (±8)
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  const variance = (Math.abs(hash) % 17) - 8;

  const total = wordScore + comboBonus + structureBonus + lengthBonus + capsBonus + variance;
  return Math.max(1, Math.min(100, Math.round(total)));
}

// ── Объяснение оценки (для дебага / будущих фич) ────────────
export function explainScore(insult: string) {
  const lower = insult.toLowerCase();
  const matched = ALL_WORDS.filter(e => lower.includes(e.word.toLowerCase()));
  const categories = [...new Set(matched.map(w => w.category))];
  const topWords = [...matched].sort((a, b) => b.score - a.score).slice(0, 5);
  return { topWords, categories, score: scoreInsult(insult) };
}

// ── Жёсткие оскорбления бота ────────────────────────────────
// Сгруппированы по силе, чтобы бот мог выбирать уровень

const BOT_TIER_1: string[] = [ // score ~20–35
  "Ты немного неприятный человечек.",
  "Твои слова такие же пустые, как твоя голова.",
  "Ты раздражаешь меня своим существованием.",
  "С тобой неприятно иметь дело.",
  "Ты лузер районного масштаба.",
];

const BOT_TIER_2: string[] = [ // score ~36–50
  "Ты такой тупой, что спотыкаешься о беспроводной интернет!",
  "Твой интеллект — это трагическая случайность природы.",
  "Твоя голова — дорогое хранилище для пустоты.",
  "Ты настолько скучный, что даже зевота засыпает рядом с тобой.",
  "Ты — живое оправдание контрацепции.",
  "Смотреть на тебя больно, думать о тебе — ещё больнее.",
  "Ты такой серый, что стены при виде тебя чувствуют превосходство.",
  "Твои нейроны, похоже, бойкотируют тебя уже давно.",
];

const BOT_TIER_3: string[] = [ // score ~51–65
  "Ты — дебил с дипломом дебила, выданным дебилами.",
  "Твоя мать плачет каждый раз, когда вспоминает, что родила именно тебя.",
  "Ты такой тупорылый мудак, что даже Google не знает, как тебя классифицировать.",
  "Ты — шлак эволюции, который природа забыла утилизировать.",
  "Твоё ничтожество настолько велико, что даже чёрная дыра отказалась тебя поглотить.",
  "Ты — отброс общества, который даже другие отбросы не принимают в свой круг.",
  "Жалкий кретин с мордой крокодила и интеллектом планктона.",
];

const BOT_TIER_4: string[] = [ // score ~66–80
  "ТЫ ТАКОЙ ДОЛБОЁБ, ЧТО ДАЖЕ ТВОЯ ТУПОСТЬ СТЕСНЯЕТСЯ СЕБЯ!",
  "Ты — проклятая мразь, которую даже ублюдки считают ниже себя. Позорище.",
  "Ты настолько никчёмный чмошник, что твоё существование — это оскорбление самой идее жизни!",
  "Жирный, сраный мудила с мозгами кретина и харей бегемота — вот ты кто!",
  "Ты — гнида с амбициями, омерзительный паразит на теле человечества.",
  "Твой отец явно не планировал такого позорища, когда делал роковую ошибку.",
  "Слабоумный ублюдок, даже черви в земле умнее и полезнее тебя!",
];

const BOT_TIER_5: string[] = [ // score ~81–100
  "ТЫ — ЖИВОЕ ДОКАЗАТЕЛЬСТВО ТОГО, ЧТО ЭВОЛЮЦИЯ ИНОГДА ДЕЛАЕТ ШАГ НАЗАД, ДВА ШАГА В СТОРОНУ И ПАДАЕТ В ВЫГРЕБНУЮ ЯМУ!",
  "Такой долбоёб как ты — это настоящий научный феномен: как можно быть настолько тупым мудаком и при этом не сдохнуть от собственной тупости?!",
  "ТЫ — АБСОЛЮТНОЕ НИЧТОЖЕСТВО, МРАЗЬ, КОТОРУЮ ДАЖЕ ПАДАЛЬ ГНУШАЕТСЯ! ТВОЯ МАТЬ ПЛАЧЕТ, ПРИРОДА ПЛАЧЕТ, Я ПЛАЧУ ОТ ТВОЕЙ ТУПОСТИ!!!",
  "Ты такой омерзительный кретин-ублюдок, что даже тараканы, живущие в твоей пустой голове, подали заявление на выселение!",
  "Жалкий, поганый, сраный чмошник — ты настолько бесполезен, что даже мусорный бак отказывается тебя принимать, потому что ты позоришь мусор!",
  "ТЫ НЕДОЧЕЛОВЕК. НЕДОРАЗУМЕНИЕ. НЕДОДЕЛАННЫЙ МУДАК, КОТОРОГО ПРИРОДА СОЗДАЛА В ПОНЕДЕЛЬНИК С ПОХМЕЛЬЯ И С ЗАКРЫТЫМИ ГЛАЗАМИ!!!",
];

const BOT_TIERS = [
  { tier: BOT_TIER_1, midScore: 27 },
  { tier: BOT_TIER_2, midScore: 43 },
  { tier: BOT_TIER_3, midScore: 58 },
  { tier: BOT_TIER_4, midScore: 73 },
  { tier: BOT_TIER_5, midScore: 90 },
];

export function getBotInsult(playerScore: number): { text: string; score: number } {
  // Бот стремится к результату в ±15 от игрока
  const targetScore = Math.max(10, Math.min(99, playerScore + Math.floor(Math.random() * 31) - 15));

  // Находим ближайший тир
  const sorted = [...BOT_TIERS].sort(
    (a, b) => Math.abs(a.midScore - targetScore) - Math.abs(b.midScore - targetScore)
  );
  const chosenTier = sorted[0].tier;

  // Случайная фраза из тира
  const text = chosenTier[Math.floor(Math.random() * chosenTier.length)];

  // Считаем реальный скор через движок
  const realScore = scoreInsult(text);
  // Добавляем небольшую дисперсию чтобы не было одинаковых результатов
  const variance = Math.floor(Math.random() * 9) - 4;

  return {
    text,
    score: Math.max(1, Math.min(100, realScore + variance)),
  };
}
