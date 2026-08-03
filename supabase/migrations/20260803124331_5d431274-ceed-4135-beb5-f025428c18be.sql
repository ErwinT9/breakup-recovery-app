CREATE TABLE public.daily_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  promised_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, promised_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_promises TO authenticated;
GRANT ALL ON public.daily_promises TO service_role;
ALTER TABLE public.daily_promises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own promises" ON public.daily_promises FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER daily_promises_updated_at BEFORE UPDATE ON public.daily_promises FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pictures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_url text NOT NULL,
  caption text,
  taken_on date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pictures TO authenticated;
GRANT ALL ON public.pictures TO service_role;
ALTER TABLE public.pictures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own pictures" ON public.pictures FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER pictures_updated_at BEFORE UPDATE ON public.pictures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.affirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affirmations TO authenticated;
GRANT ALL ON public.affirmations TO service_role;
ALTER TABLE public.affirmations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own affirmations" ON public.affirmations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER affirmations_updated_at BEFORE UPDATE ON public.affirmations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.rituals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rituals TO authenticated;
GRANT ALL ON public.rituals TO service_role;
ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rituals" ON public.rituals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER rituals_updated_at BEFORE UPDATE ON public.rituals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.triggers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.triggers TO authenticated;
GRANT ALL ON public.triggers TO service_role;
ALTER TABLE public.triggers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own triggers" ON public.triggers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER triggers_updated_at BEFORE UPDATE ON public.triggers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text,
  body text NOT NULL DEFAULT '',
  mood text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journal" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();