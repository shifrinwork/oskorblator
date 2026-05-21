# ОСКОРБЛЯТОР — Инструкция по деплою

## Бесплатный хостинг: Vercel + Supabase

---

## Шаг 1: Настройка Supabase (бесплатно)

1. Зайди на **supabase.com** → Create new project
2. Запомни:
   - **Project URL** (вида `https://xxxxx.supabase.co`)
   - **Anon/Public Key** (в Settings → API)

3. Открой **SQL Editor** в Supabase и выполни весь файл `schema.sql`

4. Проверь что создались таблицы: `profiles`, `games`, `matchmaking_queue`, `tournaments`, `tournament_participants`

---

## Шаг 2: Создать репозиторий на GitHub

```bash
cd ~/oskorblator
git init
git add .
git commit -m "initial commit"
```

Создай репо на **github.com/new**, затем:
```bash
git remote add origin https://github.com/твой-юзер/oskorblator.git
git push -u origin main
```

---

## Шаг 3: Деплой на Vercel (бесплатно)

1. Зайди на **vercel.com** → New Project
2. Импортируй твой GitHub репозиторий
3. В разделе **Environment Variables** добавь:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...твой-ключ...
   ```
4. Нажми **Deploy**

Готово! Vercel даст тебе URL вида `oskorblator.vercel.app`

---

## Шаг 4: Локальная разработка (опционально)

```bash
# Установи Node.js если нет: https://nodejs.org
cd ~/oskorblator
cp .env.local.example .env.local
# Вставь туда свои ключи от Supabase

npm install
npm run dev
# Открой http://localhost:3000
```

---

## Система очков

Очки присваиваются алгоритмом на основе:
- Длина и богатство оскорбления
- Caps Lock и заглавные буквы (эмоциональность)
- Знаки препинания (`!!!`, `???`)
- Уникальная вариативность (псевдо-рандом от содержания текста)

## Ранги и рейтинг

| Ранг | Очки рейтинга |
|------|--------------|
| 🐱 Нежный Котик | 0–199 |
| 😤 Дворовый Хам | 200–399 |
| 🤬 Матёрый Грубиян | 400–649 |
| 💀 Мастер Унижений | 650–999 |
| 🔥 Оскорблятор | 1000–1399 |
| ⚡ Великий Ниспровергатель | 1400–1899 |
| 💣 Легенда Срача | 1900–2499 |
| 👑 Бог Оскорблений | 2500+ |

- Победа в PvP: **+25 ОР**
- Поражение в PvP: **-20 ОР**
- Игра с ботом: **рейтинг не меняется**
