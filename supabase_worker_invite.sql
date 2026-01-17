-- Add invite columns to workers table
-- Run this in Supabase SQL Editor

-- Allow password_hash to be NULL for invite system
ALTER TABLE workers ALTER COLUMN password_hash DROP NOT NULL;

-- Add invite-related columns
ALTER TABLE workers ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64) UNIQUE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_workers_invite_token ON workers(invite_token);

-- Update existing workers (they already have passwords set)
UPDATE workers SET password_set = TRUE WHERE password_hash IS NOT NULL AND password_set IS NULL;
