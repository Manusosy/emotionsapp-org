import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/authContext';
import { availabilityService } from '@/services/mood-mentor/availability.service';
import { MentorAvailability } from '@/services/mood-mentor/availability.interface';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { format, parse, addMinutes, isBefore, isEqual } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Generate time options for full 24 hours in 30-minute intervals
const timeOptions = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i/2);
  const minutes = i % 2 === 0 ? '00' : '30';
  const time = `${hour.toString().padStart(2, '0')}:${minutes}`;
  const date = parse(time, 'HH:mm', new Date());
  return {
    value: time,
    label: format(date, 'h:mm a') // This will show like "12:00 AM", "12:30 AM", etc.
  };
});

const daysOfWeek = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

interface AvailabilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AvailabilityDialog = ({ open, onOpenChange }: AvailabilityDialogProps) => {
  const { user } = useAuth();
  const [weeklyAvailability, setWeeklyAvailability] = useState<MentorAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [customStartTime, setCustomStartTime] = useState('09:00');
  const [customEndTime, setCustomEndTime] = useState('17:00');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id && open) {
      loadWeeklyAvailability();
    }
  }, [user?.id, open]);

  const loadWeeklyAvailability = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await availabilityService.getWeeklyAvailability(user.id);
      
      if (error) {
        toast.error('Failed to load availability settings');
      } else {
        setWeeklyAvailability(data || []);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability settings');
    } finally {
      setLoading(false);
    }
  };

  const handleWeeklyAvailabilityChange = async (day: string, startTime: string, endTime: string, isAvailable: boolean) => {
    if (!user?.id) return;

    try {
      const updatedAvailability = [...weeklyAvailability];
      const existingIndex = updatedAvailability.findIndex(
        a => a.day_of_week === parseInt(day)
      );

      if (existingIndex >= 0) {
        if (!isAvailable) {
          // Remove the availability for this day
          updatedAvailability.splice(existingIndex, 1);
        } else {
          // Update existing availability
          updatedAvailability[existingIndex] = {
            ...updatedAvailability[existingIndex],
            start_time: startTime,
            end_time: endTime,
            is_available: isAvailable
          };
        }
      } else if (isAvailable) {
        // Add new availability
        updatedAvailability.push({
          id: '', // Will be set by the database
          mentor_id: user.id,
          day_of_week: parseInt(day),
          start_time: startTime,
          end_time: endTime,
          is_available: isAvailable
        });
      }

      const { error } = await availabilityService.setWeeklyAvailability(user.id, updatedAvailability);

      if (error) {
        toast.error('Failed to update availability');
      } else {
        toast.success('Availability updated successfully');
        await loadWeeklyAvailability();
      }
    } catch (error) {
      console.error('Error updating availability:', error);
      toast.error('Failed to update availability');
    }
  };

  const handleCustomAvailabilityChange = async () => {
    if (!user?.id || !selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Validate time range
      const startTime = parse(customStartTime, 'HH:mm', new Date());
      const endTime = parse(customEndTime, 'HH:mm', new Date());
      
      // Debug log: Time values
      console.log('Time values:', {
        startTime: format(startTime, 'HH:mm:ss'),
        endTime: format(endTime, 'HH:mm:ss'),
        formattedDate
      });

      // Enhanced validation
      if (isBefore(endTime, startTime)) {
        toast.error('End time must be after start time');
        return;
      }

      if (isEqual(startTime, endTime)) {
        toast.error('Start and end time cannot be the same');
        return;
      }

      // Generate 30-minute slots with enhanced validation
      const slots = [];
      let currentTime = startTime;
      
      while (isBefore(currentTime, endTime)) {
        const slotEndTime = addMinutes(currentTime, 30);
        
        // Ensure we don't create a partial slot
        if (!isBefore(slotEndTime, endTime)) {
          break;
        }

        slots.push({
          start_time: format(currentTime, 'HH:mm'),
          end_time: format(slotEndTime, 'HH:mm'),
          is_available: true
        });
        
        currentTime = slotEndTime;
      }

      // Debug log: Generated slots
      console.log('Generated slots:', slots);

      if (slots.length === 0) {
        toast.error('Please select a time range that allows for at least one 30-minute slot');
        return;
      }

      // Debug log: Request payload
      const payload = {
        mentor_id: user.id,
        date: formattedDate,
        available_slots: slots
      };
      console.log('Setting custom availability with payload:', payload);

      const response = await availabilityService.setCustomAvailability(user.id, payload);
      
      // Debug log: Service response
      console.log('Service response:', response);

      if (response.error) {
        console.error('Error setting custom availability:', response.error);
        // Handle error based on the error type
        const errorMessage = typeof response.error === 'string' 
          ? response.error 
          : (response.error as Error)?.message || 'Unknown error occurred';

        console.log('Error message:', errorMessage);

        if (errorMessage.includes('time format')) {
          toast.error('Invalid time format. Please try again');
        } else if (errorMessage.includes('overlap')) {
          toast.error('Some time slots overlap with existing appointments');
        } else {
          toast.error(`Failed to set custom availability: ${errorMessage}`);
        }
      } else {
        toast.success('Custom availability set successfully');
        setSelectedDate(undefined);
        setCustomStartTime('09:00');
        setCustomEndTime('17:00');
      }
    } catch (error) {
      console.error('Caught error while setting custom availability:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to set custom availability';
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Your Availability</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#20C0F3]"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Weekly Schedule */}
            <div>
              <h3 className="font-semibold mb-4">Weekly Schedule</h3>
              <div className="space-y-6">
                {daysOfWeek.map((day) => {
                  const dayAvailability = weeklyAvailability.find(
                    a => a.day_of_week === parseInt(day.value)
                  );
                  const isAvailable = dayAvailability?.is_available ?? false;

                  return (
                    <div key={day.value} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-medium">{day.label}</Label>
                        <Switch
                          checked={isAvailable}
                          onCheckedChange={(checked) => {
                            handleWeeklyAvailabilityChange(
                              day.value,
                              dayAvailability?.start_time || '09:00',
                              dayAvailability?.end_time || '17:00',
                              checked
                            );
                          }}
                        />
                      </div>

                      {isAvailable && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Start Time</Label>
                            <Select
                              value={dayAvailability?.start_time || '09:00'}
                              onValueChange={(value) => {
                                handleWeeklyAvailabilityChange(
                                  day.value,
                                  value,
                                  dayAvailability?.end_time || '17:00',
                                  true
                                );
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map((time) => (
                                  <SelectItem key={time.value} value={time.value}>
                                    {time.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label>End Time</Label>
                            <Select
                              value={dayAvailability?.end_time || '17:00'}
                              onValueChange={(value) => {
                                handleWeeklyAvailabilityChange(
                                  day.value,
                                  dayAvailability?.start_time || '09:00',
                                  value,
                                  true
                                );
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions
                                  .filter(time => time.value > (dayAvailability?.start_time || '09:00'))
                                  .map((time) => (
                                    <SelectItem key={time.value} value={time.value}>
                                      {time.label}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Availability */}
            <div>
              <h3 className="font-semibold mb-4">Custom Date Availability</h3>
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                  disabled={{ before: new Date() }}
                />

                {selectedDate && (
                  <div className="space-y-4">
                    <h3 className="font-medium">
                      Set availability for {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={customStartTime}
                          onValueChange={setCustomStartTime}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map((time) => (
                              <SelectItem 
                                key={time.value} 
                                value={time.value}
                                disabled={time.value >= customEndTime}
                              >
                                {time.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={customEndTime}
                          onValueChange={setCustomEndTime}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions
                              .filter(time => time.value > customStartTime)
                              .map((time) => (
                                <SelectItem key={time.value} value={time.value}>
                                  {time.label}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Button
                      onClick={handleCustomAvailabilityChange}
                      className="w-full bg-[#20C0F3] hover:bg-[#20C0F3]/90"
                    >
                      Set Custom Availability
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AvailabilityDialog; 