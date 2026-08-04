CREATE TABLE public.mood_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  checkin_on date NOT NULL DEFAULT CURRENT_DATE,
  mood text NOT NULL,
  action text,
  custom_intention text,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, checkin_on)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mood_checkins TO authenticated;
GRANT ALL ON public.mood_checkins TO service_role;

ALTER TABLE public.mood_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mood checkins"
ON public.mood_checkins FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mood_checkins_updated_at
BEFORE UPDATE ON public.mood_checkins
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX mood_checkins_user_day_idx ON public.mood_checkins (user_id, checkin_on DESC);