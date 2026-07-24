
-- 1) Extend profiles with onboarding & badge fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS car_make text,
  ADD COLUMN IF NOT EXISTS car_model text,
  ADD COLUMN IF NOT EXISTS interests text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS pinned_badge_id uuid,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS onboarding_dismissed_at timestamptz;

-- 2) Badges catalog
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon_name text NOT NULL,
  image_url text,
  category text NOT NULL,
  threshold_type text,
  threshold_value integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.badges TO anon, authenticated;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges readable by all" ON public.badges FOR SELECT USING (true);

-- 3) user_badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);
GRANT SELECT ON public.user_badges TO anon, authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges readable by all" ON public.user_badges FOR SELECT USING (true);

-- pinned_badge_id foreign key
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_pinned_badge_id_fkey;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pinned_badge_id_fkey
  FOREIGN KEY (pinned_badge_id) REFERENCES public.badges(id) ON DELETE SET NULL;

-- 4) Seed badges (idempotent)
INSERT INTO public.badges (slug, name, description, icon_name, category, threshold_type, threshold_value, sort_order) VALUES
  ('first_post','Erstausfahrt','Deinen ersten Beitrag gepostet','Gauge','posts','posts',1,10),
  ('posts_10','Eingefahren','10 Beiträge veröffentlicht','Gauge','posts','posts',10,20),
  ('posts_25','Warmgelaufen','25 Beiträge veröffentlicht','Gauge','posts','posts',25,30),
  ('posts_50','Vollgas-Modus','50 Beiträge veröffentlicht','Gauge','posts','posts',50,40),
  ('posts_100','Tacho auf 100','100 Beiträge veröffentlicht','Gauge','posts','posts',100,50),
  ('posts_250','Dauerläufer','250 Beiträge veröffentlicht','Gauge','posts','posts',250,60),
  ('posts_500','Scheunenfund-Legende','500 Beiträge veröffentlicht','Gauge','posts','posts',500,70),
  ('follower_1','Erster Mitfahrer','Deinen ersten Follower bekommen','Users','followers','followers',1,110),
  ('followers_10','Konvoi gestartet','10 Follower erreicht','Users','followers','followers',10,120),
  ('followers_100','Stadtgespräch','100 Follower erreicht','Users','followers','followers',100,130),
  ('followers_1000','Local Legend','1.000 Follower erreicht','Trophy','followers','followers',1000,140),
  ('follow_1','Im Windschatten','Zum ersten Mal jemandem gefolgt','UserPlus','activity','following',1,210),
  ('follow_50','Kolonnenfahrer','50 Leuten gefolgt','UserPlus','activity','following',50,220),
  ('community_1','Teil der Crew','Erster Community beigetreten','Users','community','communities',1,310),
  ('community_3','Car-Meet-Hopper','3 oder mehr Communities beigetreten','Users','community','communities',3,320),
  ('community_founder','Chapter-Gründer','Eigene Community gegründet','Flag','community','communities_founded',1,330),
  ('profile_complete','Papiere vollständig','Profil zu 100% ausgefüllt','BadgeCheck','profile','profile_complete',1,410),
  ('early_adopter','Scheunenfund','In den ersten Wochen nach Launch dabei gewesen','Sparkles','profile',NULL,NULL,420),
  ('post_of_month','Bester Umbau des Monats','Vom Team ausgezeichnet','Trophy','rare',NULL,NULL,510),
  ('creator_of_week','Werkstatt-König der Woche','Vom Team ausgezeichnet','Wrench','rare',NULL,NULL,520),
  ('anniversary_1y','1 Jahr auf der Straße','Ein Jahr Carforms-Mitglied','Flag','rare',NULL,NULL,530)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_name = EXCLUDED.icon_name,
  category = EXCLUDED.category,
  threshold_type = EXCLUDED.threshold_type,
  threshold_value = EXCLUDED.threshold_value,
  sort_order = EXCLUDED.sort_order;

-- 5) Badge awarding function (SECURITY DEFINER so it can insert user_badges + notifications)
CREATE OR REPLACE FUNCTION public.award_badges_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_posts int;
  v_followers int;
  v_following int;
  v_communities int;
  v_founded int;
  v_profile_complete boolean;
  b RECORD;
  inserted_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN; END IF;

  SELECT count(*) INTO v_posts FROM public.posts WHERE author_id = _user_id;
  SELECT count(*) INTO v_followers FROM public.follows WHERE following_id = _user_id;
  SELECT count(*) INTO v_following FROM public.follows WHERE follower_id = _user_id;
  SELECT count(*) INTO v_communities FROM public.community_members WHERE user_id = _user_id;
  SELECT count(*) INTO v_founded FROM public.communities WHERE created_by = _user_id;

  SELECT (avatar_url IS NOT NULL AND coalesce(length(trim(bio)),0) > 0
          AND coalesce(length(trim(location)),0) > 0
          AND coalesce(length(trim(car_make)),0) > 0)
    INTO v_profile_complete
    FROM public.profiles WHERE id = _user_id;

  FOR b IN SELECT * FROM public.badges WHERE threshold_type IS NOT NULL LOOP
    IF (b.threshold_type = 'posts' AND v_posts >= b.threshold_value)
       OR (b.threshold_type = 'followers' AND v_followers >= b.threshold_value)
       OR (b.threshold_type = 'following' AND v_following >= b.threshold_value)
       OR (b.threshold_type = 'communities' AND v_communities >= b.threshold_value)
       OR (b.threshold_type = 'communities_founded' AND v_founded >= b.threshold_value)
       OR (b.threshold_type = 'profile_complete' AND coalesce(v_profile_complete,false))
    THEN
      INSERT INTO public.user_badges (user_id, badge_id)
      VALUES (_user_id, b.id)
      ON CONFLICT DO NOTHING;

      IF FOUND THEN
        INSERT INTO public.notifications (user_id, type, entity_id)
        VALUES (_user_id, 'badge_earned', b.id);
      END IF;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.award_badges_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_badges_for_user(uuid) TO authenticated, service_role;

-- 6) Triggers to re-check badges
CREATE OR REPLACE FUNCTION public.trg_award_after_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_badges_for_user(NEW.author_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_after_post ON public.posts;
CREATE TRIGGER award_after_post AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_award_after_post();

CREATE OR REPLACE FUNCTION public.trg_award_after_follow()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_badges_for_user(NEW.follower_id);
  PERFORM public.award_badges_for_user(NEW.following_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_after_follow ON public.follows;
CREATE TRIGGER award_after_follow AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.trg_award_after_follow();

CREATE OR REPLACE FUNCTION public.trg_award_after_community_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_badges_for_user(NEW.user_id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_after_community_join ON public.community_members;
CREATE TRIGGER award_after_community_join AFTER INSERT ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.trg_award_after_community_join();

CREATE OR REPLACE FUNCTION public.trg_award_after_profile_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_badges_for_user(NEW.id);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS award_after_profile_update ON public.profiles;
CREATE TRIGGER award_after_profile_update AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.trg_award_after_profile_update();

-- 7) Ensure pinned badge belongs to the user (guard trigger)
CREATE OR REPLACE FUNCTION public.validate_pinned_badge()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.pinned_badge_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.user_badges
      WHERE user_id = NEW.id AND badge_id = NEW.pinned_badge_id
    ) THEN
      NEW.pinned_badge_id := NULL;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_validate_pinned_badge ON public.profiles;
CREATE TRIGGER profiles_validate_pinned_badge
  BEFORE INSERT OR UPDATE OF pinned_badge_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.validate_pinned_badge();
