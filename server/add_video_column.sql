
-- Add video column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS video TEXT;
