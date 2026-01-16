-- ディレクター機能追加マイグレーション
-- 1. adminsテーブルにdirector権限を追加
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins
ADD CONSTRAINT admins_role_check CHECK (role IN ('master', 'admin', 'director'));
-- 2. ディレクターとプロジェクトの関連テーブルを作成
CREATE TABLE IF NOT EXISTS director_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id, project_id)
);
-- 3. RLS設定
ALTER TABLE director_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to director_projects" ON director_projects;
CREATE POLICY "Allow all access to director_projects" ON director_projects FOR ALL USING (true) WITH CHECK (true);
-- 4. インデックス
CREATE INDEX IF NOT EXISTS idx_director_projects_admin ON director_projects(admin_id);
CREATE INDEX IF NOT EXISTS idx_director_projects_project ON director_projects(project_id);