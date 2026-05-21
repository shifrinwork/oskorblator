import Link from "next/link";
import { RANKS } from "@/lib/ranks";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex justify-between items-center px-6 py-4 border-b border-[#1e1e1e]">
        <span className="text-2xl font-impact fire-text tracking-wider">ОСКОРБЛЯТОР</span>
        <div className="flex gap-3">
          <Link href="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-orange-400 transition-colors">
            Войти
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 rounded-lg font-medium transition-colors">
            Играть бесплатно
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-radial from-orange-950/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange-600/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="text-8xl mb-4">🔥</div>
          <h1 className="text-6xl sm:text-8xl font-impact fire-text tracking-wider mb-4 animate-pulse-fire">
            ОСКОРБЛЯТОР
          </h1>
          <p className="text-xl text-slate-400 mb-2">
            Битва слов в реальном времени
          </p>
          <p className="text-slate-500 mb-10 max-w-xl mx-auto">
            Придумай самое <span className="text-orange-400 font-medium">убийственное оскорбление</span>,
            победи соперника и взберись на вершину мирового рейтинга
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-12">
            <Link
              href="/register"
              className="px-8 py-4 bg-orange-600 hover:bg-orange-500 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20"
            >
              Начать битву 🔥
            </Link>
            <Link
              href="/leaderboard"
              className="px-8 py-4 border border-[#2e2e2e] hover:border-orange-500/50 rounded-xl font-medium text-slate-300 text-lg transition-all hover:text-orange-400"
            >
              Таблица рейтинга
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="game-card rounded-xl p-4 transition-all">
              <div className="text-2xl mb-2">🤖</div>
              <h3 className="font-bold text-slate-200 mb-1">Против бота</h3>
              <p className="text-xs text-slate-500">Разомнись против ИИ без риска рейтинга</p>
            </div>
            <div className="game-card rounded-xl p-4 transition-all">
              <div className="text-2xl mb-2">⚔️</div>
              <h3 className="font-bold text-slate-200 mb-1">PvP бой</h3>
              <p className="text-xs text-slate-500">60 секунд. Один победитель. Рейтинг в ставке.</p>
            </div>
            <div className="game-card rounded-xl p-4 transition-all">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="font-bold text-slate-200 mb-1">Турнир</h3>
              <p className="text-xs text-slate-500">Сетка на выбывание. Только лучший выживает.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ranks preview */}
      <section className="border-t border-[#1e1e1e] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-center text-2xl font-bold text-slate-300 mb-2">Система рангов</h2>
          <p className="text-center text-slate-600 text-sm mb-8">Пройди путь от котика до бога</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {RANKS.map((rank) => (
              <div key={rank.name} className={`rounded-lg p-3 ${rank.bgColor} border border-transparent text-center`}>
                <div className="text-2xl mb-1">{rank.emoji}</div>
                <div className={`text-sm font-bold ${rank.color}`}>{rank.name}</div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {rank.maxRating === Infinity ? `${rank.minRating}+` : `${rank.minRating}–${rank.maxRating}`} ОР
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1e1e1e] py-6 px-4 text-center text-xs text-slate-600">
        <p>ОСКОРБЛЯТОР — сделано для веселья и выпускания пара 🔥</p>
        <p className="mt-1">Все оскорбления — вымысел и художественное преувеличение. 18+</p>
      </footer>
    </div>
  );
}
