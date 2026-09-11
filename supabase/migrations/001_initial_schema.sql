-- ============================================
-- Трекер посещаемости техникума
-- SQL миграции для Supabase (PostgreSQL)
-- ============================================

-- Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL CHECK (char_length(full_name) >= 2 AND char_length(full_name) <= 200),
  group_name TEXT NOT NULL CHECK (char_length(group_name) >= 1 AND char_length(group_name) <= 50),
  admission_threshold INTEGER NOT NULL DEFAULT 75 CHECK (admission_threshold >= 50 AND admission_threshold <= 100),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Таблица причин отсутствия
CREATE TABLE IF NOT EXISTS absence_reasons (
  id TEXT PRIMARY KEY,
  label TEXT UNIQUE NOT NULL CHECK (char_length(label) >= 2 AND char_length(label) <= 100),
  is_excused BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Сид для причин отсутствия
INSERT INTO absence_reasons (id, label, is_excused, sort_order) VALUES
  ('illness_certificate', 'Болезнь со справкой', TRUE, 1),
  ('personal', 'Личные', FALSE, 2),
  ('family', 'Семейные', TRUE, 3),
  ('valid_reason', 'Уважительная', TRUE, 4),
  ('skip', 'Прогул', FALSE, 5),
  ('academic_event', 'Учебное мероприятие', TRUE, 6),
  ('other', 'Другое', FALSE, 7)
ON CONFLICT (id) DO NOTHING;

-- Таблица посещаемости
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'late', 'absent')),
  absence_reason TEXT REFERENCES absence_reasons(id),
  late_minutes INTEGER CHECK (late_minutes >= 0 AND late_minutes <= 180),
  note TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance(user_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- ============================================
-- RLS (Row Level Security) политики
-- ============================================

-- Включаем RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_reasons ENABLE ROW LEVEL SECURITY;

-- Profiles: пользователь видит только свой профиль
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Attendance: пользователь видит только свои записи
CREATE POLICY "Users can view own attendance"
  ON attendance FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance"
  ON attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance"
  ON attendance FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attendance"
  ON attendance FOR DELETE
  USING (auth.uid() = user_id);

-- Absence reasons: все аутентифицированные пользователи могут читать
CREATE POLICY "Authenticated users can view absence reasons"
  ON absence_reasons FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================
-- Триггеры
-- ============================================

-- Автоматическое обновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Автоматическое создание профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, group_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'group_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- Realtime подписки
-- ============================================

-- Включаем Realtime для таблицы attendance
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
