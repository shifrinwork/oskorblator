"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type LoginMode = "username" | "email";

export default function LoginPage() {
  const [loginMode, setLoginMode] = useState<LoginMode>("username");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let authEmail = email.trim();

      // Если входим по нику — ищем email в профиле
      if (loginMode === "username") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.trim())
          .maybeSingle();

        if (!profile) {
          setError("Игрок с таким ником не найден.");
          return;
        }

        // Получаем email через служебный запрос
        // (email хранится в auth.users, но мы знаем паттерн для технических адресов)
        // Пробуем войти через технический email формата: {username}.{rand}@oskorblator.noemail
        // Поскольку мы не знаем rand — пробуем сначала напрямую по нику через signInWithPassword
        // Для этого используем auth.admin через RPC или просто просим ввести email

        // Ищем email через RPC-функцию (security definer имеет доступ к auth.users)
        const { data: foundEmail } = await supabase.rpc("get_email_by_username", {
          uname: username.trim(),
        });

        if (!foundEmail) {
          setError("Игрок с таким ником не найден.");
          return;
        }

        authEmail = foundEmail as string;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (signInError) {
        setError("Неверный email или пароль.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Что-то пошло не так. Попробуй ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
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
              <p className="text-slate-300 text-sm">
                Ссылка для сброса пароля отправлена на{" "}
                <span className="text-orange-400">{email}</span>
              </p>
              <button
                onClick={() => { setResetSent(false); setResetMode(false); }}
                className="text-orange-400 text-sm hover:underline"
              >
                ← Вернуться ко входу
              </button>
            </div>
          ) : resetMode ? (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-xs text-slate-500">
                Введи email который указывал при регистрации
              </p>
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
                {loading ? "Отправляем..." : "Отправить ссылку"}
              </button>
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="w-full text-sm text-slate-600 hover:text-slate-400 transition-colors"
              >
                ← Назад
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Переключатель ник / email */}
              <div className="flex rounded-lg overflow-hidden border border-[#2e2e2e]">
                <button
                  type="button"
                  onClick={() => { setLoginMode("username"); setError(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    loginMode === "username"
                      ? "bg-orange-600 text-white"
                      : "bg-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  По нику
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode("email"); setError(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    loginMode === "email"
                      ? "bg-orange-600 text-white"
                      : "bg-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  По email
                </button>
              </div>

              {loginMode === "username" ? (
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Боевой ник</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="КровожадныйВася"
                    className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-orange-500 focus:outline-none text-slate-200 text-sm transition-colors"
                  />
                  <p className="text-xs text-slate-700 mt-1">
                    Введи ник точно как при регистрации
                  </p>
                </div>
              ) : (
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
              )}

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
                {loading ? "Входим..." : "Войти в битву 🔥"}
              </button>

              <div className="flex justify-between text-sm text-slate-600">
                <button
                  type="button"
                  onClick={() => setResetMode(true)}
                  className="hover:text-orange-400 transition-colors"
                >
                  Забыл пароль?
                </button>
                <Link href="/register" className="hover:text-orange-400 transition-colors">
                  Регистрация
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
