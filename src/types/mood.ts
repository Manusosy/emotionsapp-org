export type MoodType = 'positive' | 'negative' | 'neutral';

export interface MoodAssessment {
  id: string;
  userId: string;
  mood: string;
  moodType: MoodType;
  score: number;
  timestamp: string;
  notes: string;
  recommendations: string[];
  activities: string[];
}

export interface MoodEntry {
  id: string;
  userId: string;
  mood: string;
  moodType: MoodType;
  score: number;
  timestamp: string;
  notes: string;
  tags: string[];
  activities: string[];
}

export interface MoodStats {
  averageScore: number;
  moodCounts: Record<string, number>;
  moodTypeDistribution: Record<MoodType, number>;
  commonTags: string[];
  commonActivities: string[];
  timeOfDayDistribution: Record<string, number>;
  dayOfWeekDistribution: Record<string, number>;
}

export interface MoodRecommendation {
  id: string;
  moodType: MoodType;
  scoreRange: {
    min: number;
    max: number;
  };
  title: string;
  description: string;
  activities: string[];
  resources: {
    title: string;
    url: string;
    type: 'article' | 'video' | 'exercise' | 'meditation';
  }[];
  priority: number;
} 