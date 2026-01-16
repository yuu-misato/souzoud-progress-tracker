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
-- 3. RLS設定
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to admins" ON admins FOR ALL USING (true) WITH CHECK (true);
-- 4. マスター管理者を作成（初期パスワード: admin123）
-- 注意: 本番環境では必ずパスワードを変更してください
-- パスワードハッシュはSHA-256: 240be518fabd2724ddb6f04eeb9d5b07fb9fd1d0461739d1d9b9a1e9b6c4b5d3 = admin123
INSERT INTO admins (email, password_hash, name, role)
VALUES (
        'admin@souzoud.co.jp',
        '240be518fabd2724ddb6f04eeb9d5b4e5f4b5d3',
        'マスター管理者',
        'master'
    ) ON CONFLICT (email) DO NOTHING;