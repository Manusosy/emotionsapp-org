import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";
import { ReactNode } from "react";

interface BookingButtonProps {
  moodMentorId: string;
  moodMentorName: string;
  nameSlug?: string;
  disabled?: boolean;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  buttonText?: string | ReactNode;
  scrollToMentors?: boolean;
  isTopButton?: boolean;
}

export default function BookingButton({
  moodMentorId,
  moodMentorName,
  nameSlug,
  disabled = false,
  size = "default",
  variant = "default",
  className = "",
  buttonText = "Book Appointment",
  scrollToMentors = false,
  isTopButton = false
}: BookingButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleBooking = () => {
    if (isTopButton) {
      const mentorsSection = document.getElementById('mood-mentors-section');
      if (mentorsSection) {
        mentorsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        console.warn("Mood mentors section not found, navigating to /mood-mentors instead");
        navigate('/mood-mentors');
      }
      return;
    }

    if (user?.user_metadata?.role === 'mood_mentor') {
      toast.error("As a mood mentor, you cannot book appointments with other mentors");
      return;
    }

    if (!user) {
      toast.error("Please sign in to book an appointment");
      navigate('/patient-signin', { 
        state: { 
          redirectAfterLogin: '/booking',
          bookingInfo: {
            mentorId: moodMentorId
          }
        } 
      });
      return;
    }

    navigate('/booking', {
      state: {
        mentorId: moodMentorId
      }
    });
  };

  const isMoodMentor = user?.user_metadata?.role === 'mood_mentor';

  return (
    <Button
      onClick={handleBooking}
      disabled={disabled || (isMoodMentor && !isTopButton)}
      size={size}
      variant={variant}
      className={`${className} ${isMoodMentor && !isTopButton ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isMoodMentor && !isTopButton ? "Mood mentors cannot book appointments with other mentors" : ""}
    >
      {buttonText}
    </Button>
  );
}
