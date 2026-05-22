// POST /api/admin/rescore-insults
// Пересчитывает очки всех записей в insult_records с новой функцией scoreInsult.
// Защищён через заголовок Authorization: Bearer <ADMIN_SECRET>
// Нужен SUPABASE_SERVICE_ROLE_KEY в .env.local
//
// Запуск:
//   curl -X POST https://your-domain/api/admin/rescore-insults \
//     -H "Authorization: Bearer ВАШ_СЕКРЕТ"

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreInsult } from "@/lib/scoring";

const BATCH_SIZE = 50;

export async function POST(req: NextRequest) {
  // ── Авторизация ──────────────────────────────────────────────
  const authHeader = req.headers.get("authorization") ?? "";
  const secret = process.env.ADMIN_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Supabase с service-role ключом ───────────────────────────
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // ── Загружаем все записи ─────────────────────────────────────
  const { data: records, error: fetchErr } = await supabase
    .from("insult_records")
    .select("id, insult, score");

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  if (!records || records.length === 0) {
    return NextResponse.json({ updated: 0, message: "Записей нет" });
  }

  // ── Пересчёт и пакетное обновление ──────────────────────────
  let updated = 0;
  let errors  = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(r =>
        supabase
          .from("insult_records")
          .update({ score: scoreInsult(r.insult as string) })
          .eq("id", r.id)
      )
    );

    for (const { error } of results) {
      if (error) {
        console.error("rescore error:", error);
        errors++;
      } else {
        updated++;
      }
    }
  }

  return NextResponse.json({
    total:   records.length,
    updated,
    errors,
    message: `Пересчитано ${updated} из ${records.length} записей`,
  });
}
