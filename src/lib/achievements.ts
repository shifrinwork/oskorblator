// ============================================================
// ОСКОРБЛЯТОР — Achievement System
// ============================================================

export type FrameStyle = {
  id: string;
  label: string;
  borderColor: string;
  glowColor: string;
  glowSize: number;       // px
  animated: boolean;
  gradient?: string[];    // для анимированного градиента
  thickness: number;      // px
};

export type AchievementTier = {
  tier: number;
  requirement: number;
  label: string;           // название ранга достижения
  frame: FrameStyle;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "games" | "score" | "streak" | "pvp" | "bot" | "referral";
  tiers: AchievementTier[];
  getProgress: (stats: UserStats) => number;
};

export type UserStats = {
  total_games: number;    // wins + losses + bot
  pvp_wins: number;
  bot_wins: number;
  max_insult_score: number;
  streak_days: number;
  referral_count: number;
};

// ── Фреймы ──────────────────────────────────────────────────

const F = (
  id: string, label: string,
  borderColor: string, glowColor: string,
  glowSize: number, animated: boolean,
  thickness = 2, gradient?: string[]
): FrameStyle => ({ id, label, borderColor, glowColor, glowSize, animated, gradient, thickness });

export const FRAMES: Record<string, FrameStyle> = {
  default:      F("default",      "Без рамки",          "#374151", "transparent", 0,  false, 2),

  // Игры сыграны — серо-оранжевая гамма
  games_1:      F("games_1",      "Дебютант",            "#c2410c", "#c2410c",    6,  false, 2),
  games_2:      F("games_2",      "Задира",              "#ea580c", "#ea580c",    10, false, 2),
  games_3:      F("games_3",      "Скандалист",          "#f97316", "#f97316",    14, false, 3),
  games_4:      F("games_4",      "Завсегдатай Срача",   "#fb923c", "#f97316",    16, false, 3),
  games_5:      F("games_5",      "Ветеран Оскорблений", "#fed7aa", "#f97316",    20, true,  3),
  games_6:      F("games_6",      "Легенда Мата",        "#fbbf24", "#f97316",    24, true,  4, ["#fbbf24","#f97316","#dc2626"]),
  games_7:      F("games_7",      "Богоизбранный Срачник","#ffffff","#fbbf24",    30, true,  4, ["#ffffff","#fbbf24","#f97316","#dc2626","#7c3aed"]),

  // Очки — синяя гамма (холодный расчёт)
  score_1:      F("score_1",      "Острый Язык",         "#3b82f6", "#3b82f6",    8,  false, 2),
  score_2:      F("score_2",      "Мастер Слова",        "#6366f1", "#6366f1",    14, false, 3),
  score_3:      F("score_3",      "Бог Матерщины",       "#a78bfa", "#8b5cf6",    22, true,  4, ["#a78bfa","#6366f1","#3b82f6","#06b6d4"]),

  // Стрик — зелёная гамма
  streak_1:     F("streak_1",     "Постоянный",          "#16a34a", "#16a34a",    6,  false, 2),
  streak_2:     F("streak_2",     "Недельный Бесёнок",   "#22c55e", "#22c55e",    10, false, 2),
  streak_3:     F("streak_3",     "Две Недели Ада",      "#4ade80", "#22c55e",    14, false, 3),
  streak_4:     F("streak_4",     "Месячный Монстр",     "#86efac", "#22c55e",    18, true,  3),
  streak_5:     F("streak_5",     "Сезонный Демон",      "#bbf7d0", "#4ade80",    22, true,  4, ["#bbf7d0","#4ade80","#16a34a"]),
  streak_6:     F("streak_6",     "Ежегодный Бог",       "#ffffff", "#4ade80",    28, true,  4, ["#ffffff","#bbf7d0","#4ade80","#16a34a","#15803d"]),

  // PvP победы — красная гамма
  pvp_1:        F("pvp_1",        "Первая Кровь",        "#b91c1c", "#b91c1c",    8,  false, 2),
  pvp_2:        F("pvp_2",        "Боец",                "#dc2626", "#dc2626",    12, false, 2),
  pvp_3:        F("pvp_3",        "Душитель",            "#ef4444", "#dc2626",    16, false, 3),
  pvp_4:        F("pvp_4",        "Мясник",              "#f87171", "#ef4444",    18, true,  3),
  pvp_5:        F("pvp_5",        "Кровавый Рекордсмен", "#fca5a5", "#ef4444",    22, true,  3, ["#fca5a5","#ef4444","#b91c1c"]),
  pvp_6:        F("pvp_6",        "Гладиатор Срача",     "#fecaca", "#ef4444",    26, true,  4, ["#fecaca","#fca5a5","#ef4444","#b91c1c"]),
  pvp_7:        F("pvp_7",        "Непобедимый Ублюдок", "#ffffff", "#ef4444",    32, true,  4, ["#ffffff","#fca5a5","#ef4444","#7f1d1d"]),

  // Бот победы — серая гамма
  bot_1:        F("bot_1",        "Обидчик Машин",       "#4b5563", "#4b5563",    6,  false, 2),
  bot_2:        F("bot_2",        "Терминатор Ботов",    "#6b7280", "#6b7280",    10, false, 2),
  bot_3:        F("bot_3",        "Кибер-Злодей",        "#9ca3af", "#6b7280",    14, false, 3),
  bot_4:        F("bot_4",        "Машинный Охотник",    "#d1d5db", "#9ca3af",    16, true,  3),
  bot_5:        F("bot_5",        "Палач Алгоритмов",    "#e5e7eb", "#9ca3af",    20, true,  3, ["#e5e7eb","#9ca3af","#4b5563"]),
  bot_6:        F("bot_6",        "Убийца Нейросетей",   "#f3f4f6", "#d1d5db",    24, true,  4, ["#f3f4f6","#d1d5db","#6b7280","#374151"]),
  bot_7:        F("bot_7",        "Бог-Уничтожитель ИИ", "#ffffff", "#f3f4f6",    28, true,  4, ["#ffffff","#f3f4f6","#9ca3af","#374151","#111827"]),

  // Рефералы — золотая особенная гамма
  ref_1:        F("ref_1",        "Вербовщик",           "#d97706", "#d97706",    10, false, 2),
  ref_2:        F("ref_2",        "Агент Срача",         "#f59e0b", "#f59e0b",    16, false, 3),
  ref_3:        F("ref_3",        "Командир Скандала",   "#fbbf24", "#f59e0b",    20, true,  3, ["#fbbf24","#f59e0b","#d97706"]),
  ref_4:        F("ref_4",        "Повелитель Орды",     "#ffffff", "#fbbf24",    32, true,  5, ["#ffffff","#fef3c7","#fbbf24","#f59e0b","#d97706","#92400e","#fbbf24"]),
};

// ── Достижения ───────────────────────────────────────────────

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "games_played",
    name: "Бывалый Скандалист",
    description: "Сыграй N игр суммарно",
    icon: "🎮",
    category: "games",
    getProgress: (s) => s.total_games,
    tiers: [
      { tier: 1, requirement: 1,    label: "Первый Шаг в Ад",      frame: FRAMES.games_1 },
      { tier: 2, requirement: 5,    label: "Привыкает",             frame: FRAMES.games_2 },
      { tier: 3, requirement: 20,   label: "Скандалист",            frame: FRAMES.games_3 },
      { tier: 4, requirement: 50,   label: "Завсегдатай Срача",     frame: FRAMES.games_4 },
      { tier: 5, requirement: 100,  label: "Ветеран Оскорблений",   frame: FRAMES.games_5 },
      { tier: 6, requirement: 500,  label: "Легенда Мата",          frame: FRAMES.games_6 },
      { tier: 7, requirement: 1000, label: "Богоизбранный Срачник", frame: FRAMES.games_7 },
    ],
  },
  {
    id: "insult_score",
    name: "Убийственный Язык",
    description: "Получи N очков ЕС за одно оскорбление",
    icon: "💀",
    category: "score",
    getProgress: (s) => s.max_insult_score,
    tiers: [
      { tier: 1, requirement: 50,  label: "Острый Язык",     frame: FRAMES.score_1 },
      { tier: 2, requirement: 75,  label: "Мастер Слова",    frame: FRAMES.score_2 },
      { tier: 3, requirement: 100, label: "Бог Матерщины",   frame: FRAMES.score_3 },
    ],
  },
  {
    id: "daily_streak",
    name: "Ни Дня Без Срача",
    description: "Играй N дней подряд",
    icon: "🔥",
    category: "streak",
    getProgress: (s) => s.streak_days,
    tiers: [
      { tier: 1, requirement: 2,   label: "Постоянный",          frame: FRAMES.streak_1 },
      { tier: 2, requirement: 7,   label: "Недельный Бесёнок",   frame: FRAMES.streak_2 },
      { tier: 3, requirement: 14,  label: "Две Недели Ада",      frame: FRAMES.streak_3 },
      { tier: 4, requirement: 30,  label: "Месячный Монстр",     frame: FRAMES.streak_4 },
      { tier: 5, requirement: 90,  label: "Сезонный Демон",      frame: FRAMES.streak_5 },
      { tier: 6, requirement: 365, label: "Ежегодный Бог",       frame: FRAMES.streak_6 },
    ],
  },
  {
    id: "pvp_wins",
    name: "Пожиратель Соперников",
    description: "Победи N живых игроков",
    icon: "⚔️",
    category: "pvp",
    getProgress: (s) => s.pvp_wins,
    tiers: [
      { tier: 1, requirement: 1,    label: "Первая Кровь",          frame: FRAMES.pvp_1 },
      { tier: 2, requirement: 5,    label: "Боец",                  frame: FRAMES.pvp_2 },
      { tier: 3, requirement: 20,   label: "Душитель",              frame: FRAMES.pvp_3 },
      { tier: 4, requirement: 50,   label: "Мясник",                frame: FRAMES.pvp_4 },
      { tier: 5, requirement: 100,  label: "Кровавый Рекордсмен",   frame: FRAMES.pvp_5 },
      { tier: 6, requirement: 500,  label: "Гладиатор Срача",       frame: FRAMES.pvp_6 },
      { tier: 7, requirement: 1000, label: "Непобедимый Ублюдок",   frame: FRAMES.pvp_7 },
    ],
  },
  {
    id: "bot_wins",
    name: "Истребитель Машин",
    description: "Победи бота N раз",
    icon: "🤖",
    category: "bot",
    getProgress: (s) => s.bot_wins,
    tiers: [
      { tier: 1, requirement: 1,    label: "Обидчик Машин",        frame: FRAMES.bot_1 },
      { tier: 2, requirement: 5,    label: "Терминатор Ботов",     frame: FRAMES.bot_2 },
      { tier: 3, requirement: 20,   label: "Кибер-Злодей",         frame: FRAMES.bot_3 },
      { tier: 4, requirement: 50,   label: "Машинный Охотник",     frame: FRAMES.bot_4 },
      { tier: 5, requirement: 100,  label: "Палач Алгоритмов",     frame: FRAMES.bot_5 },
      { tier: 6, requirement: 500,  label: "Убийца Нейросетей",    frame: FRAMES.bot_6 },
      { tier: 7, requirement: 1000, label: "Бог-Уничтожитель ИИ",  frame: FRAMES.bot_7 },
    ],
  },
  {
    id: "referrals",
    name: "Командир Орды",
    description: "Пригласи N друзей",
    icon: "👥",
    category: "referral",
    getProgress: (s) => s.referral_count,
    tiers: [
      { tier: 1, requirement: 1,  label: "Вербовщик",           frame: FRAMES.ref_1 },
      { tier: 2, requirement: 5,  label: "Агент Срача",         frame: FRAMES.ref_2 },
      { tier: 3, requirement: 10, label: "Командир Скандала",   frame: FRAMES.ref_3 },
      { tier: 4, requirement: 30, label: "Повелитель Орды",     frame: FRAMES.ref_4 },
    ],
  },
];

// ── Утилиты ──────────────────────────────────────────────────

export function getUnlockedTier(achievement: Achievement, progress: number): number {
  let unlocked = 0;
  for (const tier of achievement.tiers) {
    if (progress >= tier.requirement) unlocked = tier.tier;
  }
  return unlocked;
}

export function getNextTier(achievement: Achievement, currentTier: number): AchievementTier | null {
  return achievement.tiers.find(t => t.tier === currentTier + 1) ?? null;
}

export function getBestFrame(unlockedAchievements: { achievement_id: string; current_tier: number }[]): FrameStyle {
  // Приоритет: ref_4 > games_7 > pvp_7 > streak_6 > score_3 > ...
  const priority = ["ref_4","games_7","pvp_7","bot_7","streak_6","score_3",
    "ref_3","games_6","pvp_6","bot_6","streak_5","score_2",
    "ref_2","games_5","pvp_5","bot_5","streak_4","score_1",
    "ref_1","games_4","pvp_4","bot_4","streak_3",
    "games_3","pvp_3","bot_3","streak_2",
    "games_2","pvp_2","bot_2","streak_1",
    "games_1","pvp_1","bot_1",
  ];

  const unlocked = new Set<string>();
  for (const ua of unlockedAchievements) {
    const ach = ACHIEVEMENTS.find(a => a.id === ua.achievement_id);
    if (!ach) continue;
    for (const tier of ach.tiers) {
      if (tier.tier <= ua.current_tier) unlocked.add(tier.frame.id);
    }
  }

  for (const frameId of priority) {
    if (unlocked.has(frameId)) return FRAMES[frameId];
  }
  return FRAMES.default;
}

// ── Проверка и обновление достижений ─────────────────────────

export async function checkAndUpdateAchievements(
  supabase: ReturnType<typeof import("@/lib/supabase").createClient>,
  userId: string,
  stats: UserStats
): Promise<string[]> {
  const newlyUnlocked: string[] = [];

  const { data: existing } = await supabase
    .from("user_achievements")
    .select("*")
    .eq("user_id", userId);

  const existingMap = new Map(
    (existing ?? []).map(e => [e.achievement_id, e])
  );

  for (const ach of ACHIEVEMENTS) {
    const progress = ach.getProgress(stats);
    const newTier = getUnlockedTier(ach, progress);
    const prev = existingMap.get(ach.id);

    if (!prev) {
      // Первый раз видим это достижение
      await supabase.from("user_achievements").upsert({
        user_id: userId,
        achievement_id: ach.id,
        current_tier: newTier,
        progress,
        unlocked_at: newTier > 0 ? new Date().toISOString() : null,
      });
      if (newTier > 0) {
        const tierData = ach.tiers.find(t => t.tier === newTier);
        newlyUnlocked.push(`${ach.name} — ${tierData?.label}`);
      }
    } else if (newTier > prev.current_tier) {
      // Новый тир разблокирован
      await supabase.from("user_achievements").update({
        current_tier: newTier,
        progress,
        unlocked_at: new Date().toISOString(),
      }).match({ user_id: userId, achievement_id: ach.id });

      const tierData = ach.tiers.find(t => t.tier === newTier);
      newlyUnlocked.push(`${ach.name} — ${tierData?.label}`);
    } else if (progress !== prev.progress) {
      await supabase.from("user_achievements").update({ progress })
        .match({ user_id: userId, achievement_id: ach.id });
    }
  }

  return newlyUnlocked;
}
