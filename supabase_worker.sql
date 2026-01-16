-- 作業者・タスク割り当て・提出管理テーブル
-- 1. 作業者テーブル
CREATE TABLE IF NOT EXISTS workers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);
-- 2. タスク割り当てテーブル
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    step_id UUID NOT NULL REFERENCES steps(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    director_id UUID REFERENCES admins(id),
    due_date TIMESTAMP WITH TIME ZONE,
    notes TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK (
        status IN (
            'pending',
            'in_progress',
            'submitted',
            'approved'
        )
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES admins(id),
    UNIQUE(step_id, worker_id)
);
-- 3. 成果物提出テーブル
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES task_assignments(id) ON DELETE CASCADE,
    stage TEXT NOT NULL CHECK (stage IN ('draft', 'revision', 'final')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES admins(id),
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    comment TEXT DEFAULT '',
    url TEXT DEFAULT ''
);
-- 4. プロジェクトに担当ディレクター列を追加
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS director_id UUID REFERENCES admins(id);
-- 5. RLS設定
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to workers" ON workers;
CREATE POLICY "Allow all access to workers" ON workers FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to task_assignments" ON task_assignments;
CREATE POLICY "Allow all access to task_assignments" ON task_assignments FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all access to submissions" ON submissions;
CREATE POLICY "Allow all access to submissions" ON submissions FOR ALL USING (true) WITH CHECK (true);
-- 6. インデックス
CREATE INDEX IF NOT EXISTS idx_task_assignments_worker ON task_assignments(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_step ON task_assignments(step_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_director ON task_assignments(director_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_projects_director ON projects(director_id);