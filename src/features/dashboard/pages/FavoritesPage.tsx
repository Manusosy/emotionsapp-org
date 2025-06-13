import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, MapPin, Calendar, Check, Users, Search } from 'lucide-react';
import { useAuth } from '@/contexts/authContext';
import { format, addDays } from 'date-fns';
import { toast } from '@/components/ui/use-toast';

interface MoodMentor {
  id: string;
  name: string;
  credentials: string;
  verified: boolean;
  avatar: string;
  location: string;
  nextAvailability: string;
  lastBooking: string;
  specialty: string;
}

interface SupportGroup {
  id: string;
  name: string;
  members: number;
  nextMeeting: string;
  description: string;
}

const FavoritesPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('moodMentors');

  // Get today's date for realistic availability dates
  const today = new Date();
  
  // Mood Mentor data that matches the design in the image
  const favoriteMoodMentors: MoodMentor[] = [
    {
      id: '1',
      name: 'Dr. Ruby Perrin',
      credentials: 'PhD in Psychology, Mental Health Specialist',
      specialty: 'Depression & Anxiety Specialist',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      location: 'Kigali, Rwanda',
      nextAvailability: format(addDays(today, 4), 'dd MMM yyyy'),
      lastBooking: '15 Apr 2025'
    },
    {
      id: '2',
      name: 'Dr. Darren Elder',
      credentials: 'MSc in Clinical Psychology, Certified Counselor',
      specialty: 'Trauma & PTSD Specialist',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      location: 'Musanze, Rwanda',
      nextAvailability: format(addDays(today, 6), 'dd MMM yyyy'),
      lastBooking: '10 Apr 2025'
    },
    {
      id: '3',
      name: 'Dr. Deborah Angel',
      credentials: 'MA in Counseling Psychology, Mood Mentor',
      specialty: 'Relationship & Family Specialist',
      verified: true,
      avatar: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80',
      location: 'Kigali, Rwanda',
      nextAvailability: format(addDays(today, 8), 'dd MMM yyyy'),
      lastBooking: '22 Mar 2025'
    }
  ];

  // Mock data for favorite support groups
  const favoriteSupportGroups: SupportGroup[] = [
    {
      id: '1',
      name: 'Anxiety Support Circle',
      members: 24,
      nextMeeting: 'Wed, Apr 25 • 7:00 PM',
      description: 'A supportive community for those dealing with anxiety disorders in Rwanda.',
    },
    {
      id: '2',
      name: 'Mindfulness Meditation Group',
      members: 18,
      nextMeeting: 'Fri, Apr 27 • 6:30 PM',
      description: 'Weekly guided meditation sessions for mental wellness and stress reduction.',
    },
    {
      id: '3',
      name: 'Trauma Recovery Network',
      members: 12,
      nextMeeting: 'Mon, Apr 30 • 5:00 PM',
      description: 'A safe space for trauma survivors to share experiences and healing strategies.',
    }
  ];

  const handleViewProfile = (moodMentorId: string, mentorName: string) => {
    // Generate name-based slug
    const nameSlug = mentorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    navigate(`/mood-mentor/${nameSlug}?id=${moodMentorId}`);
  };

  const handleBookNow = (moodMentorId: string) => {
    navigate(`/booking?moodMentor=${moodMentorId}`);
  };

  const handleRemoveFavorite = (id: string) => {
    // In a real app, this would update the database
    toast({
      title: "Success",
      description: "Removed from favorites",
      variant: "default",
    });
  };

  const handleBrowseMoodMentors = () => {
    navigate('/mood-mentor');
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Favorites</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="hidden md:flex">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            <Button className="hidden md:flex">
              <Heart className="h-4 w-4 mr-2" />
              Add Favorite
            </Button>
          </div>
        </div>
        
        <Tabs defaultValue="moodMentors" className="w-full" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="moodMentors" className="gap-2">
              <Users className="h-4 w-4" />
              Favorite Mood Mentors
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <Users className="h-4 w-4" />
              Support Groups
            </TabsTrigger>
          </TabsList>

          <TabsContent value="moodMentors">
            {favoriteMoodMentors.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {favoriteMoodMentors.map((moodMentor) => (
                  <Card key={moodMentor.id} className="overflow-hidden border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-0">
                      <div className="relative">
                        <div 
                          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-md cursor-pointer hover:bg-red-50 transition-colors"
                          onClick={() => handleRemoveFavorite(moodMentor.id)}
                        >
                          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        </div>
                        <div className="flex flex-col items-center p-4 text-center border-b border-gray-100">
                          <div className="relative mb-2">
                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-md">
                              <img 
                                src={moodMentor.avatar}
                                alt={moodMentor.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {moodMentor.verified && (
                              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-1 text-white border-2 border-white">
                                <Check className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <h3 className="text-xl font-bold text-gray-900">
                              {moodMentor.name}
                            </h3>
                            {moodMentor.verified && (
                              <Check className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <p className="text-blue-600 mb-1">{moodMentor.specialty}</p>
                          <p className="text-gray-600 text-sm">{moodMentor.credentials}</p>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          <div className="flex items-center gap-2.5">
                            <Calendar className="h-6 w-6 text-blue-500" />
                            <div>
                              <p className="text-sm text-gray-500">Next Availability :</p>
                              <p className="font-medium text-gray-700">{moodMentor.nextAvailability}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2.5">
                            <MapPin className="h-6 w-6 text-blue-500" />
                            <div>
                              <p className="text-sm text-gray-500">Location :</p>
                              <p className="font-medium text-gray-700">{moodMentor.location}</p>
                            </div>
                          </div>
                          
                          <div className="bg-blue-50 p-3 rounded-md">
                            <p className="text-sm text-center text-blue-800">
                              Last Book on {moodMentor.lastBooking}
                            </p>
                          </div>
                          
                          <div className="flex gap-3 pt-1">
                            <Button 
                              variant="outline" 
                              className="flex-1 rounded-full border-gray-300 hover:bg-gray-50"
                              onClick={() => handleViewProfile(moodMentor.id, moodMentor.name)}
                            >
                              View Profile
                            </Button>
                            <Button 
                              className="flex-1 rounded-full bg-blue-600 hover:bg-blue-700"
                              onClick={() => handleBookNow(moodMentor.id)}
                            >
                              Book Now
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 rounded-lg border border-gray-200 bg-gray-50">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-gray-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorite mood mentors yet</h3>
                <p className="text-gray-500 mb-4 text-center max-w-md">
                  Browse our list of qualified mood mentors and add your favorites to this list for easy access.
                </p>
                <Button 
                  onClick={handleBrowseMoodMentors}
                  className="gap-2"
                >
                  <Search className="h-4 w-4" />
                  Browse Mood Mentors
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="groups">
            {favoriteSupportGroups.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {favoriteSupportGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg">{group.name}</h3>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500"
                          onClick={() => handleRemoveFavorite(group.id)}
                        >
                          <Heart className="h-5 w-5 fill-current" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{group.description}</p>
                      <div className="flex flex-col mt-4 space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-1" />
                          {group.nextMeeting}
                        </div>
                        <div className="flex items-start gap-1">
                          <Badge variant="secondary">{group.members} members</Badge>
                        </div>
                      </div>
                      <div className="flex justify-end mt-4 gap-2">
                        <Button variant="outline">View Details</Button>
                        <Button>Join Meeting</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-lg border border-gray-200">
                <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">No favorite groups</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  You haven't added any support groups to your favorites yet. 
                  Browse available groups and find the right one for you.
                </p>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Browse Support Groups
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FavoritesPage;
