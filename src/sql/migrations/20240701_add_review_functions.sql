-- Create or replace function to check if a patient can review an appointment
-- This function already exists in your database, keeping it here for reference
CREATE OR REPLACE FUNCTION public.can_patient_review_appointment(appointment_id UUID, patient_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  can_review BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM public.appointments a
    WHERE a.id = appointment_id
    AND a.patient_id = patient_uuid
    AND a.status = 'completed'
    AND (a.review_submitted IS NULL OR a.review_submitted = FALSE)
  ) INTO can_review;
  
  RETURN can_review;
END;
$$ LANGUAGE plpgsql;

-- Create a view to join reviews with patient data from patient_profiles
CREATE OR REPLACE VIEW public.mentor_reviews_with_patients AS
SELECT 
  mr.*,
  p.full_name as patient_name,
  p.avatar_url as patient_avatar
FROM 
  public.mentor_reviews mr
LEFT JOIN
  public.patient_profiles p ON mr.patient_id = p.id;

COMMENT ON VIEW public.mentor_reviews_with_patients IS 'View that joins mentor reviews with patient profile data';

-- Grant permissions for the view
GRANT SELECT ON public.mentor_reviews_with_patients TO authenticated; 