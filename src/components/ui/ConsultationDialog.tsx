import { moodMentorService } from '../../services'
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { UserCircle } from "lucide-react";

interface MoodMentor {
  id: string;
  name: string;
  specialties: string[];
  avatarUrl?: string;
}

// Mock data to use as fallback when API calls fail
const mockMoodMentors: MoodMentor[] = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialties: ["Depression", "Anxiety"],
    avatarUrl: "/default-avatar.png",
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialties: ["Trauma", "PTSD"],
    avatarUrl: "/default-avatar.png",
  },
  {
    id: "3",
    name: "Dr. Lisa Rodriguez",
    specialties: ["Family Therapy", "Relationships"],
    avatarUrl: "/default-avatar.png",
  }
];

interface ConsultationDialogProps {
  trigger: React.ReactNode;
}

const ConsultationDialog = ({ trigger }: ConsultationDialogProps) => {
  const [moodMentors, setMoodMentors] = useState<MoodMentor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMoodMentors = async () => {
      try {
        setIsLoading(true);
        
        // Use the moodMentorService to fetch mood mentors
        const mentors = await moodMentorService.getMoodMentors({
          limit: 6
        });
        
        if (mentors && mentors.length > 0) {
          const mappedData = mentors.map((mentor) => ({
            id: mentor.id,
            name: mentor.name,
            specialties: mentor.specialties || [],
            avatarUrl: mentor.avatarUrl
          }));
          
          setMoodMentors(mappedData);
        } else {
          // Use mock data as fallback
          setMoodMentors(mockMoodMentors);
        }
      } catch (error) {
        console.error("Error fetching mood mentors:", error);
        // Use mock data on error
        setMoodMentors(mockMoodMentors);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoodMentors();
  }, []);

  const handleMoodMentorSelect = (mentorId: string) => {
    navigate(`/booking?mentorId=${mentorId}`);
  };

  const handleViewAll = () => {
    navigate("/mood-mentors");
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-[#001A41]">Start Your Consultation</DialogTitle>
          <DialogDescription>
            Choose a mood mentor to begin your journey to better emotional well-being
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007BFF]"></div>
            </div>
          ) : moodMentors.length > 0 ? (
            <div className="grid gap-4">
              {moodMentors.map((mentor) => (
                <div
                  key={mentor.id}
                  className="flex items-center p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleMoodMentorSelect(mentor.id)}
                >
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                    {mentor.avatarUrl ? (
                      <img
                        src={mentor.avatarUrl}
                        alt={mentor.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserCircle className="h-6 w-6 text-[#007BFF]" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{mentor.name}</p>
                    <p className="text-xs text-gray-500">
                      {mentor.specialties.slice(0, 2).join(", ")}
                      {mentor.specialties.length > 2 ? " & more" : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No mood mentors found</p>
          )}
        </div>

        <div className="flex justify-between mt-2">
          <Button variant="outline" onClick={handleViewAll}>
            View All Mood Mentors
          </Button>
          <Button 
            className="bg-[#007BFF] hover:bg-blue-600"
            onClick={() => navigate("/booking")}
          >
            Book Without Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationDialog; 


