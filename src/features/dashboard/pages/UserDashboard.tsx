import { authService, userService, dataService, apiService, messageService, patientService, moodMentorService, appointmentService } from '../../../services'
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/authContext';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ReviewModal } from '@/features/mood_mentors/components/ReviewModal';
import { LogOut } from 'lucide-react';

interface Booking {
  id: string;
  session_date: string;
  session_time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  moodMentor: {
    id: string;
    full_name: string;
  };
  has_review: boolean;
}

export function UserDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get bookings from appointment service
      const bookingsData = await appointmentService.getPatientAppointments(user.id);
      
      // Transform the data to match our interface
      const processedBookings = (bookingsData || []).map(booking => {
        // Get mood mentor info from the mood mentor service
        return {
          id: booking.id,
          session_date: booking.date,
          session_time: booking.startTime,
          status: booking.status,
          notes: booking.notes || '',
          moodMentor: {
            id: booking.moodMentorId,
            full_name: 'Loading...' // We should fetch this from mood mentor service
          },
          has_review: false // We should fetch this from reviews service
        };
      });
      
      // Fetch mood mentor details for each booking
      const bookingsWithMentorInfo = await Promise.all(
        processedBookings.map(async (booking) => {
          try {
            const { data: mentorInfo } = await moodMentorService.getMoodMentorById(booking.moodMentor.id);
            return {
              ...booking,
              moodMentor: {
                id: booking.moodMentor.id,
                full_name: mentorInfo?.name || 'Unknown Mood Mentor'
              }
            };
          } catch (error) {
            console.error('Error fetching mood mentor info:', error);
            return booking;
          }
        })
      );
      
      setBookings(bookingsWithMentorInfo);
    } catch (error) {
      toast.error('Failed to load bookings');
      console.error('Error loading bookings:', error);
    }
  };

  const handleReviewClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    loadBookings();
    setIsReviewModalOpen(false);
    setSelectedBooking(null);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out. Please try again.');
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Your Dashboard</h1>

      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Sessions</h2>
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  You haven't booked any sessions yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle>{booking.moodMentor.full_name}</CardTitle>
                    <CardDescription>
                      {format(new Date(booking.session_date), 'PPP')} at{' '}
                      {booking.session_time}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium">Status</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {booking.status}
                        </p>
                      </div>
                      {booking.notes && (
                        <div>
                          <p className="text-sm font-medium">Notes</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.notes}
                          </p>
                        </div>
                      )}
                      {booking.status === 'completed' && !booking.has_review && (
                        <Button
                          onClick={() => handleReviewClick(booking)}
                          className="w-full"
                        >
                          Leave a Review
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <div className="pt-8 border-t">
          <Button
            variant="destructive"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full sm:w-auto"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {selectedBooking && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleReviewComplete}
          bookingId={selectedBooking.id}
          moodMentorId={selectedBooking.moodMentor.id}
          moodMentorName={selectedBooking.moodMentor.full_name}
        />
      )}
    </div>
  );
}



