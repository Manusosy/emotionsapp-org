import React from 'react';
import { useParams } from 'react-router-dom';
import MessagesPage from '@/features/messaging/pages/MessagesPage';

interface SharedMessagesPageProps {
  userRole: 'patient' | 'mood_mentor';
  onCreateNewMessage?: () => void;
  initialPatientId?: string; // This can actually be either patient ID or mentor ID depending on context
}

export function SharedMessagesPage({ 
  userRole, 
  onCreateNewMessage, 
  initialPatientId: initialTargetUserId
}: SharedMessagesPageProps) {
  // This component simply wraps the MessagesPage component to ensure it fits within the dashboard layout
  // It passes through any necessary props and handles any role-specific logic

  // Get the conversation ID from URL params
  const { conversationId } = useParams<{ conversationId: string }>();
  
  // Use initialTargetUserId if provided, otherwise use conversationId from URL
  const targetUserId = initialTargetUserId || conversationId;
  
  console.log("SharedMessagesPage - targetUserId:", targetUserId);
  console.log("SharedMessagesPage - userRole:", userRole);
  console.log("SharedMessagesPage - initialTargetUserId:", initialTargetUserId);

  return (
    <MessagesPage 
      className={targetUserId ? "with-active-conversation" : ""} 
      initialConversationId={targetUserId}
      forceUserRole={userRole === 'mood_mentor' ? 'mentor' : 'patient'}
    />
  );
} 