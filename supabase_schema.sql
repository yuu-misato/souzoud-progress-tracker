-- Supabase SQL: テーブル作成
-- クライアントテーブル
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- プロジェクトテーブル
CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT NOT NULL,
    client_id TEXT REFERENCES clients(id),
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- 工程テーブル
CREATE TABLE steps (
    id SERIAL,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'current', 'completed')),
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (project_id, id)
);
-- インデックス
CREATE INDEX idx_projects_client_id ON projects(client_id);
CREATE INDEX idx_steps_project_id ON steps(project_id);
-- RLS (Row Level Security) を有効化
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;
-- 全ユーザーがread/writeできるポリシー（匿名アクセス用）
CREATE POLICY "Allow all access to clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to steps" ON steps FOR ALL USING (true) WITH CHECK (true);
-- サンプルデータ
INSERT INTO clients (id, name)
VALUES ('DEMO01', '株式会社サンプル');
INSERT INTO projects (id, name, client, client_id, description)
VALUES (
        'PROJ0001',
        'コーポレートサイトリニューアル',
        '株式会社サンプル',
        'DEMO01',
        'コーポレートサイトの全面リニューアルプロジェクト'
    ),
    (
        'PROJ0002',
        '採用サイト制作',
        '株式会社サンプル',
        'DEMO01',
        '新卒・中途採用向けサイトの新規制作'
    );
INSERT INTO steps (
        project_id,
        step_order,
        name,
        description,
        status,
        completed_at
    )
VALUES (
        'PROJ0001',
        1,
        'ヒアリング・要件定義',
        '・ターゲットユーザー：30-50代のビジネスパーソン
・必須ページ：トップ、会社概要、サービス、お問い合わせ
・レスポンシブ対応必須',
        'completed',
        NOW() - INTERVAL '12 days'
    ),
    (
        'PROJ0001',
        2,
        '企画・コンセプト設計',
        '・コンセプト：信頼感と先進性の両立
・カラー：ネイビー×ホワイト基調
・競合分析完了',
        'completed',
        NOW() - INTERVAL '10 days'
    ),
    (
        'PROJ0001',
        3,
        'デザイン制作',
        '・TOPページ + 下層5ページ
・SP/PC両対応
・バナー3種含む',
        'completed',
        NOW() - INTERVAL '5 days'
    ),
    (
        'PROJ0001',
        4,
        '制作・開発',
        '・WordPress実装
・お問い合わせフォーム設置
・Google Analytics連携',
        'current',
        NULL
    ),
    ('PROJ0001', 5, 'レビュー・修正', '', 'pending', NULL),
    ('PROJ0001', 6, '最終確認', '', 'pending', NULL),
    ('PROJ0001', 7, '納品・公開', '', 'pending', NULL);
INSERT INTO steps (
        project_id,
        step_order,
        name,
        description,
        status,
        completed_at
    )
VALUES (
        'PROJ0002',
        1,
        'ヒアリング・要件定義',
        '・新卒・中途両方に対応
・社員インタビュー5名分
・エントリーフォーム連携必須',
        'completed',
        NOW() - INTERVAL '5 days'
    ),
    (
        'PROJ0002',
        2,
        '企画・コンセプト設計',
        '・コンセプト検討中
・競合採用サイト調査',
        'current',
        NULL
    ),
    ('PROJ0002', 3, 'デザイン制作', '', 'pending', NULL),
    ('PROJ0002', 4, '制作・開発', '', 'pending', NULL),
    ('PROJ0002', 5, 'レビュー・修正', '', 'pending', NULL),
    ('PROJ0002', 6, '納品・公開', '', 'pending', NULL);