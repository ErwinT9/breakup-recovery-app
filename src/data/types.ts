export type Streak = {
  id: string;
  user_id: string;
  started_at: string;
  best_days: number;
  relapse_count: number;
  ex_name: string | null;
};

export type JournalEntry = {
  id: string;
  user_id: string;
  title: string | null;
  body: string;
  mood: number | null;
  urge_level: number | null;
  created_at: string;
};

export type MoodLog = {
  id: string;
  user_id: string;
  score: number;
  note: string | null;
  logged_on: string;
};

export type HabitCheckin = {
  id: string;
  user_id: string;
  habit_key: string;
  checked_on: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarded: boolean;
  is_premium: boolean;
};