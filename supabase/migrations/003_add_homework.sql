-- ============================================
-- Таблица домашних заданий
-- ============================================

CREATE TABLE IF NOT EXISTS homework (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL CHECK (char_length(subject) >= 1 AND char_length(subject) <= 100),
  description TEXT NOT NULL CHECK (char_length(description) >= 1 AND char_length(description) <= 1000),
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes TEXT CHECK (char_length(COALESCE(notes, '')) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_homework_user_id ON homework(user_id);
CREATE INDEX IF NOT EXISTS idx_homework_due_date ON homework(due_date);
CREATE INDEX IF NOT EXISTS idx_homework_status ON homework(status);

-- RLS
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

-- Политики
DROP POLICY IF EXISTS "homework_select_own" ON homework;
DROP POLICY IF EXISTS "homework_insert_own" ON homework;
DROP POLICY IF EXISTS "homework_update_own" ON homework;
DROP POLICY IF EXISTS "homework_delete_own" ON homework;

CREATE POLICY "homework_select_own" ON homework
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "homework_insert_own" ON homework
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "homework_update_own" ON homework
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "homework_delete_own" ON homework
  FOR DELETE USING (auth.uid() = user_id);

-- Триггер для updated_at
CREATE TRIGGER update_homework_updated_at
  BEFORE UPDATE ON homework
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE homework;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE homework;
  EXCEPTION
    WHEN OTHERS THEN NULL;
  END;
END $$;
