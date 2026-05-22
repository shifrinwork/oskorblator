"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import DisclaimerModal from "@/components/DisclaimerModal";

// Конвертируем любой файл-изображение в JPEG через canvas
// Решает проблему с HEIC/HEIF фото с iPhone/iPad
async function toJpeg(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // Ограничиваем размер до 800×800 чтобы не перегружать память на iOS
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas error")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("toBlob failed")),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image load error")); };
    img.src = url;
  });
}

// Приводим имя к ASCII для использования в email
function toAsciiSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")  // убираем диакритику
    .replace(/[^a-z0-9]/g, "x")        // кириллицу и символы → x
    .replace(/^x+/, "")                 // убираем ведущие x
    .slice(0, 20) || "player";
}

function RegisterForm() {
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

    // Ограничение размера — 10 МБ до конвертации
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл слишком большой. Максимум 10 МБ.");
      return;
    }
    setError("");
    setAvatarFile(file);

    // Превью через FileReader
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.onerror   = () => setAvatarPreview(null);
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

      // Email для Supabase Auth
      // Если не указан — генерируем технический (только ASCII в local-части!)
      const rand = Math.random().toString(36).slice(2, 8);
      const authEmail = email.trim()
        ? email.trim()
        : `${toAsciiSlug(cleanUsername)}.${rand}@players.oskorblator.app`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          data: {
            username: cleanUsername,
            has_real_email: !!email.trim(),
          },
        },
      });

      if (signUpError) throw signUpError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("Ошибка создания аккаунта");

      // Загрузка аватарки (опционально, ошибка не блокирует регистрацию)
      if (avatarFile) {
        try {
          // Конвертируем в JPEG — решает проблему HEIC/HEIF с iPhone/iPad
          const jpeg = await toJpeg(avatarFile);
          const path = `${userId}/avatar.jpg`;

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(path, jpeg, { contentType: "image/jpeg" }); // без upsert для новых юзеров

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("avatars")
              .getPublicUrl(path);
            await supabase
              .from("profiles")
              .update({ avatar_url: urlData.publicUrl })
              .eq("id", userId);
          }
          // Не бросаем ошибку — аватарка не критична для регистрации
        } catch {
          // Молчим — регистрация продолжается без аватарки
        }
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
      const raw = err instanceof Error ? err.message : String(err);

      // Переводим типичные ошибки на русский
      if (raw.includes("already registered") || raw.includes("already been registered")) {
        setError("Этот email уже используется.");
      } else if (raw.includes("Password should be") || raw.includes("password")) {
        setError("Пароль слишком короткий — минимум 6 символов.");
      } else if (
        raw.includes("Load failed") ||
        raw.includes("Failed to fetch") ||
        raw.includes("NetworkError") ||
        raw.includes("network") ||
        raw.includes("fetch")
      ) {
        setError("Ошибка соединения. Проверь интернет и попробуй ещё раз.");
      } else {
        setError(raw || "Что-то пошло не так");
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

// Suspense нужен потому что useSearchParams() читает URL параметры (?ref=...)
export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse font-impact text-2xl">ЗАГРУЗКА...</div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
