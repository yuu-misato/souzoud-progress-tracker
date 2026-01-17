-- 追加マイグレーション: 管理者認証とURL添付機能
-- 1. 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('master', 'admin', 'director')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admins(id),
    is_active BOOLEAN DEFAULT true
);
-- 1.5. role constraintの更新（既存テーブル用）
ALTER TABLE admins DROP CONSTRAINT IF EXISTS admins_role_check;
ALTER TABLE admins
ADD CONSTRAINT admins_role_check CHECK (role IN ('master', 'admin', 'director'));
-- 2. stepsテーブルにURL列を追加
ALTER TABLE steps
ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
-- 3. ディレクター担当プロジェクトテーブル
CREATE TABLE IF NOT EXISTS director_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id, project_id)
);
-- 4. RLS設定（既存のポリシーを削除してから作成）
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to admins" ON admins;
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE director_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to director_projects" ON director_projects;
CREATE POLICY "Allow all access to director_projects" ON director_projects FOR ALL USING (true) WITH CHECK (true);
-- 5. マスター管理者を作成
-- メール: yusaku.suzuki@sou-zou-do.com
-- パスワード: Yusaku0310!
INSERT INTO admins (email, password_hash, name, role)
VALUES (
        'yusaku.suzuki@sou-zou-do.com',
        '079aac84dd93adab7687f0d97eb723362d4443e2e929e442a791a7d0bb61adf1',
        '鈴木 勇作',
        'master'
    ) ON CONFLICT (email) DO
UPDATE
SET password_hash = EXCLUDED.password_hash,
    role = 'master',
    is_active = true;