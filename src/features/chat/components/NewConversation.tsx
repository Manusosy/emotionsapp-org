import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FallbackAvatar from '@/components/ui/fallback-avatar';
import { useAuth } from '@/contexts/authContext';
import { moodMentorService } from '@/services';
import SupabaseMessagingService from '@/features/messaging/services/messaging.service';
import { toast } from 'sonner';
import { Search, MessageSquare } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { MoodMentorUI } from '@/services/mood-mentor/mood-mentor.interface';

// Create an instance of the messaging service
const messagingService = new SupabaseMessagingService();

interface MoodMentor {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  specialty?: string;
  bio?: string;
}

export default function NewConversation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [moodMentors, setMoodMentors] = useState<MoodMentor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isStartingConversation, setIsStartingConversation] = useState(false);

  useEffect(() => {
    async function fetchMoodMentors() {
      setIsLoading(true);
      try {
        // The getMoodMentors method returns MoodMentorUI[] directly, not a ServiceResponse
        const mentorsData = await moodMentorService.getMoodMentors();
        
        // Transform the data to match our component's expected format
        const formattedMentors = mentorsData.map(mentor => ({
          id: mentor.id,
          name: mentor.fullName,
          email: mentor.email,
          avatar_url: mentor.avatarUrl,
          specialty: mentor.specialty,
          bio: mentor.bio
        }));
        
        setMoodMentors(formattedMentors);
      } catch (err) {
        console.error('Error fetching mood mentors:', err);
        toast.error('An error occurred while loading mood mentors');
      } finally {
        setIsLoading(false);
      }
    }

    fetchMoodMentors();
  }, []);

  const handleStartConversation = async (mentorId: string) => {
    if (!user?.id) {
      toast.error('You need to be logged in to start a conversation');
      return;
    }
    
    setIsStartingConversation(true);
    try {
      const { data: conversationId, error } = await messagingService.getOrCreateConversation(
        user.id,
        mentorId
      );
      
      if (error) {
        toast.error('Failed to start conversation');
        console.error(error);
      } else if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (err) {
      console.error('Error starting conversation:', err);
      toast.error('An error occurred while starting the conversation');
    } finally {
      setIsStartingConversation(false);
    }
  };

  const filteredMentors = searchQuery
    ? moodMentors.filter(
        (mentor) =>
          mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (mentor.specialty && mentor.specialty.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : moodMentors;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Start a New Conversation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search mood mentors by name or specialty..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredMentors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? 'No mood mentors match your search' : 'No mood mentors available'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMentors.map((mentor) => (
              <div
                key={mentor.id}
                className="flex items-start p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
              >
                <FallbackAvatar
                  src={mentor.avatar_url}
                  name={mentor.name}
                  className="h-12 w-12 mr-4"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{mentor.name}</h3>
                  {mentor.specialty && (
                    <p className="text-sm text-muted-foreground">{mentor.specialty}</p>
                  )}
                  {mentor.bio && (
                    <p className="text-sm mt-2 line-clamp-2">{mentor.bio}</p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => handleStartConversation(mentor.id)}
                    disabled={isStartingConversation}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 