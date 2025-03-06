/*
  # Add image support and enhance conversations

  1. Changes
    - Add images column to store canvas drawings
    - Add description column for conversation context
    - Update timestamps to use timestamptz for better timezone support

  2. Security
    - RLS policies are inherited from the previous migration
    - No changes needed to security as we're just adding columns
*/

ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS images jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS description text DEFAULT '';

-- Ensure timestamps are using timestamptz
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'conversations' 
    AND column_name = 'created_at' 
    AND data_type != 'timestamp with time zone'
  ) THEN
    ALTER TABLE conversations 
    ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'UTC',
    ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'UTC';
  END IF;
END $$;