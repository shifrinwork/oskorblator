export type Rank = {
  name: string;
  emoji: string;
  minRating: number;
  maxRating: number;
  color: string;
  bgColor: string;
  description: string;
};

export const RANKS: Rank[] = [
  {
    name: "Нежный Котик",
    emoji: "🐱",
    minRating: 0,
    maxRating: 199,
    color: "text-gray-400",
    bgColor: "bg-gray-800",
    description: "Только встал на путь срача",
  },
  {
    name: "Дворовый Хам",
    emoji: "😤",
    minRating: 200,
    maxRating: 399,
    color: "text-green-400",
    bgColor: "bg-green-900/30",
    description: "Грубиян местного масштаба",
  },
  {
    name: "Матёрый Грубиян",
    emoji: "🤬",
    minRating: 400,
    maxRating: 649,
    color: "text-blue-400",
    bgColor: "bg-blue-900/30",
    description: "Оскорбление — это искусство",
  },
  {
    name: "Мастер Унижений",
    emoji: "💀",
    minRating: 650,
    maxRating: 999,
    color: "text-purple-400",
    bgColor: "bg-purple-900/30",
    description: "Слова ранят как кинжалы",
  },
  {
    name: "Оскорблятор",
    emoji: "🔥",
    minRating: 1000,
    maxRating: 1399,
    color: "text-orange-400",
    bgColor: "bg-orange-900/30",
    description: "Имя, которое вселяет ужас",
  },
  {
    name: "Великий Ниспровергатель",
    emoji: "⚡",
    minRating: 1400,
    maxRating: 1899,
    color: "text-yellow-400",
    bgColor: "bg-yellow-900/30",
    description: "Одним словом сносит самооценку",
  },
  {
    name: "Легенда Срача",
    emoji: "💣",
    minRating: 1900,
    maxRating: 2499,
    color: "text-red-400",
    bgColor: "bg-red-900/30",
    description: "Имя знают все форумы",
  },
  {
    name: "Бог Оскорблений",
    emoji: "👑",
    minRating: 2500,
    maxRating: Infinity,
    color: "text-amber-400",
    bgColor: "bg-amber-900/30",
    description: "Недостижимый уровень мастерства",
  },
];

export function getRankForRating(rating: number): Rank {
  return (
    RANKS.find((r) => rating >= r.minRating && rating <= r.maxRating) ||
    RANKS[0]
  );
}

export function getRatingProgressPercent(rating: number): number {
  const rank = getRankForRating(rating);
  if (rank.maxRating === Infinity) return 100;
  const range = rank.maxRating - rank.minRating + 1;
  const progress = rating - rank.minRating;
  return Math.min(100, Math.round((progress / range) * 100));
}

export function getNextRank(rating: number): Rank | null {
  const rank = getRankForRating(rating);
  const idx = RANKS.indexOf(rank);
  return idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export const WIN_POINTS = 25;
export const LOSS_POINTS = -20;
