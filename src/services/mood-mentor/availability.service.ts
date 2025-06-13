import { supabase } from '@/lib/supabase';
import { MentorAvailability, MentorCustomAvailability, AvailableTimeSlot } from './availability.interface';
import { addMinutes, format, parse, isAfter, isBefore, isEqual } from 'date-fns';

interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface ActivityUser {
  id: string;
  full_name: string;
}

interface AppointmentActivity {
  id: string;
  start_time: string;
  status: string;
  mentor_id: string;
  patient_id: string;
  mentor: ActivityUser | null;
  patient: ActivityUser | null;
}

class AvailabilityService {
  // Set regular weekly availability
  async setWeeklyAvailability(mentorId: string, availabilities: Omit<MentorAvailability, 'id'>[]) {
    try {
      // Delete existing availabilities for this mentor
      const { error: deleteError } = await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_id', mentorId);

      if (deleteError) {
        console.error('Error deleting existing availability:', deleteError);
        return { data: null, error: deleteError };
      }

      if (!availabilities.length) {
        return { data: [], error: null };
      }

      // Format the time strings to ensure they're in the correct format
      const formattedAvailabilities = availabilities.map(avail => {
        try {
          const startTime = parse(avail.start_time, 'HH:mm', new Date());
          const endTime = parse(avail.end_time, 'HH:mm', new Date());
          
          return {
            mentor_id: mentorId,
            day_of_week: avail.day_of_week,
            start_time: format(startTime, 'HH:mm:ss'),
            end_time: format(endTime, 'HH:mm:ss'),
            is_available: true
          };
        } catch (error) {
          console.error('Error parsing time:', error);
          return null;
        }
      }).filter(Boolean);

      if (!formattedAvailabilities.length) {
        return { data: [], error: new Error('Invalid time format') };
      }

      // Insert new availabilities
      const { data, error: insertError } = await supabase
        .from('mentor_availability')
        .insert(formattedAvailabilities)
        .select();

      if (insertError) {
        console.error('Error inserting availability:', insertError);
        return { data: null, error: insertError };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error setting weekly availability:', error);
      return { data: null, error };
    }
  }

  // Set custom availability for specific dates
  async setCustomAvailability(mentorId: string, customAvailability: Omit<MentorCustomAvailability, 'id'>) {
    try {
      // Format the time strings in available_slots
      const formattedSlots = customAvailability.available_slots
        .map(slot => {
          try {
            const startTime = parse(slot.start_time, 'HH:mm', new Date());
            const endTime = parse(slot.end_time, 'HH:mm', new Date());
            
            return {
              start_time: format(startTime, 'HH:mm:ss'),
              end_time: format(endTime, 'HH:mm:ss'),
              is_available: true
            };
          } catch (error) {
            console.error('Error parsing time:', error);
            return null;
          }
        })
        .filter(Boolean);

      if (!formattedSlots.length) {
        return { data: null, error: new Error('Invalid time format') };
      }

      // Use upsert with onConflict to handle the unique constraint
      const { data, error } = await supabase
        .from('mentor_custom_availability')
        .upsert(
          {
            mentor_id: mentorId,
            date: customAvailability.date,
            available_slots: formattedSlots
          },
          {
            onConflict: 'mentor_id,date',
            ignoreDuplicates: false
          }
        )
        .select();

      if (error) {
        console.error('Error setting custom availability:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error setting custom availability:', error);
      return { data: null, error };
    }
  }

  // Get available time slots for a mentor on a specific date
  async getAvailableTimeSlots(mentorId: string, date: string): Promise<{ data: AvailableTimeSlot[] | null, error: any }> {
    try {
      // First check for existing appointments to block those slots
      const { data: existingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_time, end_time')
        .eq('mentor_id', mentorId)
        .eq('date', date)
        .in('status', ['scheduled', 'pending']);

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError);
        return { data: null, error: appointmentsError };
      }

      // Transform appointments to include is_available property
      const formattedAppointments = (existingAppointments || []).map(apt => ({
        ...apt,
        is_available: false
      }));

      // Check for custom availability first
      const { data: customData, error: customError } = await supabase
        .from('mentor_custom_availability')
        .select('available_slots')
        .eq('mentor_id', mentorId)
        .eq('date', date)
        .single();

      if (customError && customError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error fetching custom availability:', customError);
        return { data: null, error: customError };
      }

      if (customData?.available_slots?.length) {
        const slots = customData.available_slots
          .map((slot: TimeSlot) => {
            try {
              const startTime = parse(slot.start_time, 'HH:mm:ss', new Date());
              return {
                date,
                time: format(startTime, 'HH:mm'),
                is_available: true
              };
            } catch (error) {
              console.error('Error parsing custom slot time:', error);
              return null;
            }
          })
          .filter(Boolean);

        return {
          data: this.filterOutBookedSlots(slots, formattedAppointments),
          error: null
        };
      }

      // If no custom availability, check regular weekly availability
      const dayOfWeek = new Date(date).getDay();
      const { data: regularData, error: regularError } = await supabase
        .from('mentor_availability')
        .select('start_time, end_time')
        .eq('mentor_id', mentorId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_available', true);

      if (regularError) {
        console.error('Error fetching regular availability:', regularError);
        return { data: null, error: regularError };
      }

      if (!regularData?.length) {
        return { data: [], error: null };
      }

      // Convert regular availability into 30-minute time slots
      const timeSlots = regularData.flatMap(slot => {
        const slots: AvailableTimeSlot[] = [];
        try {
          let currentTime = parse(slot.start_time, 'HH:mm:ss', new Date());
          const endTime = parse(slot.end_time, 'HH:mm:ss', new Date());

          while (isBefore(currentTime, endTime)) {
            slots.push({
              date,
              time: format(currentTime, 'HH:mm'),
              is_available: true
            });
            currentTime = addMinutes(currentTime, 30);
          }
          return slots;
        } catch (error) {
          console.error('Error generating time slots:', error);
          return [];
        }
      });

      // Filter out past time slots if the date is today
      const now = new Date();
      const isToday = format(now, 'yyyy-MM-dd') === date;
      
      const availableSlots = isToday 
        ? timeSlots.filter(slot => {
            try {
              const slotTime = parse(`${date} ${slot.time}`, 'yyyy-MM-dd HH:mm', new Date());
              return isAfter(slotTime, now);
            } catch (error) {
              console.error('Error checking slot time:', error);
              return false;
            }
          })
        : timeSlots;

      return {
        data: this.filterOutBookedSlots(availableSlots, formattedAppointments),
        error: null
      };
    } catch (error) {
      console.error('Error getting available time slots:', error);
      return { data: null, error };
    }
  }

  // Helper function to filter out slots that overlap with existing appointments
  private filterOutBookedSlots(slots: AvailableTimeSlot[], appointments: TimeSlot[]): AvailableTimeSlot[] {
    return slots.filter(slot => {
      try {
        const slotStart = parse(slot.time, 'HH:mm', new Date());
        const slotEnd = addMinutes(slotStart, 30);

        // Check if this slot overlaps with any existing appointment
        return !appointments.some(apt => {
          try {
            const aptStart = parse(apt.start_time, 'HH:mm:ss', new Date());
            const aptEnd = parse(apt.end_time, 'HH:mm:ss', new Date());

            // Check for overlap
            return (
              (isEqual(slotStart, aptStart) || isAfter(slotStart, aptStart)) && isBefore(slotStart, aptEnd) ||
              (isAfter(slotEnd, aptStart) && (isBefore(slotEnd, aptEnd) || isEqual(slotEnd, aptEnd)))
            );
          } catch (error) {
            console.error('Error checking appointment overlap:', error);
            return true; // Consider slot unavailable if there's a parsing error
          }
        });
      } catch (error) {
        console.error('Error checking slot availability:', error);
        return false; // Consider slot unavailable if there's a parsing error
      }
    });
  }

  // Get a mentor's weekly availability
  async getWeeklyAvailability(mentorId: string) {
    try {
      const { data, error } = await supabase
        .from('mentor_availability')
        .select('*')
        .eq('mentor_id', mentorId);

      if (error) {
        console.error('Error fetching weekly availability:', error);
        return { data: null, error };
      }

      // Format the time strings to remove seconds
      const formattedData = data?.map(avail => {
        try {
          const startTime = parse(avail.start_time, 'HH:mm:ss', new Date());
          const endTime = parse(avail.end_time, 'HH:mm:ss', new Date());
          
          return {
            ...avail,
            start_time: format(startTime, 'HH:mm'),
            end_time: format(endTime, 'HH:mm')
          };
        } catch (error) {
          console.error('Error formatting time:', error);
          return avail; // Return original if parsing fails
        }
      });

      return { data: formattedData, error: null };
    } catch (error) {
      console.error('Error getting weekly availability:', error);
      return { data: null, error };
    }
  }

  // Check if a specific time slot is available
  async isTimeSlotAvailable(mentorId: string, date: string, time: string): Promise<boolean> {
    try {
      const { data } = await this.getAvailableTimeSlots(mentorId, date);
      return data?.some(slot => slot.time === time && slot.is_available) ?? false;
    } catch (error) {
      console.error('Error checking time slot availability:', error);
      return false;
    }
  }

  async getActivities(userId: string, userRole: 'mentor' | 'patient') {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          mentor_id,
          patient_id,
          mentor:mentor_id!inner (
            id,
            full_name
          ),
          patient:patient_id!inner (
            id,
            full_name
          )
        `)
        .or(`mentor_id.eq.${userId},patient_id.eq.${userId}`)
        .order('start_time', { ascending: false })
        .limit(3);

      if (error) throw error;

      const activities = (data || []) as unknown as AppointmentActivity[];
      
      return activities.map(activity => {
        // Determine if the current user is the mentor or patient by checking the IDs
        const isMentor = activity.mentor_id === userId;
        
        // For mentors, show patient name. For patients, show mentor name
        const otherPartyName = isMentor ? 
          (activity.patient?.full_name || 'Patient') : 
          (activity.mentor?.full_name || 'Mood Mentor');

        return {
          id: activity.id,
          activity_type: 'appointment',
          mentor_name: activity.mentor?.full_name || 'Mood Mentor',
          patient_name: activity.patient?.full_name || 'Patient',
          title: `Session with ${otherPartyName}`,
          created_at: activity.start_time
        };
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
  }
}

export const availabilityService = new AvailabilityService(); 