import { authService, userService, dataService, apiService, patientService, moodMentorService, appointmentService } from '../../../services'
import { availabilityService } from '../../../services/mood-mentor/availability.service';
import { AvailableTimeSlot } from '../../../services/mood-mentor/availability.interface';
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, CalendarClock, Calendar as CalendarIcon, Clock, CheckCircle2, MapPin, Award } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRef } from "react";
import HeroSection from "../components/HeroSection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/authContext";
import { MoodMentorUI } from "@/services/mood-mentor/mood-mentor.interface";
import { supabase } from "@/lib/supabase";

const steps = [
  { id: 1, name: "Specialty" },
  { id: 2, name: "Appointment Type" },
  { id: 3, name: "Date & Time" },
  { id: 4, name: "Basic Information" },
  { id: 5, name: "Payment" },
  { id: 6, name: "Confirmation" },
];

const appointmentTypes = [
  { id: "video", name: "Video Call", description: "Talk face-to-face via video conference", icon: "📹" },
  { id: "audio", name: "Audio Call", description: "Voice call without video", icon: "🎧" },
];

const BookingPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const { mentorId, mentorName, preselectedMentor, specialty } = location.state || {};
  
  // Get call type from location state
  const initialCallType = (location.state as any)?.callType;
  
  // State for form fields
  const [selectedSpecialty, setSelectedSpecialty] = useState(specialty || "Mental Health");
  const [selectedAppointmentType, setSelectedAppointmentType] = useState(initialCallType || "");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    concerns: "",
  });
  
  const [moodMentor, setMoodMentor] = useState<MoodMentorUI | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<AvailableTimeSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  
  useEffect(() => {
    const initPage = async () => {
      setLoading(true);
      
      // If we have a preselected mentor, fetch their details and set them
      if (preselectedMentor && mentorId) {
        await fetchMentorDetails();
      } else {
        setLoading(false);
      }
      
      // Pre-fill user data if available
      if (isAuthenticated && user) {
        setFormData(prev => ({
          ...prev,
          name: user.user_metadata?.name || "",
          email: user.email || "",
        }));
      }
    };
    
    const fetchMentorDetails = async () => {
      try {
        const { data: mentor, error } = await supabase
          .from('mood_mentor_profiles')
          .select('*')
          .eq('user_id', mentorId)
          .single();
          
        if (error) throw error;
        
        if (mentor) {
          setMoodMentor({
            id: mentor.id,
            userId: mentor.user_id,
            fullName: mentorName || mentor.full_name,
            email: mentor.email,
            bio: mentor.bio,
            specialty: specialty || mentor.specialty,
            hourlyRate: mentor.hourly_rate,
            availabilityStatus: mentor.availability_status,
            avatarUrl: mentor.avatar_url,
            isFree: mentor.is_free,
            languages: mentor.languages,
            education: mentor.education,
            experience: mentor.experience,
            therapyTypes: mentor.therapy_types,
            specialties: mentor.specialties,
            sessionDuration: mentor.session_duration,
            rating: mentor.rating,
            gender: mentor.gender,
            location: mentor.location,
            nameSlug: mentor.name_slug,
            isProfileComplete: mentor.is_profile_complete,
            isActive: mentor.is_active
          });
          setSelectedSpecialty(specialty || mentor.specialty);
          // Stay on step 1 to show the mentor's profile
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('Error fetching mentor details:', error);
        toast.error('Failed to load mentor details');
      } finally {
        setLoading(false);
      }
    };
    
    initPage();
  }, [mentorId, mentorName, specialty, preselectedMentor, isAuthenticated, user]);
  
  // Update the useEffect that handles date selection
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !moodMentor?.userId) return;

      setIsLoadingSlots(true);
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const { data: slots, error } = await availabilityService.getAvailableTimeSlots(moodMentor.userId, formattedDate);

      if (error) {
        console.error('Error fetching available slots:', error);
        toast.error('Failed to load available time slots');
        setAvailableTimeSlots([]);
      } else {
        setAvailableTimeSlots(slots || []);
      }
      setIsLoadingSlots(false);
    };

    fetchAvailableSlots();
  }, [selectedDate, moodMentor?.userId]);
  
  // Handle step navigation
  const nextStep = () => {
    if (currentStep < steps.length) {
      // Validate current step
      if (currentStep === 1 && !selectedSpecialty) {
        toast.error("Please select a specialty");
        return;
      }
      
      if (currentStep === 2 && !selectedAppointmentType) {
        toast.error("Please select an appointment type");
        return;
      }
      
      if (currentStep === 3 && (!selectedDate || !selectedTime)) {
        toast.error("Please select both date and time");
        return;
      }
      
      if (currentStep === 4) {
        // Validate basic information
        if (!formData.name || !formData.email) {
          toast.error("Please fill in all required fields");
          return;
        }
      }
      
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 1) {
      // Always go to the immediately previous step
      setCurrentStep(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleBookingSubmit = async () => {
    try {
      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        // Show auth dialog
        setShowAuthDialog(true);
        return;
      }
      
      if (!moodMentor?.userId || !selectedDate) {
        toast.error("Missing required booking information");
        return;
      }
      
      // Calculate end time (1 hour after start time)
      const timeFormat = selectedTime.includes("AM") || selectedTime.includes("PM") 
        ? "hh:mm A" 
        : "HH:mm";
      
      const startTime = selectedTime.replace(" AM", "").replace(" PM", "");
      const [hours, minutes] = startTime.split(":");
      const endHour = (parseInt(hours) + 1) % 24;
      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes}`;
      
      // Verify the mentor ID format - it should be a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(moodMentor.userId)) {
        console.error("Invalid mentor ID format, not a UUID:", moodMentor.userId);
        toast.error("Invalid mentor ID format");
        return;
      }
      
      console.log("Using mentor user ID for booking:", moodMentor.userId);
      
      // Create the booking entry using the correct field names
      const bookingData = {
        patient_id: user.id,
        mentor_id: moodMentor.userId, // Use the userId which references auth.users
        title: `Session with ${moodMentor?.fullName || "Mood Mentor"}`,
        description: formData.concerns || "No specific concerns mentioned",
        date: selectedDate ? format(selectedDate, "yyyy-MM-dd") : new Date().toISOString().split('T')[0],
        start_time: startTime,
        end_time: endTime,
        meeting_type: selectedAppointmentType as 'video' | 'audio',
        meeting_link: `https://emotionsapp.org/meet/${user.id}/${moodMentor.userId}`,
        notes: formData.concerns || "No notes provided"
      };
      
      console.log("Submitting booking data:", bookingData);
      toast.loading("Booking your appointment...");
      
      const result = await appointmentService.bookAppointment(bookingData);
        
      if (result.error) {
        console.error("Appointment booking error:", result.error);
        toast.dismiss();
        toast.error(`Failed to book appointment: ${result.error}`);
        return;
      }
      
      toast.dismiss();
      toast.success("Appointment booked successfully!");
      setCurrentStep(6); // Move to confirmation step
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.dismiss();
      toast.error("Failed to book appointment. Please try again.");
    }
  };

  const redirectToLogin = () => {
    navigate("/patient-signin");
  };
  
  const redirectToSignup = () => {
    navigate("/patient-signup");
  };
  
  // Update the calendar to allow same-day bookings
  const disabledDates = {
    before: new Date(),
  };
  
  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Selected Mood Mentor</h2>
            
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20C0F3]"></div>
              </div>
            ) : moodMentor ? (
              <Card className="border-2 border-[#20C0F3]/20 overflow-hidden hover:shadow-md transition-all">
                <div className="bg-[#20C0F3] text-white p-4">
                  <h3 className="text-xl font-semibold">Your Selected Mood Mentor</h3>
                </div>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                    <Avatar className="h-24 w-24 border-2 border-[#20C0F3]/20">
                      <AvatarImage src={moodMentor.avatarUrl} alt={moodMentor.fullName} />
                      <AvatarFallback className="bg-[#20C0F3]/10 text-[#20C0F3]">
                        {moodMentor.fullName?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-xl font-bold text-gray-800">{moodMentor.fullName}</h3>
                      <p className="text-gray-500 text-sm mb-2">{moodMentor.specialty}</p>
                      
                      <div className="flex flex-col md:flex-row gap-2 md:gap-4 mb-4 mt-2 items-center md:items-start">
                        <div className="flex items-center text-[#20C0F3]">
                          <Award className="w-4 h-4 mr-1" />
                          <span className="text-sm">{moodMentor.specialty}</span>
                        </div>
                        {moodMentor.location && (
                          <div className="flex items-center text-gray-500">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="text-sm">{moodMentor.location}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="bg-[#20C0F3]/10 p-4 rounded-lg mt-4 text-[#20C0F3]">
                        <p className="text-sm">
                          You selected <span className="font-semibold">{moodMentor.fullName}</span>. 
                          {moodMentor.specialty && (
                            <> They are a specialist in <span className="font-semibold">{moodMentor.specialty.replace('Specialist', '').trim()}</span>. 
                            You can discuss all matters related to their specialty.</>
                          )}
                        </p>
                      </div>
                      
                      {moodMentor.bio && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-700 mb-1">About</h4>
                          <p className="text-sm text-gray-600">{moodMentor.bio}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-gray-200">
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#20C0F3]/20 rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🧠</span>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Mental Health</h3>
                  <p className="text-gray-500 mb-4">Discuss stress, anxiety, depression and other mental health concerns</p>
                  <Button 
                    variant="outline"
                    className={`${selectedSpecialty === "Mental Health" ? "bg-[#20C0F3]/10 text-[#20C0F3] border-[#20C0F3]" : ""}`}
                    onClick={() => setSelectedSpecialty("Mental Health")}
                  >
                    {selectedSpecialty === "Mental Health" ? "Selected" : "Select"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Choose Appointment Type</h2>
            <RadioGroup value={selectedAppointmentType} onValueChange={setSelectedAppointmentType}>
              <div className="grid gap-4">
                {appointmentTypes.map((type) => (
                  <Card 
                    key={type.id} 
                    className={`border-2 transition-all hover:shadow-md ${
                      selectedAppointmentType === type.id 
                      ? "border-[#20C0F3] bg-[#20C0F3]/5" 
                      : "border-gray-200"
                    }`}
                  >
                    <CardContent className="p-6 flex items-center">
                      <RadioGroupItem 
                        value={type.id} 
                        id={type.id} 
                        className="mr-4 text-[#20C0F3] border-[#20C0F3]" 
                      />
                      <div className="mr-4 text-2xl w-10 h-10 flex items-center justify-center bg-[#20C0F3]/10 rounded-full">
                        {type.icon}
                      </div>
                      <div>
                        <Label htmlFor={type.id} className="text-lg font-medium">{type.name}</Label>
                        <p className="text-gray-500">{type.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </RadioGroup>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Select Date & Time</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium flex items-center gap-2 mb-4">
                    <CalendarIcon className="h-5 w-5 text-[#20C0F3]" />
                    <span>Select Date</span>
                  </h3>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDates}
                    className="rounded-md border"
                    classNames={{
                      day_selected: "bg-[#20C0F3] text-white hover:bg-[#20C0F3] hover:text-white focus:bg-[#20C0F3] focus:text-white",
                      day_today: "bg-gray-100 text-gray-900"
                    }}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium flex items-center gap-2 mb-4">
                    <Clock className="h-5 w-5 text-[#20C0F3]" />
                    <span>Select Time</span>
                  </h3>
                  {isLoadingSlots ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20C0F3]"></div>
                    </div>
                  ) : availableTimeSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                      {availableTimeSlots.map((slot) => (
                      <Button
                          key={slot.time}
                        variant="outline"
                        className={`${
                            selectedTime === slot.time
                          ? "bg-[#20C0F3]/10 border-[#20C0F3] text-[#20C0F3]" 
                          : "hover:border-[#20C0F3] hover:text-[#20C0F3]"
                        }`}
                          onClick={() => setSelectedTime(slot.time)}
                          disabled={!slot.is_available}
                      >
                          {format(parse(slot.time, 'HH:mm', new Date()), 'hh:mm a')}
                      </Button>
                    ))}
                  </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No available time slots for the selected date.
                      Please try another date.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {selectedDate && selectedTime && (
              <Card className="mt-6 bg-[#20C0F3]/10 border-[#20C0F3]/20">
                <CardContent className="p-4 flex items-center text-[#20C0F3]">
                  <CalendarClock className="h-5 w-5 mr-2" />
                  <span>Your appointment: {selectedDate && format(selectedDate, "MMMM d, yyyy")} at {selectedTime}</span>
                </CardContent>
              </Card>
            )}
          </div>
        );
        
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Basic Information</h2>
            
            <Card className="border-[#20C0F3]/10 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">Full Name*</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={formData.name} 
                      onChange={handleInputChange} 
                      required 
                      className="border-gray-300 focus:border-[#20C0F3] focus:ring-[#20C0F3]/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700">Email Address*</Label>
                    <Input 
                      id="email" 
                      name="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={handleInputChange} 
                      required 
                      className="border-gray-300 focus:border-[#20C0F3] focus:ring-[#20C0F3]/20"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    type="tel" 
                    value={formData.phone} 
                    onChange={handleInputChange}
                    className="border-gray-300 focus:border-[#20C0F3] focus:ring-[#20C0F3]/20"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="concerns" className="text-gray-700">What would you like to discuss?</Label>
                  <Textarea 
                    id="concerns" 
                    name="concerns" 
                    value={formData.concerns} 
                    onChange={handleInputChange} 
                    placeholder="Please share any specific concerns or topics you'd like to discuss in your session..."
                    rows={4}
                    className="border-gray-300 focus:border-[#20C0F3] focus:ring-[#20C0F3]/20"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );
        
      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center mb-8">Review & Confirm</h2>
            
            <Card className="border-[#20C0F3]/10 shadow-sm">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <h3 className="font-medium text-lg text-[#20C0F3]">Appointment Details</h3>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Mood Mentor</p>
                      <p className="font-medium">{moodMentor?.fullName || "Selected Mentor"}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Specialty</p>
                      <p className="font-medium">{selectedSpecialty}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Appointment Type</p>
                      <p className="font-medium">{appointmentTypes.find(t => t.id === selectedAppointmentType)?.name || selectedAppointmentType}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-500">Date & Time</p>
                      <p className="font-medium">{selectedDate && format(selectedDate, "MMMM d, yyyy")} at {selectedTime}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">Your Information</p>
                    <div className="grid md:grid-cols-2 gap-4 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">Name</p>
                        <p>{formData.name}</p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-500">Email</p>
                        <p>{formData.email}</p>
                      </div>
                      
                      {formData.phone && (
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p>{formData.phone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {formData.concerns && (
                    <div className="pt-4 border-t">
                      <p className="text-sm text-gray-500">Discussion Topics</p>
                      <p className="mt-1 text-sm">{formData.concerns}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-[#20C0F3]/10 p-4 rounded-lg text-[#20C0F3] text-sm">
              <p>By confirming this appointment, you agree to our <Link to="/terms-of-service" className="text-[#20C0F3] font-medium underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-[#20C0F3] font-medium underline">Privacy Policy</Link>.</p>
            </div>
          </div>
        );
        
      case 6:
        return (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-[#20C0F3]/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-[#20C0F3]" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold">Appointment Confirmed!</h2>
            <p className="text-gray-600">Your appointment has been successfully booked.</p>
            
            <Card className="mt-6 border-[#20C0F3]/20">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Mood Mentor</p>
                    <p className="font-medium">{moodMentor?.fullName || "Selected Mentor"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium">{selectedDate && format(selectedDate, "MMMM d, yyyy")} at {selectedTime}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Appointment Type</p>
                    <p className="font-medium">{appointmentTypes.find(t => t.id === selectedAppointmentType)?.name || selectedAppointmentType}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-6">
              <Button 
                onClick={() => navigate("/patient-dashboard/appointments")}
                className="bg-[#20C0F3] hover:bg-[#20C0F3]/90"
              >
                View My Appointments
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate("/patient-dashboard")}
                className="border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/10"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <HeroSection 
        title="Book Your Appointment" 
        subtitle="Schedule a session with your selected mood mentor"
      />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-12 relative z-10">
        {/* Progress Steps - Updated with better styling */}
        <div className="hidden sm:block mb-8 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`flex-1 flex flex-col items-center ${index < steps.length - 1 ? "relative" : ""}`}
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    currentStep > step.id 
                      ? "bg-[#20C0F3] text-white" 
                      : currentStep === step.id 
                      ? "bg-[#20C0F3] text-white ring-4 ring-[#20C0F3]/20" 
                      : "bg-gray-100 text-gray-400 border border-gray-200"
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span 
                  className={`mt-2 text-sm ${
                    currentStep >= step.id ? "text-[#20C0F3] font-medium" : "text-gray-500"
                  }`}
                >
                  {step.name}
                </span>
                
                {index < steps.length - 1 && (
                  <div 
                    className={`absolute h-0.5 w-full top-5 left-1/2 ${
                      currentStep > step.id ? "bg-[#20C0F3]" : "bg-gray-200"
                    }`}
                  ></div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Current Step Content */}
        <Card className="mb-6 shadow-sm border-0">
          <CardContent className="p-6 sm:p-8">
            {renderStepContent()}
          </CardContent>
        </Card>
        
        {/* Navigation Buttons */}
        {currentStep !== 6 && (
          <div className="flex justify-between mt-6">
            {currentStep > 1 ? (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex items-center border-[#20C0F3] text-[#20C0F3] hover:bg-[#20C0F3]/10"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            ) : (
              <div></div>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={nextStep}
                className="bg-[#20C0F3] hover:bg-[#20C0F3]/90"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : currentStep === 5 ? (
              <Button 
                onClick={handleBookingSubmit}
                className="bg-[#20C0F3] hover:bg-[#20C0F3]/90"
              >
                Confirm Booking
                <CheckCircle2 className="h-4 w-4 ml-1" />
              </Button>
            ) : null}
          </div>
        )}
      </div>
      
      {/* Authentication Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
            <DialogDescription>
              You need to be logged in to complete your booking.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 my-4">
            <p>
              Please login or create an account to continue with your booking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={redirectToLogin} className="flex-1 border-[#20C0F3] text-[#20C0F3]">
                Login
              </Button>
              <Button onClick={redirectToSignup} className="flex-1 bg-[#20C0F3] hover:bg-[#20C0F3]/90">
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingPage;




