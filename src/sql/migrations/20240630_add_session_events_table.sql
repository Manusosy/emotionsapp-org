-- Create session_events table to track video call events
CREATE TABLE IF NOT EXISTS session_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'mentor_joined', 
      'patient_joined', 
      'mentor_left', 
      'patient_left', 
      'session_ended', 
      'connection_issue'
    )
  ),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('mentor', 'patient', 'system')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS session_events_appointment_id_idx ON session_events(appointment_id);
CREATE INDEX IF NOT EXISTS session_events_event_type_idx ON session_events(event_type);
CREATE INDEX IF NOT EXISTS session_events_created_at_idx ON session_events(created_at);

-- Create RLS policies for session_events
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see events for appointments they're part of
CREATE POLICY session_events_select_policy ON session_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND (a.patient_id = auth.uid() OR a.mentor_id = auth.uid())
    )
  );

-- Create policy to allow users to insert events for appointments they're part of
CREATE POLICY session_events_insert_policy ON session_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = appointment_id
      AND (a.patient_id = auth.uid() OR a.mentor_id = auth.uid())
    )
  );

-- Create a function to get the latest session events for an appointment
CREATE OR REPLACE FUNCTION get_latest_session_events(appointment_id_param UUID, limit_param INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  appointment_id UUID,
  event_type TEXT,
  initiated_by TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT se.id, se.appointment_id, se.event_type, se.initiated_by, se.message, se.created_at
  FROM session_events se
  WHERE se.appointment_id = appointment_id_param
  ORDER BY se.created_at DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql; 