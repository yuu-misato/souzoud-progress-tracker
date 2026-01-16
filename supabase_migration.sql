-- 追加マイグレーション: 管理者認証とURL添付機能
-- 1. 管理者テーブル
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'admin' CHECK (role IN ('master', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admins(id),
    is_active BOOLEAN DEFAULT true
);
-- 2. stepsテーブルにURL列を追加
ALTER TABLE steps
ADD COLUMN IF NOT EXISTS url TEXT DEFAULT '';
-- 3. RLS設定（既存のポリシーを削除してから作成）
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to admins" ON admins;
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);
-- 4. マスター管理者を作成
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