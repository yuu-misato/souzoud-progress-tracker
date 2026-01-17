-- Fix: Allow password_hash to be NULL for invite system
-- Run this in Supabase SQL Editor

-- Remove NOT NULL constraint from password_hash
ALTER TABLE client_users ALTER COLUMN password_hash DROP NOT NULL;

-- Update existing users without password_set flag
UPDATE client_users SET password_set = TRUE WHERE password_hash IS NOT NULL AND password_set IS NULL;
