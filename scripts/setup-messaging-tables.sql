-- Messaging System Tables Setup
-- This script creates all necessary tables and views for the messaging system

-- Drop existing objects to prevent conflicts
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();
DROP VIEW IF EXISTS public.user_conversations_view;

-- Drop existing policies first to avoid conflicts
DO $$
BEGIN
    -- Drop policies on conversations table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their own conversations') THEN
        DROP POLICY "Users can view their own conversations" ON public.conversations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can create conversations') THEN
        DROP POLICY "Users can create conversations" ON public.conversations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can update their own conversations') THEN
        DROP POLICY "Users can update their own conversations" ON public.conversations;
    END IF;
    
    -- Drop policies on conversation_participants table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can view participants in their conversations') THEN
        DROP POLICY "Users can view participants in their conversations" ON public.conversation_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can add participants to conversations they create') THEN
        DROP POLICY "Users can add participants to conversations they create" ON public.conversation_participants;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversation_participants' AND policyname = 'Users can update their own participant status') THEN
        DROP POLICY "Users can update their own participant status" ON public.conversation_participants;
    END IF;
    
    -- Drop policies on messages table
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can view messages in their conversations') THEN
        DROP POLICY "Users can view messages in their conversations" ON public.messages;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can send messages to conversations they are part of') THEN
        DROP POLICY "Users can send messages to conversations they are part of" ON public.messages;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Users can update their own messages') THEN
        DROP POLICY "Users can update their own messages" ON public.messages;
    END IF;
END
$$;

-- Check if appointments table exists and create the conversations table with appropriate reference
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
        -- Create with reference to appointments
        CREATE TABLE IF NOT EXISTS public.conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
    ELSE
        -- Create without reference
        CREATE TABLE IF NOT EXISTS public.conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            appointment_id UUID,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
    END IF;
END
$$;

-- Enable RLS on conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Table: conversation_participants
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  last_read_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (conversation_id, user_id)
);

-- Enable RLS on conversation_participants
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;

-- Table: messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  attachment_url TEXT,
  attachment_type TEXT
);

-- Enable RLS on messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Conversations: Users can only access conversations they are part of
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = id
      AND user_id = auth.uid()
    )
  );

-- Conversation Participants: Users can only see participants in conversations they are part of
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversation_participants.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add participants to conversations they create" ON public.conversation_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own participant status" ON public.conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Messages: Users can only see messages in conversations they are part of
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to conversations they are part of" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- Create functions for realtime subscriptions
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation's last_message_at timestamp
  UPDATE conversations
  SET last_message_at = NEW.created_at, updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new messages
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_message();

-- Create view for user conversations
CREATE VIEW public.user_conversations_view AS
SELECT 
  c.id AS conversation_id,
  c.appointment_id,
  cp.user_id,
  (
    SELECT m.id 
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_id,
  (
    SELECT m.sender_id 
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_sender_id,
  (
    SELECT m.content 
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_content,
  (
    SELECT m.created_at 
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_time,
  (
    SELECT m.read_at 
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_read_at,
  cp.last_read_at,
  (
    SELECT COUNT(*)::int
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.sender_id != cp.user_id
    AND (m.read_at IS NULL OR m.read_at > cp.last_read_at)
    AND m.deleted_at IS NULL
  ) > 0 AS has_unread,
  (
    SELECT COUNT(*)::int
    FROM messages m
    WHERE m.conversation_id = c.id
    AND m.sender_id != cp.user_id
    AND (m.read_at IS NULL OR m.read_at > cp.last_read_at)
    AND m.deleted_at IS NULL
  ) AS unread_count,
  c.created_at,
  (
    SELECT ocp.user_id
    FROM conversation_participants ocp
    WHERE ocp.conversation_id = c.id
    AND ocp.user_id != cp.user_id
    LIMIT 1
  ) AS other_user_id
FROM conversations c
JOIN conversation_participants cp ON c.id = cp.conversation_id;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.conversation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT ON public.user_conversations_view TO authenticated; 