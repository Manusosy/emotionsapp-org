import { appointmentService, availabilityService } from '@/services';
import { useAuth } from '@/contexts/authContext';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parse, addMinutes } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as z from 'zod';
import type { AvailableTimeSlot } from '@/services/mood-mentor/availability.interface';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Supabase import removed

const formSchema = z.object({
  date: z.date({
    required_error: 'Please select a date for your session',
  }),
  time: z.string({
    required_error: 'Please select a time for your session',
  }),
  notes: z.string().min(10, 'Please provide at least 10 characters').max(500),
  meeting_type: z.enum(['video', 'audio', 'chat'], {
    required_error: 'Please select a meeting type',
  }),
});

const meetingTypes = [
  { value: 'video', label: 'Video Call' },
  { value: 'audio', label: 'Audio Call' },
  { value: 'chat', label: 'Chat' }
];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  moodMentorId: string;
  moodMentorName: string;
}

export function BookingModal({
  isOpen,
  onClose,
  moodMentorId,
  moodMentorName,
}: BookingModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: '',
      meeting_type: 'video',
    }
  });

  const { user } = useAuth();
  const selectedDate = form.watch('date');

  // Fetch available time slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!selectedDate || !moodMentorId) return;

      setIsLoadingSlots(true);
      try {
        const { data: slots, error } = await availabilityService.getAvailableTimeSlots(
          moodMentorId,
          format(selectedDate, 'yyyy-MM-dd')
        );

        if (error) {
          console.error('Error fetching time slots:', error);
          toast.error('Failed to load available time slots');
          return;
        }

        // Filter and format available slots
        const availableTimes = (slots || [])
          .filter((slot: AvailableTimeSlot) => slot.is_available)
          .map((slot: AvailableTimeSlot) => slot.time);

        setAvailableTimeSlots(availableTimes);

        // Reset time selection if current selection is no longer available
        const currentTime = form.getValues('time');
        if (currentTime && !availableTimes.includes(currentTime)) {
          form.setValue('time', '');
        }
      } catch (error) {
        console.error('Error fetching time slots:', error);
        toast.error('Failed to load available time slots');
      } finally {
        setIsLoadingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [selectedDate, moodMentorId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      setIsSubmitting(true);

      if (!user) {
        toast.error('You must be logged in to book a session');
        return;
      }

      // Calculate end time (30 minutes after start time)
      const startTime = parse(values.time, 'HH:mm', new Date());
      const endTime = format(addMinutes(startTime, 30), 'HH:mm');

      // Use the appointment service to book the appointment
      const response = await appointmentService.bookAppointment({
        patient_id: user.id,
        mentor_id: moodMentorId,
        title: `Session with ${moodMentorName}`,
        description: values.notes,
        date: format(values.date, 'yyyy-MM-dd'),
        start_time: values.time,
        end_time: endTime,
        meeting_link: `https://emotionsapp.org/meet/${user.id}/${moodMentorId}`,
        meeting_type: values.meeting_type,
        notes: values.notes
      });

      if (response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Session booked successfully');
      onClose();
      form.reset();
    } catch (error: any) {
      toast.error('Failed to book session');
      console.error('Error booking session:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Book a Session with {moodMentorName}</DialogTitle>
          <DialogDescription>
            Choose your preferred date and time for the session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={`w-full pl-3 text-left font-normal ${!field.value && "text-muted-foreground"}`}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingSlots ? "Loading..." : "Select a time"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isLoadingSlots ? (
                        <SelectItem value="loading" disabled>Loading available times...</SelectItem>
                      ) : availableTimeSlots.length > 0 ? (
                        availableTimeSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No available times</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="meeting_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select meeting type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {meetingTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please describe what you'd like to discuss in this session..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting || isLoadingSlots || !availableTimeSlots.length}>
                {isSubmitting ? 'Booking...' : 'Book Session'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 


