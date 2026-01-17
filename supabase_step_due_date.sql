-- Add due_date column to steps table
ALTER TABLE steps ADD COLUMN IF NOT EXISTS due_date DATE;

-- Add url column if not exists (for consistency)
ALTER TABLE steps ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';

-- Add due_date column to projects table (納品予定日)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS due_date DATE;
