-- クライアントユーザー認証テーブル
-- 1. client_usersテーブル作成
CREATE TABLE IF NOT EXISTS client_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
-- 2. RLS設定
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to client_users" ON client_users;
CREATE POLICY "Allow all access to client_users" ON client_users FOR ALL USING (true) WITH CHECK (true);
-- 3. インデックス
CREATE INDEX IF NOT EXISTS idx_client_users_client ON client_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_users_email ON client_users(email);