-- Create mentor_availability table for regular weekly schedule
CREATE TABLE mentor_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(mentor_id, day_of_week, start_time)
);

-- Create mentor_custom_availability table for specific dates
CREATE TABLE mentor_custom_availability (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  mentor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(mentor_id, date)
);

-- Add RLS policies
ALTER TABLE mentor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_custom_availability ENABLE ROW LEVEL SECURITY;

-- Policies for mentor_availability
CREATE POLICY "Mentors can manage their own availability"
  ON mentor_availability
  FOR ALL
  USING (auth.uid() = mentor_id);

CREATE POLICY "Everyone can view mentor availability"
  ON mentor_availability
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for mentor_custom_availability
CREATE POLICY "Mentors can manage their custom availability"
  ON mentor_custom_availability
  FOR ALL
  USING (auth.uid() = mentor_id);

CREATE POLICY "Everyone can view mentor custom availability"
  ON mentor_custom_availability
  FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_mentor_availability_updated_at
  BEFORE UPDATE ON mentor_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mentor_custom_availability_updated_at
  BEFORE UPDATE ON mentor_custom_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 