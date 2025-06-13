import React from 'react';
import { useParams } from 'react-router-dom';
import MessagesPage from '@/features/messaging/pages/MessagesPage';

interface SharedMessagesPageProps {
  userRole: 'patient' | 'mood_mentor';
  onCreateNewMessage?: () => void;
  initialPatientId?: string;
}

export function SharedMessagesPage({ 
  userRole, 
  onCreateNewMessage, 
                  initialPatientId
}: SharedMessagesPageProps) {
  // This component simply wraps the MessagesPage component to ensure it fits within the dashboard layout
  // It passes through any necessary props and handles any role-specific logic

  // Get the conversation ID from URL params
  const { conversationId } = useParams<{ conversationId: string }>();
  
  console.log("SharedMessagesPage - conversationId from URL:", conversationId);

  return (
    <div className="h-full">
      <MessagesPage 
        className={conversationId ? "with-active-conversation" : ""} 
        initialConversationId={conversationId}
      />
    </div>
  );
} 