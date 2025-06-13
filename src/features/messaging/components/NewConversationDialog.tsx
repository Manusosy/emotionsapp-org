import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageSquarePlus } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { patientService, moodMentorService } from '@/services';
import { PatientProfile } from '@/services/patient/patient.interface';
import { MoodMentorUI } from '@/services/mood-mentor/mood-mentor.interface';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';

interface NewConversationDialogProps {
  onConversationCreated: (conversationId: string) => void;
  handleCreateNewConversation: (otherUserId: string) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  onConversationCreated,
  handleCreateNewConversation,
  isOpen,
  onOpenChange
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<(PatientProfile | MoodMentorUI)[]>([]);
  const [searchResults, setSearchResults] = useState<(PatientProfile | MoodMentorUI)[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch all available users when dialog opens
  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, user?.user_metadata?.role]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults(allUsers);
    } else {
      const filteredUsers = allUsers.filter(user => 
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filteredUsers);
    }
  }, [searchQuery, allUsers]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let users: (PatientProfile | MoodMentorUI)[] = [];
      
      if (user?.user_metadata?.role === 'mood_mentor') {
        // Mood mentors can search for patients
        try {
          const patients = await patientService.getAllPatients();
          users = patients || [];
        } catch (patientError: any) {
          console.error("Error fetching patients:", patientError);
          toast.error("Failed to load patients.");
        }
      } else if (user?.user_metadata?.role === 'patient') {
        // Patients can search for mood mentors
        try {
          const mentors = await moodMentorService.getMoodMentors();
          users = mentors || [];
        } catch (mentorError: any) {
          console.error("Error fetching mentors:", mentorError);
          toast.error("Failed to load mood mentors.");
        }
      }
      
      // Filter out the current user if they're in the list
      users = users.filter(u => u.userId !== user?.id);
      
      setAllUsers(users);
      setSearchResults(users);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      toast.error("An error occurred while loading users.");
    } finally {
      setIsLoading(false);
    }
  };

  const onSelectUser = async (selectedUser: PatientProfile | MoodMentorUI) => {
    if (user?.id === selectedUser.userId) {
      toast.info("You cannot start a conversation with yourself.");
      return;
    }
    setIsLoading(true);
    await handleCreateNewConversation(selectedUser.userId);
    setIsLoading(false);
    onOpenChange(false); // Close dialog on conversation creation
    setSearchQuery(''); // Clear search
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" />
          New Chat
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Start a New Conversation</DialogTitle>
          <DialogDescription>
            Select a {user?.user_metadata?.role === 'mood_mentor' ? 'patient' : 'mood mentor'} to start chatting.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search for a ${user?.user_metadata?.role === 'mood_mentor' ? 'patient' : 'mood mentor'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>
        <ScrollArea className="h-[300px] w-full rounded-md border">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              {searchQuery.trim() 
                ? "No users found matching your search." 
                : `No ${user?.user_metadata?.role === 'mood_mentor' ? 'patients' : 'mood mentors'} available.`}
            </div>
          ) : (
            <div>
              {searchResults.map((result) => (
                <div
                  key={result.userId}
                  className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer border-b"
                  onClick={() => onSelectUser(result)}
                >
                  <FallbackAvatar
                    src={result.avatarUrl || undefined}
                    name={result.fullName}
                    className="h-10 w-10"
                  />
                  <div>
                    <p className="font-medium">{result.fullName}</p>
                    <p className="text-sm text-muted-foreground">{result.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}; 