export interface MentorAvailability {
  id: string;
  mentor_id: string;
  day_of_week: number; // 0-6 for Sunday-Saturday
  start_time: string; // HH:mm format
  end_time: string;
  is_available: boolean;
}

export interface MentorCustomAvailability {
  id: string;
  mentor_id: string;
  date: string; // YYYY-MM-DD format
  available_slots: {
    start_time: string; // HH:mm format
    end_time: string;
    is_available: boolean;
  }[];
}

// For the API response
export interface AvailableTimeSlot {
  date: string;
  time: string;
  is_available: boolean;
} 