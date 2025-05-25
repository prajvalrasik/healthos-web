-- Add processed_at column to lab_reports table
ALTER TABLE lab_reports 
ADD COLUMN processed_at timestamp with time zone; 