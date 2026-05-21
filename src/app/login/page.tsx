"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Неверный email или пароль");
    } else {
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-impact fire-text">
            ОСКОРБЛЯТОР
          </Link>
          <p className="text-slate-500 mt-2 text-sm">
            {resetMode ? "Восстановление пароля" : "Вход в систему"}
          </p>
        </div>

        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-6">
          {resetSent ? (
            <div className="text-center py-4 space-y-3">
              <div className="text-4xl">📧</div>
              <p className="text-slate-300">Ссылка для сброса пароля отправлена на {email}</p>
              <button
                onClick={() => { setResetSent(false); setResetMode(false); }}
                className="text-orange-400 text-sm hover:underline"
              >
                Вернуться ко входу
              </button>
            </div>
          ) : (
            <form onSubmit={resetMode ? handleReset : handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="твой@email.ru"
                  className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-orange-500 focus:outline-none text-slate-200 text-sm transition-colors"
                />
              </div>
              {!resetMode && (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Пароль</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-orange-500 focus:outline-none text-slate-200 text-sm transition-colors"
                  />
                </div>
              )}
              {error && (
                <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/50 text-red-400 text-sm">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 font-bold text-white transition-colors"
              >
                {loading ? "..." : resetMode ? "Отправить ссылку" : "Войти в битву"}
              </button>

              <div className="flex justify-between text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => setResetMode(!resetMode)}
                  className="hover:text-orange-400 transition-colors"
                >
                  {resetMode ? "← Назад" : "Забыл пароль?"}
                </button>
                {!resetMode && (
                  <Link href="/register" className="hover:text-orange-400 transition-colors">
                    Регистрация
                  </Link>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
