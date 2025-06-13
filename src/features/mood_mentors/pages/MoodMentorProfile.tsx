import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { moodMentorService } from '@/services';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, GraduationCap, Briefcase, MapPin, Languages, Calendar, Clock, DollarSign } from 'lucide-react';
import BookingButton from '@/features/booking/components/BookingButton';
import { useAuth } from '@/contexts/authContext';
import { toast } from 'sonner';

// Mood Mentor profile interface for the UI
interface MoodMentorProfile {
  id: string;
  userId: string;
  fullName: string;
  email?: string;
  bio: string;
  specialty?: string;
  hourlyRate: number;
  avatarUrl: string;
  isFree: boolean;
  availabilityStatus?: 'available' | 'unavailable' | 'busy';
  gender?: string;
  languages: string[];
  education: Array<{degree: string, institution: string, year: string}>;
  experience: Array<{title: string, place: string, duration: string}>;
  therapyTypes: string[];
  specialties: string[];
  sessionDuration: string;
  location: string;
  nameSlug: string;
  isProfileComplete: boolean;
  rating?: number;
  reviewCount?: number;
}

// Helper function to format currency 
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function MoodMentorProfile() {
  const { name } = useParams<{ name: string }>();
  const [searchParams] = useSearchParams();
  const mentorId = searchParams.get('id');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [mentor, setMentor] = useState<MoodMentorProfile | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMentorData = async () => {
      setLoading(true);
      try {
        // First try to get mentor by slug
        if (name) {
          const { success, data, error } = await moodMentorService.getMoodMentorBySlug(name);
          
          if (success && data) {
            const formattedData = {
              id: data.id,
              userId: data.userId,
              fullName: data.fullName || "Mood Mentor",
              bio: data.bio || '',
              specialty: data.specialty || "Mental Health Support",
              hourlyRate: data.hourlyRate || 0,
              avatarUrl: data.avatarUrl || '',
              isFree: data.isFree || false,
              availabilityStatus: data.availabilityStatus || "available",
              gender: data.gender || "Prefer not to say",
              languages: data.languages || ['English'],
              education: data.education || [],
              experience: data.experience || [],
              therapyTypes: data.therapyTypes || [],
              specialties: data.specialties || [],
              sessionDuration: data.sessionDuration || '30 Min',
              location: data.location || 'Available Online',
              nameSlug: data.nameSlug || name,
              isProfileComplete: data.isProfileComplete || false,
              rating: data.rating || 5,
              reviewCount: reviews.length || 0
            };
            
            setMentor(formattedData);
            
            // Set page title to mentor name
            document.title = `${formattedData.fullName} - Mood Mentor Profile`;
            
            // Also fetch reviews
            const mentorReviews = await moodMentorService.getMoodMentorReviews(data.id);
            setReviews(mentorReviews);
            
            // Update reviewCount after we have the reviews
            setMentor(prev => prev ? {...prev, reviewCount: mentorReviews.length} : null);
          } else if (mentorId) {
            // If slug lookup fails but we have an ID, try getting by ID
            const { success, data, error } = await moodMentorService.getMoodMentorById(mentorId);
            
            if (success && data) {
              const formattedData = {
                id: data.id,
                userId: data.userId,
                fullName: data.fullName || "Mood Mentor",
                bio: data.bio || '',
                specialty: data.specialty || "Mental Health Support",
                hourlyRate: data.hourlyRate || 0,
                avatarUrl: data.avatarUrl || '',
                isFree: data.isFree || false,
                availabilityStatus: data.availabilityStatus || "available",
                gender: data.gender || "Prefer not to say",
                languages: data.languages || ['English'],
                education: data.education || [],
                experience: data.experience || [],
                therapyTypes: data.therapyTypes || [],
                specialties: data.specialties || [],
                sessionDuration: data.sessionDuration || '30 Min',
                location: data.location || 'Available Online',
                nameSlug: data.nameSlug || name || '',
                isProfileComplete: data.isProfileComplete || false,
                rating: data.rating || 5,
                reviewCount: reviews.length || 0
              };
              
              setMentor(formattedData);
              
              // Also fetch reviews
              const mentorReviews = await moodMentorService.getMoodMentorReviews(data.id);
              setReviews(mentorReviews);
              
              // Update reviewCount after we have the reviews
              setMentor(prev => prev ? {...prev, reviewCount: mentorReviews.length} : null);
              
              // Update URL to include proper name slug if available
              if (data.nameSlug && data.nameSlug !== name) {
                navigate(`/mood-mentor/${data.nameSlug}?id=${data.id}`, { replace: true });
              }
            } else {
              setError('Could not find the mood mentor profile');
            }
          } else {
            setError('Could not find the mood mentor profile');
          }
        }
      } catch (err) {
        console.error('Error fetching mentor data:', err);
        setError('Failed to load the mood mentor profile');
      } finally {
        setLoading(false);
      }
    };

    fetchMentorData();
  }, [name, mentorId, navigate]);

  const handleBooking = () => {
    // Check if user is a mood mentor
    if (user?.user_metadata?.role === 'mood_mentor') {
      toast.error("As a mood mentor, you cannot book appointments with other mentors");
      return;
    }

    // Proceed with booking for patients
    navigate('/booking', {
      state: {
        mentorId: mentor?.userId,
        callType: 'video'
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto mt-10 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Loading profile information...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !mentor) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto mt-10 px-4 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Profile Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              {error || "We couldn't find the mood mentor profile you're looking for"}
            </p>
            <Button 
              className="mt-6" 
              onClick={() => navigate('/mood-mentors')}
            >
              Browse All Mood Mentors
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto mt-10 mb-20 px-4">
        <div className="mb-10 text-center">
          <div className="inline-flex rounded-full px-4 py-1 bg-primary-100 text-primary-800 mb-4">
            Professional Profile
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            {mentor.fullName || "Mood Mentor"} Profile
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            View detailed information about your mental health ambassador, their qualifications, experience, and
            available appointment slots.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sidebar with mentor info */}
          <div className="md:col-span-1">
            <Card className="sticky top-8">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarImage src={mentor.avatarUrl} alt={mentor.fullName} />
                    <AvatarFallback>{mentor.fullName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h2 className="text-xl font-bold">{mentor.fullName}</h2>
                  
                  <div className="flex items-center mt-1 mb-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="ml-1 font-medium">
                      {mentor.rating?.toFixed(1) || "5.0"}
                    </span>
                    <span className="ml-1 text-muted-foreground text-sm">
                      ({mentor.reviewCount || reviews.length || 0} reviews)
                    </span>
                  </div>
                  
                  {/* Show educational degree if available, otherwise specialty */}
                  {mentor.education && mentor.education.length > 0 ? (
                    <p className="text-muted-foreground mb-2">
                      {mentor.education[0].degree || ""}
                    </p>
                  ) : null}
                  
                  {/* Specialty as badge */}
                  {mentor.specialty && (
                    <Badge variant="secondary" className="mb-2 bg-blue-100 text-blue-800">
                      {mentor.specialty}
                    </Badge>
                  )}
                  
                  {mentor.location && (
                    <div className="flex items-center justify-center text-sm text-muted-foreground mb-4">
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {mentor.location}
                    </div>
                  )}
                  
                  <div className="w-full mt-4">
                    {user?.user_metadata?.role === 'mood_mentor' ? (
                      <div className="space-y-2">
                        <Button 
                          disabled
                          className="w-full bg-gray-100 text-gray-500 cursor-not-allowed"
                        >
                          Book Appointment
                        </Button>
                        <p className="text-sm text-gray-500 text-center">
                          As a mood mentor, you cannot book appointments with other mentors
                        </p>
                      </div>
                    ) : (
                      <Button 
                        onClick={handleBooking}
                        className="w-full bg-[#20C0F3] hover:bg-[#20C0F3]/90 text-white"
                      >
                        Book Appointment
                      </Button>
                    )}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="w-full text-sm">
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Session Fee:</span>
                      <span className="font-medium">
                        {mentor.isFree 
                          ? "Free" 
                          : formatCurrency(mentor.hourlyRate)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Session Duration:</span>
                      <span className="font-medium">{mentor.sessionDuration}</span>
                    </div>
                    
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Languages:</span>
                      <span className="font-medium">
                        {mentor.languages?.length > 0 
                          ? mentor.languages.slice(0, 2).join(', ') 
                          : 'English'}
                        {mentor.languages?.length > 2 && '...'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Main content area */}
          <div className="md:col-span-2">
            <Card>
              <Tabs defaultValue="about">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="about">About</TabsTrigger>
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                </TabsList>
                
                <TabsContent value="about" className="p-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">About {mentor.fullName}</h3>
                    <p className="text-muted-foreground">
                      {mentor.bio || "This is a demo account and not a real account"}
                    </p>
                    
                    {mentor.specialties?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium mb-2">Specialties</h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.specialties.map((specialty, index) => (
                            <Badge key={index} variant="outline">
                              {specialty}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {mentor.therapyTypes?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-md font-medium mb-2">Therapy Approaches</h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.therapyTypes.map((type, index) => (
                            <Badge key={index} variant="outline">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {mentor.languages?.length > 0 && (
                      <div className="mt-6">
                        <h4 className="flex items-center text-md font-medium mb-2">
                          <Languages className="h-4 w-4 mr-2" />
                          Languages Spoken
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {mentor.languages.map((language, index) => (
                            <Badge key={index} variant="secondary">
                              {language}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="experience" className="p-6">
                  <div className="space-y-6">
                    {mentor.education?.length > 0 && (
                      <div>
                        <h3 className="flex items-center text-lg font-medium mb-4">
                          <GraduationCap className="h-5 w-5 mr-2" />
                          Education
                        </h3>
                        <div className="space-y-4">
                          {mentor.education.map((edu, index) => (
                            <div key={index} className="border-l-2 border-primary pl-4 py-1">
                              <h4 className="font-medium">{edu.degree}</h4>
                              <p className="text-muted-foreground">{edu.institution}</p>
                              <p className="text-sm text-muted-foreground">{edu.year}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {mentor.experience?.length > 0 && (
                      <div className="mt-8">
                        <h3 className="flex items-center text-lg font-medium mb-4">
                          <Briefcase className="h-5 w-5 mr-2" />
                          Professional Experience
                        </h3>
                        <div className="space-y-4">
                          {mentor.experience.map((exp, index) => (
                            <div key={index} className="border-l-2 border-primary pl-4 py-1">
                              <h4 className="font-medium">{exp.title}</h4>
                              <p className="text-muted-foreground">{exp.place}</p>
                              <p className="text-sm text-muted-foreground">{exp.duration}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(!mentor.education || mentor.education.length === 0) && 
                     (!mentor.experience || mentor.experience.length === 0) && (
                      <div className="py-10 text-center">
                        <p className="text-muted-foreground">
                          No education or experience details have been added yet.
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="reviews" className="p-6">
                  {reviews.length > 0 ? (
                    <div className="space-y-6">
                      <h3 className="text-lg font-medium">Patient Reviews</h3>
                      {reviews.map((review, index) => (
                        <div key={index} className="border-b pb-4 last:border-0 mb-4">
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarImage src={review.patientAvatar} />
                              <AvatarFallback>{review.patientName?.charAt(0) || 'A'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{review.patientName || 'Anonymous'}</div>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3.5 w-3.5 ${
                                      i < review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'fill-gray-200 text-gray-200'
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-muted-foreground ml-2">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {review.reviewText}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-10 text-center">
                      <p className="text-muted-foreground">No reviews yet.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 