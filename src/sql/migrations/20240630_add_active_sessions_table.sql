-- Create active_sessions table to track video call sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_audio_only BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL CHECK (status IN ('active', 'ended', 'disconnected')),
  last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS active_sessions_appointment_id_idx ON active_sessions(appointment_id);
CREATE INDEX IF NOT EXISTS active_sessions_user_id_idx ON active_sessions(user_id);
CREATE INDEX IF NOT EXISTS active_sessions_status_idx ON active_sessions(status);

-- Create RLS policies for active_sessions
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own sessions
CREATE POLICY active_sessions_select_policy ON active_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own sessions
CREATE POLICY active_sessions_insert_policy ON active_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY active_sessions_update_policy ON active_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to clean up stale sessions
CREATE OR REPLACE FUNCTION cleanup_stale_sessions()
RETURNS void AS $$
BEGIN
  -- Mark sessions as disconnected if no heartbeat for 5 minutes
  UPDATE active_sessions
  SET status = 'disconnected', ended_at = now()
  WHERE status = 'active' 
    AND last_heartbeat < now() - interval '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run every 5 minutes (if pg_cron extension is available)
-- Uncomment this if you have pg_cron extension enabled
-- SELECT cron.schedule('*/5 * * * *', 'SELECT cleanup_stale_sessions();'); 