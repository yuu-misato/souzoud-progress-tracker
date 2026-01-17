-- Add invite_token column to client_users table
-- Run this in Supabase SQL Editor

ALTER TABLE client_users
ADD COLUMN IF NOT EXISTS invite_token VARCHAR(64) UNIQUE;

ALTER TABLE client_users
ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE client_users
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_client_users_invite_token ON client_users(invite_token);
