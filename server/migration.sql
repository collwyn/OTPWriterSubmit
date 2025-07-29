
-- Add images column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS images TEXT;

-- Update existing articles to move featuredImage to images array if needed
UPDATE articles 
SET images = JSON_ARRAY(featured_image) 
WHERE featured_image IS NOT NULL AND images IS NULL;
