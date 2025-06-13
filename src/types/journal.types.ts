export interface JournalEntry {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  tags: string[];
  is_shared: boolean;
  share_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JournalResponse {
  data?: JournalEntry[] | null;
  error?: string;
}

export interface ShareJournalResponse {
  data?: {
    share_code: string | null;
  };
  error?: string;
} 