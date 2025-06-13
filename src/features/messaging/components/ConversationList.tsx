import React, { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { ConversationWithLastMessage } from '@/features/messaging/types';
import { useAuth } from '@/contexts/authContext';
import { patientService, moodMentorService } from '@/services';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export interface ConversationItem {
  id: string;
  otherUser: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  lastMessage?: {
    content: string;
    timestamp: string;
    unread: boolean;
  };
}

interface ConversationListProps {
  conversations: ConversationWithLastMessage[];
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  isLoading: boolean;
  availableContacts?: Array<{
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  }>;
}

interface DisplayContact {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  lastMessage: string;
  lastMessageTime?: string;
  hasUnread: boolean;
  unreadCount: number;
  conversationId: string | null;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  isLoading,
  availableContacts = []
}: ConversationListProps) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Array<{
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  }>>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);

  // Load available contacts (patients or mentors) if not provided via props
  useEffect(() => {
    // If we already have contacts from props, use those
    if (availableContacts && availableContacts.length > 0) {
      console.log("Using provided contacts:", availableContacts);
      setContacts(availableContacts);
      return;
    }
    
    const loadContacts = async () => {
      if (!user) return;
      
      setLoadingContacts(true);
      try {
        // Check if user is a mood mentor
        const isMoodMentor = user.user_metadata?.role === 'mood_mentor';
        console.log("Loading contacts for user role:", isMoodMentor ? "mood_mentor" : "patient");
        
        if (isMoodMentor) {
          // Load patients for mood mentors
          const patients = await patientService.getAllPatients();
          console.log("Loaded patients:", patients);
          if (patients && patients.length > 0) {
            const formattedPatients = patients.map(patient => ({
              id: patient.userId,
              fullName: patient.fullName,
              email: patient.email || '',
              avatarUrl: patient.avatarUrl
            }));
            console.log("Formatted patient contacts:", formattedPatients);
            setContacts(formattedPatients);
          } else {
            console.warn("No patients found for mood mentor");
          }
        } else {
          // Load mood mentors for patients
          const mentors = await moodMentorService.getMoodMentors();
          console.log("Loaded mentors:", mentors);
          if (mentors && mentors.length > 0) {
            const formattedMentors = mentors.map(mentor => ({
              id: mentor.userId,
              fullName: mentor.fullName,
              email: mentor.email || '',
              avatarUrl: mentor.avatarUrl
            }));
            console.log("Formatted mentor contacts:", formattedMentors);
            setContacts(formattedMentors);
          } else {
            console.warn("No mentors found for patient");
          }
        }
      } catch (error) {
        console.error('Error loading contacts:', error);
        toast.error("Failed to load contacts");
      } finally {
        setLoadingContacts(false);
      }
    };

    loadContacts();
  }, [user, availableContacts]);

  // Find existing conversations for contacts
  const getConversationForContact = (contactId: string) => {
    return conversations.find(conv => 
      (conv.other_participant?.id === contactId) || 
      (conv.user_id !== user?.id && conv.user_id === contactId)
    );
  };

  // Handle selecting a contact or conversation
  const handleSelectContact = (contactId: string, conversationId: string | null) => {
    console.log("Contact selected:", contactId, "Conversation ID:", conversationId);
    
    // Find the contact information
    let selectedContact = null;
    
    // Check if this is a contact from our contacts list
    selectedContact = contacts.find(contact => contact.id === contactId);
    if (selectedContact) {
      console.log("Selected contact details:", selectedContact);
    }
    
    // Pass the ID to the parent component
    onSelectConversation(conversationId || contactId);
  };

  // Combine conversations and contacts for display
  const getDisplayList = (): DisplayContact[] => {
    // First, show active conversations
    const activeContacts: DisplayContact[] = conversations.map(conv => {
      // Convert last_message_time to string or undefined (not null)
      let messageTime: string | undefined = undefined;
      if (conv.last_message_time) {
        messageTime = conv.last_message_time;
      }
      
      // Calculate unread count - for now we just show 1 if has_unread is true
      const unreadCount = conv.has_unread ? 1 : 0;
      
      return {
        id: (conv.user_id !== user?.id ? conv.user_id : '') || conv.other_participant?.id || '',
        name: conv.other_participant?.fullName || 'Unknown User',
        email: conv.other_participant?.email || '',
        avatarUrl: conv.other_participant?.avatarUrl,
        lastMessage: conv.last_message_content || 'Start a conversation',
        lastMessageTime: messageTime,
        hasUnread: conv.has_unread,
        unreadCount: unreadCount,
        conversationId: conv.conversation_id
      };
    });
    
    // Then add contacts who don't have active conversations
    const contactsWithoutConversations: DisplayContact[] = contacts.filter(contact => 
      !conversations.some(conv => 
        (conv.other_participant?.id === contact.id) || 
        (conv.user_id !== user?.id && conv.user_id === contact.id)
      )
    ).map(contact => ({
      id: contact.id,
      name: contact.fullName,
      email: contact.email,
      avatarUrl: contact.avatarUrl,
      lastMessage: 'Start a conversation',
      lastMessageTime: undefined,
      hasUnread: false,
      unreadCount: 0,
      conversationId: null
    }));
    
    // Sort the list: conversations with unread messages first, then by last message time
    const sortedList = [...activeContacts, ...contactsWithoutConversations].sort((a, b) => {
      // Unread messages first
      if (a.hasUnread && !b.hasUnread) return -1;
      if (!a.hasUnread && b.hasUnread) return 1;
      
      // Then sort by last message time (most recent first)
      if (a.lastMessageTime && b.lastMessageTime) {
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      }
      
      // Conversations with messages before those without
      if (a.lastMessageTime && !b.lastMessageTime) return -1;
      if (!a.lastMessageTime && b.lastMessageTime) return 1;
      
      // Finally sort alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return sortedList;
  };

  const displayList = getDisplayList();

  if (isLoading || loadingContacts) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {displayList.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No contacts found
          </div>
        ) : (
          displayList.map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                (item.conversationId && item.conversationId === activeConversationId) || 
                (!item.conversationId && item.id === activeConversationId)
                  ? 'bg-primary/10'
                  : item.hasUnread 
                    ? 'bg-primary/5 hover:bg-primary/10' 
                    : 'hover:bg-muted'
              }`}
              onClick={() => handleSelectContact(item.id, item.conversationId)}
            >
              <div className="relative">
                <FallbackAvatar
                  src={item.avatarUrl || undefined}
                  name={item.name}
                  className="h-12 w-12"
                />
                {item.hasUnread && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.unreadCount > 0 ? (item.unreadCount > 9 ? '9+' : item.unreadCount) : '1'}
                  </span>
                )}
              </div>
              <div className="ml-3 overflow-hidden flex-1">
                <div className="flex justify-between">
                  <p className={`${item.hasUnread ? 'font-bold' : 'font-medium'} truncate`}>
                    {item.name}
                  </p>
                  {item.lastMessageTime && (
                    <p className={`text-xs ${item.hasUnread ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                      {formatDistanceToNow(new Date(item.lastMessageTime), { addSuffix: true })}
                    </p>
                  )}
                </div>
                <p className={`text-sm truncate ${item.hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                  {item.lastMessage}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </ScrollArea>
  );
} 