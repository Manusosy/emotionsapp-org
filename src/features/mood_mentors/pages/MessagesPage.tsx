import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/features/dashboard/components/DashboardLayout";
import { SharedMessagesPage } from "@/components/messaging/SharedMessagesPage";
import { useAuth } from "@/contexts/authContext";
import { toast } from "sonner";
import { patientService } from "@/services";
import SupabaseMessagingService from "@/features/messaging/services/messaging.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Create an instance of the messaging service
const messagingService = new SupabaseMessagingService();

export default function MessagesPage() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [initialPatientId, setInitialPatientId] = useState<string | undefined>(undefined);
  const [isInitializing, setIsInitializing] = useState(false);
  const [patientProfile, setPatientProfile] = useState<any>(null);
  
  // Fetch patient profile if we have a patient ID
  useEffect(() => {
    if (!patientId) return;
    
    const fetchPatientProfile = async () => {
      try {
        const result = await patientService.getPatientById(patientId);
        if (result.success && result.data) {
          setPatientProfile(result.data);
        }
      } catch (err) {
        console.error("Error fetching patient profile:", err);
      }
    };
    
    fetchPatientProfile();
  }, [patientId]);
  
  // Initialize conversation when component mounts with patient ID
  useEffect(() => {
    if (patientId && user) {
      setInitialPatientId(patientId);
      setIsInitializing(true);
      
      const initializeConversation = async () => {
        try {
          // Verify that the patient exists
          const patientResult = await patientService.getPatientById(patientId);
          if (!patientResult.success || !patientResult.data) {
            toast.error("Could not find patient profile");
            setIsInitializing(false);
            return;
          }
          
          // Create or get existing conversation between mentor and patient
          const result = await messagingService.getOrCreateConversation(
            user.id,
            patientId
          );
          
          if (result.data) {
            // Conversation successfully created or retrieved
            setTimeout(() => {
              setIsInitializing(false);
            }, 500);
          } else {
            toast.error("Could not initialize conversation");
            setIsInitializing(false);
          }
        } catch (err) {
          toast.error("Failed to connect with patient");
          setIsInitializing(false);
        }
      };
      
      initializeConversation();
    } else {
      // If we don't have a patient ID, just show the messages page
      setIsInitializing(false);
    }
  }, [patientId, user]);
  
  const handleCreateNewMessage = () => {
    setShowNewMessageModal(true);
  };
  
  // Helper function to get initials from a name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <DashboardLayout>
      {isInitializing ? (
        <div className="flex items-center justify-center h-[calc(100vh-134px)]">
          <div className="flex flex-col items-center text-center">
            {/* Loading spinner */}
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 border-opacity-50 rounded-full"></div>
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              {patientProfile && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={patientProfile.avatarUrl} />
                    <AvatarFallback>{getInitials(patientProfile.fullName || "")}</AvatarFallback>
                  </Avatar>
                </div>
              )}
            </div>
            <p className="mt-4 text-gray-700 font-medium">Preparing chat interface...</p>
            {patientProfile && (
              <p className="text-sm text-gray-500 mt-1">
                Connecting with {patientProfile.fullName}
              </p>
            )}
          </div>
        </div>
      ) : (
        <SharedMessagesPage 
          userRole="mood_mentor" 
          onCreateNewMessage={handleCreateNewMessage}
          initialPatientId={initialPatientId}
        />
      )}
      
      {showNewMessageModal && (
        <div>
          {/* This would be replaced with a proper modal component */}
          <p>New message modal would appear here</p>
        </div>
      )}
    </DashboardLayout>
  );
} 


