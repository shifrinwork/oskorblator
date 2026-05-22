-- ── Таблица голосов за записи в Скорбных Анналах ─────────────────────────

CREATE TABLE IF NOT EXISTS insult_votes (
  insult_id  UUID NOT NULL REFERENCES insult_records(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id)       ON DELETE CASCADE,
  vote       SMALLINT NOT NULL CHECK (vote IN (1, -1)),   -- 1=лайк, -1=дизлайк
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (insult_id, user_id)
);

ALTER TABLE insult_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_select"  ON insult_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert"  ON insult_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_update"  ON insult_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "votes_delete"  ON insult_votes FOR DELETE USING (auth.uid() = user_id);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS insult_votes_insult_id_idx ON insult_votes (insult_id);
CREATE INDEX IF NOT EXISTS insult_votes_user_id_idx   ON insult_votes (user_id);


-- ── RPC: топ оскорблений с количеством голосов ────────────────────────────
-- sort_by: 'score' (по очкам ЕС) | 'votes' (по разнице лайки−дизлайки)

CREATE OR REPLACE FUNCTION top_insults_scored(
  since    TIMESTAMPTZ,
  lim      INT,
  uid      UUID    DEFAULT NULL,
  sort_by  TEXT    DEFAULT 'score'
)
RETURNS TABLE (
  id          UUID,
  insult      TEXT,
  score       INT,
  created_at  TIMESTAMPTZ,
  likes       BIGINT,
  dislikes    BIGINT,
  my_vote     SMALLINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH base AS (
    SELECT
      r.id,
      r.insult,
      r.score,
      r.created_at,
      COALESCE(COUNT(v.vote) FILTER (WHERE v.vote  =  1), 0)                    AS likes,
      COALESCE(COUNT(v.vote) FILTER (WHERE v.vote  = -1), 0)                    AS dislikes,
      MAX(CASE WHEN v.user_id = uid THEN v.vote END)::SMALLINT                  AS my_vote
    FROM insult_records r
    LEFT JOIN insult_votes v ON v.insult_id = r.id
    WHERE r.created_at >= since
    GROUP BY r.id
  )
  SELECT id, insult, score, created_at, likes, dislikes, my_vote
  FROM base
  ORDER BY
    CASE WHEN sort_by = 'votes' THEN (likes - dislikes) END DESC NULLS LAST,
    CASE WHEN sort_by = 'score' THEN score              END DESC NULLS LAST,
    created_at DESC
  LIMIT lim;
$$;


-- ── RPC: случайное «избранное» оскорбление для главной страницы ───────────
-- Условия:
--   • не старше 3 дней
--   • данный пользователь ещё не голосовал
--   • дизлайков < 5  ИЛИ  отношение лайки/дизлайки >= 0.5

CREATE OR REPLACE FUNCTION get_featured_insult(uid UUID)
RETURNS TABLE (
  id       UUID,
  insult   TEXT,
  score    INT,
  likes    BIGINT,
  dislikes BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  WITH base AS (
    SELECT
      r.id,
      r.insult,
      r.score,
      COALESCE(COUNT(v.vote) FILTER (WHERE v.vote  =  1), 0) AS likes,
      COALESCE(COUNT(v.vote) FILTER (WHERE v.vote  = -1), 0) AS dislikes
    FROM insult_records r
    LEFT JOIN insult_votes v ON v.insult_id = r.id
    WHERE r.created_at >= now() - INTERVAL '3 days'
    GROUP BY r.id
  )
  SELECT id, insult, score, likes, dislikes
  FROM base
  WHERE
    -- не проголосовал
    NOT EXISTS (
      SELECT 1 FROM insult_votes uv
      WHERE uv.insult_id = base.id AND uv.user_id = uid
    )
    -- фильтр качества
    AND (
      dislikes < 5
      OR
      (dislikes >= 5 AND likes::FLOAT / NULLIF(dislikes, 0) >= 0.5)
    )
  ORDER BY random()
  LIMIT 1;
$$;


-- ── RPC: поставить/сменить/убрать голос ──────────────────────────────────
-- p_vote: 1 = лайк, -1 = дизлайк, 0 = убрать голос

CREATE OR REPLACE FUNCTION vote_insult(
  p_insult_id  UUID,
  p_uid        UUID,
  p_vote       SMALLINT
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_vote = 0 THEN
    DELETE FROM insult_votes
    WHERE insult_id = p_insult_id AND user_id = p_uid;
  ELSE
    INSERT INTO insult_votes (insult_id, user_id, vote)
    VALUES (p_insult_id, p_uid, p_vote)
    ON CONFLICT (insult_id, user_id)
    DO UPDATE SET vote = p_vote;
  END IF;
END;
$$;
