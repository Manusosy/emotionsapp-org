export interface StressAssessment {
  id: string;
  user_id: string;
  stress_level: number;
  symptoms: string[];
  triggers: string[];
  coping_strategies?: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface StressResponse {
  data: StressAssessment[] | null;
  error: Error | null;
} 