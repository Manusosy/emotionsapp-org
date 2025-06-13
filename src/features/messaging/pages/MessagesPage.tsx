import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ConversationList } from '@/features/messaging/components/ConversationList';
import { MessageBubble } from '@/features/messaging/components/MessageBubble';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';
import { Send, PaperclipIcon, Phone, Video, MessageSquarePlus } from 'lucide-react';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { Spinner } from '@/components/ui/spinner';
import { useMessages } from '@/features/messaging/hooks/useMessages';
import { useMessaging } from '@/features/messaging/hooks/useMessaging';
import MessagingSetupInstructions from '@/features/messaging/components/MessagingSetupInstructions';
import SupabaseMessagingService from '@/features/messaging/services/messaging.service';
import { patientService, moodMentorService } from '@/services';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

// Create an instance of the messaging service
const messagingService = new SupabaseMessagingService();

// Props interface for the MessagesPage component
interface MessagesPageProps {
  className?: string;
  initialConversationId?: string;
}

// Define a type for contact information
interface ContactInfo {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
}

export default function MessagesPage({ className = '', initialConversationId }: MessagesPageProps) {
  const { conversationId: urlConversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [contactInfo, setContactInfo] = useState<ContactInfo | null>(null);
  const [availableContacts, setAvailableContacts] = useState<ContactInfo[]>([]);
  const [hasAutoSelectedContact, setHasAutoSelectedContact] = useState(false);
  
  // NEW: Track the currently selected contact directly for UI updates
  const [selectedContact, setSelectedContact] = useState<ContactInfo | null>(null);
  
  // Use either the prop or URL param for the conversation ID
  const conversationIdToUse = initialConversationId || urlConversationId;
  
  console.log("MessagesPage - conversationId:", { 
    initialConversationId, 
    urlConversationId, 
    conversationIdToUse 
  });
  
  // Check if messaging system is set up
  const { isMessagingSetup, isCheckingSetup, error: setupError } = useMessaging();
  const messagingSystemNeedsSetup = isMessagingSetup === false;

  // Check if the ID is a UUID (conversation) or a user ID
  const isUUID = (id: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  };

  // Load available contacts (patients or mentors)
  useEffect(() => {
    const loadAvailableContacts = async () => {
      if (!user) return;
      
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
            setAvailableContacts(formattedPatients);
            
            // Auto-select the first contact if none is selected
            if (!selectedContact && formattedPatients.length > 0) {
              setSelectedContact(formattedPatients[0]);
            }
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
            setAvailableContacts(formattedMentors);
            
            // Auto-select the first contact if none is selected
            if (!selectedContact && formattedMentors.length > 0) {
              setSelectedContact(formattedMentors[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading available contacts:', error);
      }
    };

    loadAvailableContacts();
  }, [user, selectedContact]);

  // Load contact info if we're viewing a user ID instead of a conversation ID
  useEffect(() => {
    const loadContactInfo = async () => {
      if (!conversationIdToUse || !user?.id) return;
      
      // Check if the ID is a UUID (conversation) or a user ID
      if (isUUID(conversationIdToUse)) {
        console.log("ID is a UUID, skipping contact info loading");
        return;
      }
      
      console.log("Loading contact info for ID:", conversationIdToUse);
      
      // First check if we already have this contact in our available contacts
      const existingContact = availableContacts.find(contact => contact.id === conversationIdToUse);
      if (existingContact) {
        console.log("Found contact in available contacts:", existingContact);
        setContactInfo(existingContact);
        setSelectedContact(existingContact); // Update selected contact too
        return;
      }
      
      // Set a temporary contact info to improve UX while loading
      const targetUserId = conversationIdToUse;
      const tempContact = {
        id: targetUserId,
        fullName: 'Loading...',
        email: '',
        avatarUrl: null
      };
      setContactInfo(tempContact);
      setSelectedContact(tempContact); // Update selected contact too
      
      try {
        // Try to load as a patient first
        console.log("Attempting to load patient data");
        const patientResult = await patientService.getPatientById(targetUserId);
        console.log("Patient lookup result:", patientResult);
        
        if (patientResult.data) {
          console.log("Found patient data:", patientResult.data);
          const patientInfo = {
            id: patientResult.data.userId,
            fullName: patientResult.data.fullName,
            email: patientResult.data.email || '',
            avatarUrl: patientResult.data.avatarUrl
          };
          setContactInfo(patientInfo);
          setSelectedContact(patientInfo); // Update selected contact too
          return;
        }
        
        // Then try as a mood mentor
        console.log("Attempting to load mood mentor data");
        const mentorResult = await moodMentorService.getMoodMentorById(targetUserId);
        console.log("Mentor lookup result:", mentorResult);
        
        if (mentorResult.data) {
          console.log("Found mentor data:", mentorResult.data);
          const mentorInfo = {
            id: mentorResult.data.userId,
            fullName: mentorResult.data.fullName,
            email: mentorResult.data.email || '',
            avatarUrl: mentorResult.data.avatarUrl
          };
          setContactInfo(mentorInfo);
          setSelectedContact(mentorInfo); // Update selected contact too
          return;
        }
        
        // If both fail, try to get user info directly from Supabase Auth
        console.log("Attempting to load user data from Auth");
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(targetUserId);
          if (userData && userData.user) {
            console.log("Found user in auth:", userData.user);
            const userInfo = {
              id: userData.user.id,
              fullName: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'User',
              email: userData.user.email || '',
              avatarUrl: userData.user.user_metadata?.avatar_url
            };
            setContactInfo(userInfo);
            setSelectedContact(userInfo); // Update selected contact too
            return;
          }
        } catch (authError) {
          console.warn("Error fetching from auth:", authError);
        }
        
        console.error("Could not find contact info for ID:", targetUserId);
        toast.error("Could not find user information");
        
        // Set a fallback contact info with the user ID
        const fallbackContact = {
          id: targetUserId,
          fullName: `User ${targetUserId.substring(0, 8)}...`,
          email: '',
          avatarUrl: null
        };
        setContactInfo(fallbackContact);
        setSelectedContact(fallbackContact); // Update selected contact too
      } catch (error) {
        console.error("Error loading contact info:", error);
        toast.error("Error loading user information");
        
        // Set a fallback contact info with the user ID
        const fallbackContact = {
          id: conversationIdToUse,
          fullName: `User ${conversationIdToUse.substring(0, 8)}...`,
          email: '',
          avatarUrl: null
        };
        setContactInfo(fallbackContact);
        setSelectedContact(fallbackContact); // Update selected contact too
      }
    };
    
    loadContactInfo();
  }, [conversationIdToUse, user?.id, availableContacts]);

  // Create a conversation if we're viewing a user ID instead of a conversation ID
  useEffect(() => {
    const createConversation = async () => {
      if (!conversationIdToUse || !user?.id || isUUID(conversationIdToUse) || isCreatingConversation) return;
      
      setIsCreatingConversation(true);
      try {
        console.log("Creating conversation between", user.id, "and", conversationIdToUse);
        
        // Load contact info immediately for better UX
        const contactData = availableContacts.find(contact => contact.id === conversationIdToUse);
        if (contactData) {
          setContactInfo(contactData);
          setSelectedContact(contactData); // Update selected contact too
        }
        
        // Short delay to ensure the UI has time to update with the contact info
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const result = await messagingService.getOrCreateConversation(user.id, conversationIdToUse);
        console.log("Conversation creation result:", result);
        
        if (result.data) {
          console.log("Successfully created/found conversation:", result.data);
          
          // Short delay before redirecting to ensure UI is updated
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Replace the URL with the actual conversation ID
          const path = window.location.pathname.replace(conversationIdToUse, result.data);
          console.log(`Redirecting from ${window.location.pathname} to ${path}`);
          navigate(path, { replace: true });
        } else {
          console.error("Failed to create conversation:", result.error);
          toast.error(`Failed to create conversation: ${result.error}`);
        }
      } catch (error) {
        console.error("Error creating conversation:", error);
        toast.error("Error creating conversation. Please try again.");
      } finally {
        // Small delay before removing loading state
        setTimeout(() => {
          setIsCreatingConversation(false);
        }, 500);
      }
    };
    
    createConversation();
  }, [conversationIdToUse, user?.id, navigate, isCreatingConversation, availableContacts]);

  const { 
    conversations, 
    activeConversationId, 
    messages, 
    newMessageContent, 
    isLoadingConversations, 
    isLoadingMessages, 
    isSendingMessage,
    otherParticipant,
    messagesEndRef,
    setNewMessageContent,
    handleSendMessage,
    handleSelectConversation,
    handleCreateNewConversation,
  } = useMessages({ initialConversationId: conversationIdToUse });

  // Handle selecting a conversation or creating a new one
  const onSelectConversation = (id: string) => {
    // Check if this is an existing conversation or a new contact
    const existingConversation = conversations.find(c => c.conversation_id === id);
    
    // Get the base path from the current URL
    const currentPath = window.location.pathname;
    const basePath = currentPath.includes('/patient-dashboard') 
      ? '/patient-dashboard/messages'
      : currentPath.includes('/mood-mentor-dashboard')
        ? '/mood-mentor-dashboard/messages'
        : '/messages';
    
    // Find contact info right away and update UI immediately
    const contactData = availableContacts.find(contact => contact.id === id);
    if (contactData) {
      console.log("Found contact data for immediate UI update:", contactData);
      setSelectedContact(contactData);
      setContactInfo(contactData);
    }
    
    if (existingConversation) {
      // For existing conversations, update selected contact from conversation data
      if (existingConversation.other_participant) {
        const conversationContact = {
          id: existingConversation.other_participant.id,
          fullName: existingConversation.other_participant.fullName || 'Unknown User',
          email: existingConversation.other_participant.email || '',
          avatarUrl: existingConversation.other_participant.avatarUrl
        };
        setSelectedContact(conversationContact);
      }
      
      // Navigate to existing conversation
      navigate(`${basePath}/${id}`);
      handleSelectConversation(id);
    } else {
      // This is a contact ID, find contact info and set it immediately
      // Navigate to contact ID
      navigate(`${basePath}/${id}`);
    }
  };

  // Auto-select the first contact or conversation when the page loads
  useEffect(() => {
    // Only auto-select if:
    // 1. We don't already have a conversation ID in the URL
    // 2. We haven't already auto-selected
    // 3. We have contacts or conversations available
    // 4. We're not in a loading state
    if (!urlConversationId && 
        !hasAutoSelectedContact && 
        !isLoadingConversations && 
        !isCreatingConversation) {
      
      // First check if we have any active conversations
      if (conversations.length > 0) {
        console.log("Auto-selecting first conversation:", conversations[0].conversation_id);
        setHasAutoSelectedContact(true);
        onSelectConversation(conversations[0].conversation_id);
        return;
      }
      
      // If no conversations, check if we have any contacts
      if (availableContacts.length > 0) {
        console.log("Auto-selecting first contact:", availableContacts[0].id);
        setHasAutoSelectedContact(true);
        
        // Set contact info immediately for better UX while navigating
        setContactInfo({
          id: availableContacts[0].id,
          fullName: availableContacts[0].fullName,
          email: availableContacts[0].email,
          avatarUrl: availableContacts[0].avatarUrl
        });
        
        onSelectConversation(availableContacts[0].id);
        return;
      }
    }
  }, [
    urlConversationId, 
    hasAutoSelectedContact, 
    conversations, 
    availableContacts, 
    isLoadingConversations, 
    isCreatingConversation
  ]);

  // Redirect to a default conversation if none is active in the URL but conversations exist
  useEffect(() => {
    if (!urlConversationId && activeConversationId && conversations.length > 0) {
      // Get the base path from the current URL
      const currentPath = window.location.pathname;
      const basePath = currentPath.includes('/patient-dashboard') 
        ? '/patient-dashboard/messages'
        : currentPath.includes('/mood-mentor-dashboard')
          ? '/mood-mentor-dashboard/messages'
          : '/messages';
      
      navigate(`${basePath}/${activeConversationId}`, { replace: true });
    }
  }, [urlConversationId, activeConversationId, conversations, navigate]);

  // Handle sending a message - automatically selecting the first contact if needed
  const handleSendMessageWithAutoSelect = () => {
    // If no conversation is active but we have contacts, select the first one
    if (!activeConversationId && !isCreatingConversation && availableContacts.length > 0) {
      console.log("Auto-selecting first contact before sending:", availableContacts[0].id);
      onSelectConversation(availableContacts[0].id);
      
      // Store the message to send after the conversation is created
      sessionStorage.setItem('pendingMessage', newMessageContent);
      
      return;
    }
    
    // Normal message sending
    handleSendMessage();
  };

  // Check for pending message after a conversation is created
  useEffect(() => {
    if (activeConversationId) {
      const pendingMessage = sessionStorage.getItem('pendingMessage');
      if (pendingMessage) {
        console.log("Found pending message, sending it now");
        setNewMessageContent(pendingMessage);
        sessionStorage.removeItem('pendingMessage');
        
        // Wait a bit to make sure conversation is fully created
        setTimeout(() => {
          handleSendMessage();
        }, 500);
      }
    }
  }, [activeConversationId]);

  const handleKeyboardSend = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageWithAutoSelect();
    }
  };

  // Add this effect to determine user role
  const [userRole, setUserRole] = useState<'patient' | 'mood_mentor' | null>(null);
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user?.id)
          .single();

        if (error) throw error;
        setUserRole(profile.role);
      } catch (error) {
        console.error('Error checking user role:', error);
      }
    };

    if (user) {
      checkUserRole();
    }
  }, [user]);

  const handleCallButton = async (type: 'video' | 'audio') => {
    if (!displayParticipant) {
      toast({
        title: "No participant selected",
        description: "Please select someone to call first.",
        variant: "destructive"
      });
      return;
    }

    if (userRole === 'patient') {
      // For patients, redirect to book an appointment
      navigate('/book-appointment', {
        state: { mentorId: displayParticipant.id, callType: type }
      });
      toast({
        title: "Book an Appointment",
        description: `Please schedule an appointment for a ${type} call with your mood mentor.`
      });
    } else if (userRole === 'mood_mentor') {
      // For mentors, show message about appointment-only calls
      toast({
        title: "Appointment Required",
        description: "Video and audio calls are only available during scheduled appointments.",
        variant: "destructive"
      });
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">Please log in to view messages.</p>
      </div>
    );
  }

  // Show loading state while checking if messaging system is set up
  if (isCheckingSetup) {
    return (
      <div className="flex justify-center items-center h-full">
        <p className="text-muted-foreground">Checking messaging system...</p>
      </div>
    );
  }

  // If messaging system needs setup, show the setup instructions
  if (messagingSystemNeedsSetup) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-6">Messaging System Setup</h2>
        <MessagingSetupInstructions />
      </div>
    );
  }

  // Determine if we should show the contact info while creating a conversation
  const showContactInfo = contactInfo && !isUUID(conversationIdToUse || '');
  
  // ALWAYS display a contact - prioritize the manually selected contact
  const displayParticipant = selectedContact || (showContactInfo 
    ? contactInfo 
    : otherParticipant || (availableContacts.length > 0 
        ? {
            id: availableContacts[0].id,
            fullName: availableContacts[0].fullName,
            email: availableContacts[0].email,
            avatarUrl: availableContacts[0].avatarUrl
          }
        : null));
        
  console.log("Current display participant:", displayParticipant);

  return (
    <div className={`flex h-full bg-background ${className}`}>
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-border h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Messages</h2>
        </div>
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId || conversationIdToUse}
          onSelectConversation={onSelectConversation}
          isLoading={isLoadingConversations}
          availableContacts={availableContacts}
        />
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col h-full">
        {/* Always show a chat interface if we have any contacts */}
        {(activeConversationId || showContactInfo || availableContacts.length > 0) ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FallbackAvatar
                  src={displayParticipant?.avatarUrl || undefined}
                  name={displayParticipant?.fullName || 'Select a contact'}
                  className="h-10 w-10"
                />
                <div>
                  <h3 className="font-medium">
                    {displayParticipant?.fullName || (isCreatingConversation ? 'Loading...' : 'Select a contact')}
                  </h3>
                  {displayParticipant?.email && (
                    <p className="text-sm text-muted-foreground">
                      {displayParticipant.email}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Audio call"
                  onClick={() => handleCallButton('audio')}
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  title="Video call"
                  onClick={() => handleCallButton('video')}
                >
                  <Video className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Messages area */}
            <ScrollArea className="flex-1 p-4">
              {isLoadingMessages || isCreatingConversation ? (
                <div className="flex flex-col justify-center items-center h-full">
                  <Spinner size="lg" />
                  <p className="mt-4 text-muted-foreground">
                    {isCreatingConversation ? 'Creating conversation...' : 'Loading messages...'}
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p>No messages yet</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      content={message.content}
                      timestamp={message.created_at}
                      isCurrentUser={message.sender_id === user?.id}
                      avatarUrl={
                        message.sender_id === user?.id
                          ? user?.user_metadata?.avatar_url
                          : displayParticipant?.avatarUrl
                      }
                      senderName={
                        message.sender_id === user?.id
                          ? user?.user_metadata?.name || 'You'
                          : displayParticipant?.fullName || 'User'
                      }
                      read={!!message.read_at}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message input */}
            <div className="p-4 border-t border-border flex items-end gap-2">
              <Button variant="ghost" size="icon" title="Attach file">
                <PaperclipIcon className="h-5 w-5" />
              </Button>
              <Textarea
                placeholder="Type your message..."
                className="flex-1 resize-none min-h-[40px] max-h-[150px]"
                value={newMessageContent}
                onChange={(e) => setNewMessageContent(e.target.value)}
                onKeyDown={handleKeyboardSend}
                disabled={isCreatingConversation}
              />
              <Button 
                onClick={handleSendMessageWithAutoSelect} 
                disabled={isSendingMessage || isCreatingConversation || !newMessageContent.trim()}
                className="transition-all"
              >
                {isSendingMessage ? <Spinner size="sm" /> : <Send className="h-5 w-5" />}
                <span className="sr-only">Send message</span>
              </Button>
            </div>
          </>
        ) : ( 
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <MessageSquarePlus className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select a contact to start chatting</h3>
            <p className="text-sm mb-4">Choose a contact from the list on the left to start a conversation.</p>
          </div>
        )}
      </div>
    </div>
  );
} 