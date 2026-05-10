-- Migration: Add updated_at timestamp support
-- Purpose: Enable conflict detection and realtime sync

-- Add updated_at column if it doesn't exist
ALTER TABLE cases
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create or replace the function to auto-update the timestamp
CREATE OR REPLACE FUNCTION update_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS cases_updated_at_trigger ON cases;

-- Create trigger to auto-update timestamp on every UPDATE
CREATE TRIGGER cases_updated_at_trigger
BEFORE UPDATE ON cases
FOR EACH ROW
EXECUTE FUNCTION update_cases_updated_at();
