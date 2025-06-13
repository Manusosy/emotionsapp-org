export interface MoodEntry {
  id: string;
  user_id: string;
  mood: number | string; // Can be 1-10 rating or string mood type
  assessment_result?: string;
  notes?: string;
  tags?: string[];
  activities?: string[];
  created_at: string;
  updated_at: string;
}

export interface MoodResponse {
  data: MoodEntry[] | null;
  error: Error | null;
} 