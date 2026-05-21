"use client";

interface DisclaimerModalProps {
  onAccept: () => void;
}

export default function DisclaimerModal({ onAccept }: DisclaimerModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="max-w-md w-full rounded-xl border border-orange-500/30 bg-[#0f0f0f] p-6 shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-5xl mb-3">⚠️</div>
          <h2 className="text-xl font-bold text-orange-400 mb-1">Внимание!</h2>
          <p className="text-xs text-slate-500">Перед регистрацией прочитай это</p>
        </div>

        <div className="space-y-3 text-sm text-slate-300 mb-6">
          <p>
            <span className="text-orange-400 font-bold">ОСКОРБЛЯТОР</span> — это развлекательный проект созданный для того, чтобы{" "}
            <span className="text-white">выпустить пар</span> и повеселиться в безопасной игровой среде.
          </p>
          <p>
            🎭 Все оскорбления в игре — это{" "}
            <span className="text-white font-medium">художественное преувеличение</span>.
            Не принимай их на личный счёт — это просто игра слов!
          </p>
          <p>
            😄 Если что-то написанное в игре вас расстроило — просто помните:{" "}
            <span className="text-white font-medium">другой игрок не имеет это в виду лично.</span>
          </p>
          <p>
            🚫 Угрозы реальному насилию, доксинг и личные данные реальных людей — запрещены и будут удалены.
          </p>
          <div className="border border-orange-900/50 rounded-lg bg-orange-950/30 p-3 text-orange-200 text-xs">
            Регистрируясь, ты подтверждаешь что тебе <strong>18+</strong>, ты согласен с правилами и понимаешь,
            что всё происходящее здесь — это <strong>игра для веселья</strong>, а не реальные оскорбления.
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex-1 py-2.5 rounded-lg border border-[#2e2e2e] text-slate-400 hover:text-slate-300 transition-colors text-sm"
          >
            Не согласен
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold transition-colors text-sm"
          >
            Понял, согласен! 🔥
          </button>
        </div>
      </div>
    </div>
  );
}
