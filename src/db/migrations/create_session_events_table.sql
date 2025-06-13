-- Create session_events table for tracking session state changes
CREATE TABLE IF NOT EXISTS public.session_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  initiated_by TEXT NOT NULL,
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add RLS policies
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view events for their own appointments
CREATE POLICY "Users can view session events for their appointments" ON public.session_events 
  FOR SELECT 
  USING (
    auth.uid() IN (
      SELECT mentor_id FROM public.appointments WHERE id = appointment_id
      UNION
      SELECT patient_id FROM public.appointments WHERE id = appointment_id
    )
  );

-- Allow authenticated users to insert events for their own appointments
CREATE POLICY "Users can insert session events for their appointments" ON public.session_events 
  FOR INSERT 
  WITH CHECK (
    auth.uid() IN (
      SELECT mentor_id FROM public.appointments WHERE id = appointment_id
      UNION
      SELECT patient_id FROM public.appointments WHERE id = appointment_id
    )
  );

-- Create index on appointment_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_events_appointment_id ON public.session_events(appointment_id);

-- Create index on event_type for filtering
CREATE INDEX IF NOT EXISTS idx_session_events_event_type ON public.session_events(event_type); 