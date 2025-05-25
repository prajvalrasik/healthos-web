-- Add deleted_at columns to tables that might be missing them
-- This migration is idempotent - it won't fail if columns already exist

-- Add deleted_at to chat_conversations if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_conversations' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE chat_conversations ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add deleted_at to message_embeddings if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_embeddings' 
        AND column_name = 'deleted_at'
    ) THEN
        ALTER TABLE message_embeddings ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create indexes for soft delete queries
CREATE INDEX IF NOT EXISTS idx_chat_conversations_deleted_at ON chat_conversations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_message_embeddings_deleted_at ON message_embeddings(deleted_at);
CREATE INDEX IF NOT EXISTS idx_fit_daily_metrics_deleted_at ON fit_daily_metrics(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lab_reports_deleted_at ON lab_reports(deleted_at);
CREATE INDEX IF NOT EXISTS idx_lab_markers_deleted_at ON lab_markers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);

-- Update RLS policies to exclude soft-deleted records
-- Note: This will recreate policies, so existing ones will be dropped first

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own chat conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can insert their own chat conversations" ON chat_conversations;

-- Recreate policies with soft delete filtering
CREATE POLICY "Users can view their own active chat conversations" ON chat_conversations
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY "Users can insert their own chat conversations" ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Update other table policies if needed
DROP POLICY IF EXISTS "Users can view own fit data" ON fit_daily_metrics;
CREATE POLICY "Users can view own active fit data" ON fit_daily_metrics
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view own lab reports" ON lab_reports;
CREATE POLICY "Users can view own active lab reports" ON lab_reports
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view own lab markers" ON lab_markers;
CREATE POLICY "Users can view own active lab markers" ON lab_markers
  FOR SELECT USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Add comment for documentation
COMMENT ON COLUMN chat_conversations.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted';
COMMENT ON COLUMN message_embeddings.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted';
COMMENT ON COLUMN fit_daily_metrics.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted';
COMMENT ON COLUMN lab_reports.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted';
COMMENT ON COLUMN lab_markers.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted';
COMMENT ON COLUMN profiles.deleted_at IS 'Soft delete timestamp - records with this set are considered deleted'; 