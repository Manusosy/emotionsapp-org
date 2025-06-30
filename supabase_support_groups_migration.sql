-- Support Groups System Migration
-- Run this SQL in your Supabase dashboard SQL editor

-- Create support_groups table
CREATE TABLE IF NOT EXISTS support_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  group_type VARCHAR(50) NOT NULL CHECK (group_type IN ('anxiety', 'depression', 'stress', 'relationships', 'grief', 'addiction', 'trauma', 'other')),
  meeting_type VARCHAR(20) NOT NULL CHECK (meeting_type IN ('online', 'in-person', 'hybrid')),
  max_participants INTEGER NOT NULL DEFAULT 20 CHECK (max_participants > 0 AND max_participants <= 100),
  current_participants INTEGER NOT NULL DEFAULT 0,
  location VARCHAR(255),
  meeting_schedule JSONB NOT NULL DEFAULT '[]',
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_url VARCHAR(512),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create group_sessions table
CREATE TABLE IF NOT EXISTS group_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES support_groups(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  recording_url VARCHAR(512),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create group_session_attendance table
CREATE TABLE IF NOT EXISTS group_session_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attended BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  UNIQUE(session_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_groups_mentor_id ON support_groups(mentor_id);
CREATE INDEX IF NOT EXISTS idx_support_groups_group_type ON support_groups(group_type);
CREATE INDEX IF NOT EXISTS idx_support_groups_is_active ON support_groups(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_status ON group_members(status);
CREATE INDEX IF NOT EXISTS idx_group_sessions_group_id ON group_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_group_sessions_date ON group_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_group_session_attendance_session_id ON group_session_attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_group_session_attendance_user_id ON group_session_attendance(user_id);

-- Function to update current_participants count
CREATE OR REPLACE FUNCTION update_group_participants_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE support_groups 
  SET current_participants = (
    SELECT COUNT(*) 
    FROM group_members 
    WHERE group_id = COALESCE(NEW.group_id, OLD.group_id) 
    AND status = 'active'
  )
  WHERE id = COALESCE(NEW.group_id, OLD.group_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update participant count
DROP TRIGGER IF EXISTS trigger_update_group_participants ON group_members;
CREATE TRIGGER trigger_update_group_participants
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_participants_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_support_groups_updated_at ON support_groups;
CREATE TRIGGER trigger_support_groups_updated_at
  BEFORE UPDATE ON support_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_group_sessions_updated_at ON group_sessions;
CREATE TRIGGER trigger_group_sessions_updated_at
  BEFORE UPDATE ON group_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE support_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_session_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_groups
CREATE POLICY "Mentors can view their own groups" ON support_groups
  FOR SELECT USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can create groups" ON support_groups
  FOR INSERT WITH CHECK (mentor_id = auth.uid());

CREATE POLICY "Mentors can update their own groups" ON support_groups
  FOR UPDATE USING (mentor_id = auth.uid());

CREATE POLICY "Mentors can delete their own groups" ON support_groups
  FOR DELETE USING (mentor_id = auth.uid());

CREATE POLICY "Users can view active groups" ON support_groups
  FOR SELECT USING (is_active = true);

-- RLS Policies for group_members
CREATE POLICY "Users can view group members for groups they belong to" ON group_members
  FOR SELECT USING (
    user_id = auth.uid() OR 
    group_id IN (
      SELECT id FROM support_groups WHERE mentor_id = auth.uid()
    ) OR
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own membership" ON group_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Mentors can manage members of their groups" ON group_members
  FOR ALL USING (
    group_id IN (
      SELECT id FROM support_groups WHERE mentor_id = auth.uid()
    )
  );

-- RLS Policies for group_sessions
CREATE POLICY "Group members can view sessions" ON group_sessions
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    ) OR
    group_id IN (
      SELECT id FROM support_groups WHERE mentor_id = auth.uid()
    )
  );

CREATE POLICY "Mentors can manage sessions for their groups" ON group_sessions
  FOR ALL USING (
    group_id IN (
      SELECT id FROM support_groups WHERE mentor_id = auth.uid()
    )
  );

-- RLS Policies for group_session_attendance
CREATE POLICY "Users can view their own attendance" ON group_session_attendance
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Mentors can view attendance for their group sessions" ON group_session_attendance
  FOR SELECT USING (
    session_id IN (
      SELECT gs.id FROM group_sessions gs
      JOIN support_groups sg ON gs.group_id = sg.id
      WHERE sg.mentor_id = auth.uid()
    )
  );

CREATE POLICY "Users can record their own attendance" ON group_session_attendance
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own attendance" ON group_session_attendance
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Mentors can manage attendance for their sessions" ON group_session_attendance
  FOR ALL USING (
    session_id IN (
      SELECT gs.id FROM group_sessions gs
      JOIN support_groups sg ON gs.group_id = sg.id
      WHERE sg.mentor_id = auth.uid()
    )
  );

-- Insert some sample data for testing
INSERT INTO support_groups (name, description, group_type, meeting_type, max_participants, location, meeting_schedule, mentor_id, room_url) VALUES
('Anxiety Support Circle', 'A safe space to discuss anxiety management techniques and share experiences.', 'anxiety', 'online', 15, NULL, '[{"day": "Monday", "time": "18:00", "frequency": "weekly"}]', (SELECT id FROM auth.users WHERE email LIKE '%mentor%' LIMIT 1), 'https://daily.co/anxiety-support-circle'),
('Depression Recovery Group', 'Supporting each other through depression recovery with evidence-based strategies.', 'depression', 'hybrid', 12, 'Community Center Room A', '[{"day": "Wednesday", "time": "19:00", "frequency": "weekly"}]', (SELECT id FROM auth.users WHERE email LIKE '%mentor%' LIMIT 1), 'https://daily.co/depression-recovery'),
('Stress Management Workshop', 'Learn practical stress management techniques in a supportive environment.', 'stress', 'in-person', 20, 'Wellness Center', '[{"day": "Friday", "time": "17:30", "frequency": "weekly"}]', (SELECT id FROM auth.users WHERE email LIKE '%mentor%' LIMIT 1), NULL),
('Relationship Harmony', 'Improving communication and building healthier relationships.', 'relationships', 'online', 10, NULL, '[{"day": "Tuesday", "time": "20:00", "frequency": "weekly"}]', (SELECT id FROM auth.users WHERE email LIKE '%mentor%' LIMIT 1), 'https://daily.co/relationship-harmony'),
('Grief & Loss Support', 'A compassionate space for those dealing with loss and grief.', 'grief', 'online', 8, NULL, '[{"day": "Thursday", "time": "18:30", "frequency": "weekly"}]', (SELECT id FROM auth.users WHERE email LIKE '%mentor%' LIMIT 1), 'https://daily.co/grief-support');

-- Note: The sample data insertion will only work if there are users with mentor roles in your auth.users table
-- If the insertion fails, that's okay - the tables and structure are ready for use

-- Success message
SELECT 'Support Groups system has been successfully created!' as message; 