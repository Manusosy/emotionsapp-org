import { useState, useEffect } from "react";
import { Star, MapPin, Clock, Globe2, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import BookingButton from "@/features/booking/components/BookingButton";
import { toast } from "sonner";
import { moodMentorService } from "@/services";

interface MoodMentor {
  id: string;
  full_name: string;
  avatar_url: string;
  specialties: string[];
  location: string;
  duration: string;
  rating: number | null;
  reviewCount?: number;
  available: boolean;
  languages: string[];
  education: string;
  experience: string;
  name_slug?: string;
}

export default function MoodMentorGrid() {
  const navigate = useNavigate();
  const [moodMentors, setMoodMentors] = useState<MoodMentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set a timeout to ensure page doesn't appear to hang when loading
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    
    fetchMoodMentors();
    
    return () => clearTimeout(timeoutId);
  }, []);

  const fetchMoodMentors = async () => {
    try {
      setIsLoading(true);
      
      // Get up to 3 mentors from the real service (removed minRating filter to show all available mentors)
      const mentors = await moodMentorService.getMoodMentors({
        limit: 3
      });
      
      if (mentors && mentors.length > 0) {
        // Map to the component's expected MoodMentor interface format
        const mappedMentors = mentors.map(mentor => ({
          id: mentor.id,
          full_name: mentor.fullName || 'Mood Mentor',
          avatar_url: mentor.avatarUrl || '/default-avatar.png',
          specialties: mentor.specialties || [],
          location: mentor.location || 'Remote',
          duration: mentor.sessionDuration || '30 Min',
          rating: mentor.rating || null,
          reviewCount: mentor.reviewCount || 0,
          available: mentor.availabilityStatus === 'available',
          languages: mentor.languages || ['English'],
          education: Array.isArray(mentor.education) && mentor.education.length > 0
            ? `${mentor.education[0].degree}, ${mentor.education[0].institution}` 
            : 'Mental Health Professional',
          experience: Array.isArray(mentor.experience) && mentor.experience.length > 0
            ? mentor.experience[0].title
            : `${Math.floor(Math.random() * 5) + 3} years experience`,
          name_slug: mentor.nameSlug
        }));
        
        setMoodMentors(mappedMentors);
        setError(null); // Clear any previous errors
      } else {
        // Log detailed information for debugging
        console.log("No mentors returned from service. Service response:", mentors);
        console.log("This could be due to:");
        console.log("- No mood mentors in database");
        console.log("- All mentors have is_active = false");
        console.log("- All mentors have is_profile_complete = false");
        setError("No mood mentors are currently available");
      }
    } catch (error) {
      console.error("Error fetching mood mentors:", error);
      setError("Failed to load mood mentors");
    } finally {
      setIsLoading(false);
    }
  };

  const viewMoodMentorProfile = (mentorId: string, mentorName: string, mentorSlug?: string) => {
    // Use the stored nameSlug if available, otherwise generate it from the name
    const nameSlug = mentorSlug || mentorName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    // Navigate to the mood mentor profile with the name-based URL only
    navigate(`/mood-mentor/${nameSlug}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-4">
            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
            <span className="font-medium text-sm">Meet Our Team</span>
            <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001A41]">Our Mood Mentors</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="overflow-hidden animate-pulse">
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-200"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error || moodMentors.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-4">
            <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
            <span className="font-medium text-sm">Meet Our Team</span>
            <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#001A41]">Our Mood Mentors</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-500">
            {error || "No mood mentors are currently available. Please check back later."}
          </p>
          <button 
            onClick={() => fetchMoodMentors()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col items-center mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-full mb-4">
          <span className="w-2 h-2 bg-white rounded-full mr-2"></span>
          <span className="font-medium text-sm">Meet Our Team</span>
          <span className="w-2 h-2 bg-white rounded-full ml-2"></span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-[#001A41]">Our Mood Mentors</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {moodMentors.map((mentor) => (
          <Card key={mentor.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="flex flex-col gap-4 p-6">
              <div className="flex items-center gap-4 cursor-pointer" onClick={() => viewMoodMentorProfile(mentor.id, mentor.full_name, mentor.name_slug)}>
                <img
                  src={mentor.avatar_url || '/default-avatar.png'}
                  alt={mentor.full_name}
                  className="w-16 h-16 rounded-full object-cover"
                  onError={(e) => {
                    // Fallback image if the avatar URL fails to load
                    (e.target as HTMLImageElement).src = '/default-avatar.png';
                  }}
                />
                <div>
                  <h3 className="font-semibold text-lg">{mentor.full_name}</h3>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    {mentor.rating ? (
                      <span className="text-sm font-medium">
                        {mentor.rating.toFixed(1)} ({mentor.reviewCount || 0} reviews)
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">No reviews yet</span>
                    )}
                  </div>
                </div>
              </div>

              {mentor.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.location}</span>
                </div>
              )}

              {mentor.specialties && mentor.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mentor.specialties.map((specialty, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}

              {mentor.languages && mentor.languages.length > 0 && (
                <div className="flex items-center gap-2">
                  <Globe2 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {mentor.languages.join(", ")}
                  </span>
                </div>
              )}

              {mentor.education && (
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.education}</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-600">{mentor.duration || '30 Min'}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  mentor.available 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {mentor.available ? 'Available' : 'Unavailable'}
                </span>
              </div>

              <BookingButton
                moodMentorId={mentor.id}
                moodMentorName={mentor.full_name}
                nameSlug={mentor.name_slug}
                className="text-white bg-blue-600 hover:bg-blue-700"
                buttonText={mentor.available ? "Book Session" : "Unavailable"}
                disabled={!mentor.available}
                variant="default"
              />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
