"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import DisclaimerModal from "@/components/DisclaimerModal";

export default function RegisterPage() {
  const [step, setStep] = useState<"disclaimer" | "form">("disclaimer");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refCode, setRefCode] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref);
  }, [searchParams]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const cleanUsername = username.trim();

      // Проверяем доступность ника
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleanUsername)
        .maybeSingle();

      if (existing) {
        setError("Этот ник уже занят. Выбери другой.");
        return;
      }

      // Если email не введён — генерируем технический адрес
      // (Supabase требует email, но пользователь его не видит)
      const rand = Math.random().toString(36).slice(2, 8);
      const authEmail = email.trim()
        ? email.trim()
        : `${cleanUsername.toLowerCase()}.${rand}@oskorblator.noemail`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            // Флаг — использовал ли реальный email
            has_real_email: !!email.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Ошибка создания аккаунта");

      // Загрузка аватарки
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `${userId}/avatar.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(path);
          avatarUrl = urlData.publicUrl;
        }
      }

      if (avatarUrl) {
        await supabase
          .from("profiles")
          .update({ avatar_url: avatarUrl })
          .eq("id", userId);
      }

      // Обрабатываем реферальный код
      if (refCode) {
        const { data: referrerId } = await supabase.rpc("get_profile_by_ref_code", {
          code: refCode,
        });
        if (referrerId && referrerId !== userId) {
          await supabase.from("referrals").insert({
            referrer_id: referrerId,
            referred_id: userId,
          });
        }
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Что-то пошло не так";
      // Переводим типичные ошибки Supabase на русский
      if (msg.includes("already registered")) {
        setError("Этот email уже используется.");
      } else if (msg.includes("Password should be")) {
        setError("Пароль слишком короткий — минимум 6 символов.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (step === "disclaimer") {
    return <DisclaimerModal onAccept={() => setStep("form")} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-impact fire-text">
            ОСКОРБЛЯТОР
          </Link>
          <p className="text-slate-500 mt-2 text-sm">Создай свой аккаунт бойца</p>
          {refCode && (
            <p className="text-xs text-amber-400 mt-1">🎉 Ты пришёл по реферальной ссылке!</p>
          )}
        </div>

        <div className="rounded-xl border border-[#1e1e1e] bg-[#0f0f0f] p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Аватарка */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-full border-2 border-dashed border-orange-500/40 hover:border-orange-500 transition-colors flex items-center justify-center overflow-hidden"
              >
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">👤</span>
                )}
              </button>
              <p className="text-xs text-slate-600">
                {avatarPreview ? "Нажми чтобы сменить" : "Аватарка (не обязательно)"}
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Ник */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Боевой ник <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="КровожадныйВася"
                maxLength={24}
                minLength={3}
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-orange-500 focus:outline-none text-slate-200 text-sm transition-colors"
              />
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Пароль <span className="text-orange-500">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                minLength={6}
                required
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
              className="w-full py-3 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-white transition-colors"
            >
              {loading ? "Создаём аккаунт..." : "Вступить в битву 🔥"}
            </button>

            {/* Email — необязательный, внизу */}
            <div className="pt-2 border-t border-[#1e1e1e]">
              <label className="block text-sm text-slate-600 mb-1.5">
                Email{" "}
                <span className="text-xs text-slate-700">
                  — не обязателен, только для восстановления пароля
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="твой@email.ru (необязательно)"
                className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a0a] border border-[#2e2e2e] focus:border-slate-500 focus:outline-none text-slate-400 text-sm transition-colors placeholder:text-slate-700"
              />
              {!email && (
                <p className="text-xs text-slate-700 mt-1">
                  ⚠️ Без email восстановить пароль будет невозможно
                </p>
              )}
            </div>

          </form>

          <p className="text-center text-sm text-slate-600 mt-4">
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-orange-400 hover:underline">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
