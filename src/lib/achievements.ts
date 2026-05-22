// ============================================================
// ОСКОРБЛЯТОР — Achievement System
// ============================================================

export type FrameStyle = {
  id: string;
  label: string;
  borderColor: string;
  glowColor: string;
  glowSize: number;
  animated: boolean;
  gradient?: string[];
  thickness: number;
  // canvas-pattern fields
  pattern?: 'chain' | 'spikes' | 'thorns' | 'fire' | 'circuit' | 'snake';
  patternDetail?: number; // 1–7
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

const P = (
  id: string, label: string,
  pattern: FrameStyle["pattern"],
  detail: number,
  animated: boolean,
): FrameStyle => ({
  id, label, pattern, patternDetail: detail, animated,
  borderColor: "#374151", glowColor: "transparent", glowSize: 0, thickness: 3,
});

export const FRAMES: Record<string, FrameStyle> = {
  default: {
    id: "default", label: "Без рамки", animated: false,
    borderColor: "#374151", glowColor: "transparent", glowSize: 0, thickness: 2,
  },

  // Игры сыграны — цепь (от ржавой железной до платиновой)
  chain_1: P("chain_1", "Железная цепь",    "chain", 1, false),
  chain_2: P("chain_2", "Ржавая цепь",      "chain", 2, false),
  chain_3: P("chain_3", "Тёмная цепь",      "chain", 3, false),
  chain_4: P("chain_4", "Бронзовая цепь",   "chain", 4, false),
  chain_5: P("chain_5", "Серебряная цепь",  "chain", 5, false),
  chain_6: P("chain_6", "Золотая цепь",     "chain", 6, true),
  chain_7: P("chain_7", "Платиновая цепь",  "chain", 7, true),

  // Очки оскорбления — огонь (от оранжевого до хаотичного)
  fire_1: P("fire_1", "Адский огонь",   "fire", 1, true),
  fire_2: P("fire_2", "Синее пламя",    "fire", 2, true),
  fire_3: P("fire_3", "Пламя хаоса",   "fire", 3, true),

  // Стрик — тернии (от зелёных до золотых)
  thorns_1: P("thorns_1", "Зелёные тернии",  "thorns", 1, false),
  thorns_2: P("thorns_2", "Тернии с кровью", "thorns", 2, false),
  thorns_3: P("thorns_3", "Чёрные тернии",   "thorns", 3, false),
  thorns_4: P("thorns_4", "Костяные тернии", "thorns", 4, false),
  thorns_5: P("thorns_5", "Тернии тьмы",     "thorns", 5, false),
  thorns_6: P("thorns_6", "Золотые тернии",  "thorns", 6, true),

  // PvP победы — шипы (от стальных до алмазных)
  spikes_1: P("spikes_1", "Стальные шипы",     "spikes", 1, false),
  spikes_2: P("spikes_2", "Чёрные шипы",       "spikes", 2, false),
  spikes_3: P("spikes_3", "Окровавленные",      "spikes", 3, false),
  spikes_4: P("spikes_4", "Шипы с капелями",    "spikes", 4, false),
  spikes_5: P("spikes_5", "Костяные шипы",      "spikes", 5, false),
  spikes_6: P("spikes_6", "Кристальные шипы",   "spikes", 6, false),
  spikes_7: P("spikes_7", "Призматические",     "spikes", 7, true),

  // Победы над ботом — схемы (от серой до радужной)
  circuit_1: P("circuit_1", "Схема I",          "circuit", 1, false),
  circuit_2: P("circuit_2", "Схема II",         "circuit", 2, false),
  circuit_3: P("circuit_3", "Схема III",        "circuit", 3, false),
  circuit_4: P("circuit_4", "Схема IV",         "circuit", 4, true),
  circuit_5: P("circuit_5", "Схема V",          "circuit", 5, true),
  circuit_6: P("circuit_6", "Нейросеть",        "circuit", 6, true),
  circuit_7: P("circuit_7", "Квантовая схема",  "circuit", 7, true),

  // Рефералы — змея (от одной до гидры)
  snake_1: P("snake_1", "Змея",    "snake", 1, false),
  snake_2: P("snake_2", "Кобра",   "snake", 2, false),
  snake_3: P("snake_3", "Анаконда","snake", 3, false),
  snake_4: P("snake_4", "Гидра",   "snake", 4, true),
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
      { tier: 1, requirement: 1,    label: "Первый Шаг в Ад",       frame: FRAMES.chain_1 },
      { tier: 2, requirement: 5,    label: "Привыкает",              frame: FRAMES.chain_2 },
      { tier: 3, requirement: 20,   label: "Скандалист",             frame: FRAMES.chain_3 },
      { tier: 4, requirement: 50,   label: "Завсегдатай Срача",      frame: FRAMES.chain_4 },
      { tier: 5, requirement: 100,  label: "Ветеран Оскорблений",    frame: FRAMES.chain_5 },
      { tier: 6, requirement: 500,  label: "Легенда Мата",           frame: FRAMES.chain_6 },
      { tier: 7, requirement: 1000, label: "Богоизбранный Срачник",  frame: FRAMES.chain_7 },
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
      { tier: 1, requirement: 50,  label: "Острый Язык",    frame: FRAMES.fire_1 },
      { tier: 2, requirement: 75,  label: "Мастер Слова",   frame: FRAMES.fire_2 },
      { tier: 3, requirement: 100, label: "Бог Матерщины",  frame: FRAMES.fire_3 },
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
      { tier: 1, requirement: 2,   label: "Постоянный",         frame: FRAMES.thorns_1 },
      { tier: 2, requirement: 7,   label: "Недельный Бесёнок",  frame: FRAMES.thorns_2 },
      { tier: 3, requirement: 14,  label: "Две Недели Ада",     frame: FRAMES.thorns_3 },
      { tier: 4, requirement: 30,  label: "Месячный Монстр",    frame: FRAMES.thorns_4 },
      { tier: 5, requirement: 90,  label: "Сезонный Демон",     frame: FRAMES.thorns_5 },
      { tier: 6, requirement: 365, label: "Ежегодный Бог",      frame: FRAMES.thorns_6 },
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
      { tier: 1, requirement: 1,    label: "Первая Кровь",         frame: FRAMES.spikes_1 },
      { tier: 2, requirement: 5,    label: "Боец",                 frame: FRAMES.spikes_2 },
      { tier: 3, requirement: 20,   label: "Душитель",             frame: FRAMES.spikes_3 },
      { tier: 4, requirement: 50,   label: "Мясник",               frame: FRAMES.spikes_4 },
      { tier: 5, requirement: 100,  label: "Кровавый Рекордсмен",  frame: FRAMES.spikes_5 },
      { tier: 6, requirement: 500,  label: "Гладиатор Срача",      frame: FRAMES.spikes_6 },
      { tier: 7, requirement: 1000, label: "Непобедимый Ублюдок",  frame: FRAMES.spikes_7 },
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
      { tier: 1, requirement: 1,    label: "Обидчик Машин",       frame: FRAMES.circuit_1 },
      { tier: 2, requirement: 5,    label: "Терминатор Ботов",    frame: FRAMES.circuit_2 },
      { tier: 3, requirement: 20,   label: "Кибер-Злодей",        frame: FRAMES.circuit_3 },
      { tier: 4, requirement: 50,   label: "Машинный Охотник",    frame: FRAMES.circuit_4 },
      { tier: 5, requirement: 100,  label: "Палач Алгоритмов",    frame: FRAMES.circuit_5 },
      { tier: 6, requirement: 500,  label: "Убийца Нейросетей",   frame: FRAMES.circuit_6 },
      { tier: 7, requirement: 1000, label: "Бог-Уничтожитель ИИ", frame: FRAMES.circuit_7 },
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
      { tier: 1, requirement: 1,  label: "Вербовщик",         frame: FRAMES.snake_1 },
      { tier: 2, requirement: 5,  label: "Агент Срача",       frame: FRAMES.snake_2 },
      { tier: 3, requirement: 10, label: "Командир Скандала", frame: FRAMES.snake_3 },
      { tier: 4, requirement: 30, label: "Повелитель Орды",   frame: FRAMES.snake_4 },
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
  // Приоритет: гидра > платина/призма/квант > золото/кристаллы > ...
  const priority = [
    "snake_4",
    "chain_7","spikes_7","circuit_7",
    "chain_6","spikes_6","circuit_6","thorns_6","fire_3","snake_3",
    "chain_5","spikes_5","circuit_5","thorns_5","fire_2","snake_2",
    "chain_4","spikes_4","circuit_4","thorns_4","fire_1","snake_1",
    "chain_3","spikes_3","circuit_3","thorns_3",
    "chain_2","spikes_2","circuit_2","thorns_2",
    "chain_1","spikes_1","circuit_1","thorns_1",
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
