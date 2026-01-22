-- Run this in Supabase SQL Editor to add location columns

-- Add city, state, country columns to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS country text DEFAULT 'CA';

-- Drop old location column if it exists
ALTER TABLE jobs DROP COLUMN IF EXISTS location;

-- Add city and country columns to candidates table (state already exists as 'location')
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS country text DEFAULT 'CA';

-- Drop old location column from candidates if it exists
ALTER TABLE candidates DROP COLUMN IF EXISTS location;
