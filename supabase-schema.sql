-- HealthOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS vector;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  google_refresh_token TEXT, -- For Google Fit OAuth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ -- Soft delete support
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Google Fit daily metrics
CREATE TABLE fit_daily_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  steps INTEGER,
  distance_meters REAL,
  calories_burned INTEGER,
  active_minutes INTEGER,
  sleep_hours REAL,
  avg_heart_rate INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Ensure one record per user per date
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE fit_daily_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fit_daily_metrics
CREATE POLICY "Users can view own fit data" ON fit_daily_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own fit data" ON fit_daily_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fit data" ON fit_daily_metrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Lab reports metadata
CREATE TABLE lab_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  upload_date TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_reports
CREATE POLICY "Users can view own lab reports" ON lab_reports
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own lab reports" ON lab_reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Lab markers extracted from PDFs
CREATE TABLE lab_markers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  lab_report_id UUID REFERENCES lab_reports(id) ON DELETE CASCADE,
  marker_name TEXT NOT NULL,
  value REAL,
  unit TEXT,
  reference_range TEXT,
  taken_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE lab_markers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_markers
CREATE POLICY "Users can view own lab markers" ON lab_markers
  FOR SELECT USING (auth.uid() = user_id);

-- Message embeddings for RAG chat
CREATE TABLE message_embeddings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE message_embeddings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_embeddings
CREATE POLICY "Users can view own message embeddings" ON message_embeddings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own message embeddings" ON message_embeddings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_fit_daily_metrics_user_date ON fit_daily_metrics(user_id, date DESC);
CREATE INDEX idx_lab_markers_user_taken ON lab_markers(user_id, taken_at DESC);
CREATE INDEX idx_message_embeddings_user ON message_embeddings(user_id, created_at DESC);

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user(); 