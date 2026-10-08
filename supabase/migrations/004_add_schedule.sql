-- ============================================
-- Таблица расписания пар
-- ============================================

CREATE TABLE IF NOT EXISTS schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  subject TEXT NOT NULL CHECK (char_length(subject) >= 1 AND char_length(subject) <= 100),
  teacher TEXT CHECK (char_length(COALESCE(teacher, '')) <= 100),
  room TEXT CHECK (char_length(COALESCE(room, '')) <= 50),
  notes TEXT CHECK (char_length(COALESCE(notes, '')) <= 500),
  week_type TEXT NOT NULL DEFAULT 'every' CHECK (week_type IN ('every', 'odd', 'even')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_schedule_user_id ON schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule(day_of_week);

-- RLS
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "schedule_select_own" ON schedule;
DROP POLICY IF EXISTS "schedule_insert_own" ON schedule;
DROP POLICY IF EXISTS "schedule_update_own" ON schedule;
DROP POLICY IF EXISTS "schedule_delete_own" ON schedule;

CREATE POLICY "schedule_select_own" ON schedule
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "schedule_insert_own" ON schedule
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedule_update_own" ON schedule
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "schedule_delete_own" ON schedule
  FOR DELETE USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_schedule_updated_at
  BEFORE UPDATE ON schedule
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE schedule;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE schedule;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
END $$;
