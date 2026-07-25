
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','suspended')),
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'trial';

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing','active','past_due','canceled','expired')),
  monthly_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages subscriptions" ON public.subscriptions
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "School admin reads own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (school_id = get_user_school(auth.uid()));

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  method TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages payments" ON public.payments
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "School admin reads own payments" ON public.payments
  FOR SELECT TO authenticated USING (school_id = get_user_school(auth.uid()));

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info','success','warning','critical')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages notifications" ON public.notifications
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads all activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users insert own activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);
CREATE POLICY "School members read school activity" ON public.activity_logs
  FOR SELECT TO authenticated USING (school_id = get_user_school(auth.uid()));

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin reads audit" ON public.audit_logs
  FOR SELECT TO authenticated USING (is_super_admin(auth.uid()));
CREATE POLICY "Users insert own audit" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (actor_id = auth.uid() OR actor_id IS NULL);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name TEXT NOT NULL DEFAULT 'SmartSchool RDC',
  logo_url TEXT,
  default_locale TEXT NOT NULL DEFAULT 'fr',
  default_theme TEXT NOT NULL DEFAULT 'light',
  support_email TEXT,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  backups_enabled BOOLEAN NOT NULL DEFAULT true,
  backup_frequency TEXT NOT NULL DEFAULT 'daily',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages settings" ON public.platform_settings
  FOR ALL TO authenticated USING (is_super_admin(auth.uid())) WITH CHECK (is_super_admin(auth.uid()));
CREATE POLICY "Anyone reads settings" ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.platform_settings (platform_name, default_locale, default_theme, support_email)
SELECT 'SmartSchool RDC', 'fr', 'light', 'support@smartschool-rdc.cd'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_platform_settings_updated ON public.platform_settings;
CREATE TRIGGER trg_platform_settings_updated BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.schools (id, name, province, city, principal_name, email, phone, status, subscription_plan, created_at) VALUES
  ('11111111-1111-1111-1111-111111111001', 'Collège Boboto', 'Kinshasa', 'Kinshasa', 'Jean-Marie Kabongo', 'contact@boboto.cd', '+243810000001', 'active', 'pro', now() - interval '180 days'),
  ('11111111-1111-1111-1111-111111111002', 'Lycée Shaumba', 'Haut-Katanga', 'Lubumbashi', 'Marie Ilunga', 'info@shaumba.cd', '+243810000002', 'active', 'business', now() - interval '150 days'),
  ('11111111-1111-1111-1111-111111111003', 'Institut Mwanga', 'Nord-Kivu', 'Goma', 'Patrick Mumbere', 'admin@mwanga.cd', '+243810000003', 'active', 'pro', now() - interval '90 days'),
  ('11111111-1111-1111-1111-111111111004', 'École La Fontaine', 'Kongo-Central', 'Matadi', 'Alice Nsimba', 'contact@lafontaine.cd', '+243810000004', 'active', 'starter', now() - interval '60 days'),
  ('11111111-1111-1111-1111-111111111005', 'Collège Saint-Joseph', 'Kasaï-Oriental', 'Mbuji-Mayi', 'Joseph Tshibangu', 'sj@stjoseph.cd', '+243810000005', 'pending', 'trial', now() - interval '5 days'),
  ('11111111-1111-1111-1111-111111111006', 'Lycée Espoir', 'Sud-Kivu', 'Bukavu', 'Espérance Bulambo', 'info@espoir.cd', '+243810000006', 'suspended', 'starter', now() - interval '200 days'),
  ('11111111-1111-1111-1111-111111111007', 'École Horizon', 'Lualaba', 'Kolwezi', 'David Kanyinda', 'contact@horizon.cd', '+243810000007', 'active', 'pro', now() - interval '45 days'),
  ('11111111-1111-1111-1111-111111111008', 'Institut Étoile', 'Ituri', 'Bunia', 'Sarah Uzele', 'info@etoile.cd', '+243810000008', 'pending', 'trial', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (school_id, plan, status, monthly_price, currency, current_period_start, current_period_end) VALUES
  ('11111111-1111-1111-1111-111111111001', 'pro',      'active',   149.00, 'USD', now() - interval '10 days', now() + interval '20 days'),
  ('11111111-1111-1111-1111-111111111002', 'business', 'active',   349.00, 'USD', now() - interval '5 days',  now() + interval '25 days'),
  ('11111111-1111-1111-1111-111111111003', 'pro',      'active',   149.00, 'USD', now() - interval '15 days', now() + interval '15 days'),
  ('11111111-1111-1111-1111-111111111004', 'starter',  'active',    59.00, 'USD', now() - interval '8 days',  now() + interval '22 days'),
  ('11111111-1111-1111-1111-111111111005', 'trial',    'trialing',   0.00, 'USD', now() - interval '5 days',  now() + interval '9 days'),
  ('11111111-1111-1111-1111-111111111006', 'starter',  'past_due',  59.00, 'USD', now() - interval '40 days', now() - interval '10 days'),
  ('11111111-1111-1111-1111-111111111007', 'pro',      'active',   149.00, 'USD', now() - interval '3 days',  now() + interval '27 days'),
  ('11111111-1111-1111-1111-111111111008', 'trial',    'trialing',   0.00, 'USD', now() - interval '2 days',  now() + interval '12 days');

INSERT INTO public.payments (school_id, amount, currency, status, method, paid_at, created_at)
SELECT s.school_id, s.monthly_price, 'USD', 'paid', 'card', now() - (m * interval '30 days'), now() - (m * interval '30 days')
FROM public.subscriptions s, generate_series(0, 11) m
WHERE s.monthly_price > 0 AND s.status = 'active';

INSERT INTO public.payments (school_id, amount, currency, status, method, created_at) VALUES
  ('11111111-1111-1111-1111-111111111006', 59,  'USD', 'failed',  'card',         now() - interval '10 days'),
  ('11111111-1111-1111-1111-111111111004', 59,  'USD', 'pending', 'mobile_money', now() - interval '1 days'),
  ('11111111-1111-1111-1111-111111111007', 149, 'USD', 'pending', 'card',         now() - interval '2 days');

INSERT INTO public.classes (school_id, name, level, academic_year)
SELECT s.id, level_name, level_name, '2025-2026'
FROM public.schools s,
     unnest(ARRAY['1ère primaire','2ème primaire','3ème primaire','1ère secondaire','2ème secondaire']) AS level_name
WHERE s.id::text LIKE '11111111-1111-1111-1111-1111111110%';

INSERT INTO public.teachers (school_id, first_name, last_name, email, specialty)
SELECT s.id, fn, ln, lower(fn)||'.'||lower(ln)||'@'||split_part(s.email,'@',2), spec
FROM public.schools s
CROSS JOIN (VALUES
  ('Antoine','Mabika','Mathématiques'),
  ('Béatrice','Kalonji','Français'),
  ('Christian','Lukusa','Sciences'),
  ('Diane','Mwadi','Histoire'),
  ('Eric','Kasongo','Anglais'),
  ('Fatou','Ngoy','EPS')
) AS t(fn,ln,spec)
WHERE s.id::text LIKE '11111111-1111-1111-1111-1111111110%';

INSERT INTO public.students (school_id, first_name, last_name, matricule, gender)
SELECT s.id,
  (ARRAY['Grace','Josué','Nadège','Yannick','Chloé','Divine','Prince','Belinda','Emmanuel','Ruth','Serge','Nadine'])[n],
  (ARRAY['Kabila','Mobutu','Tshisekedi','Kasavubu','Lumumba','Bemba','Kanambe','Katumbi','Kyungu','Mbala','Ntumba','Ilunga'])[n],
  'MAT'||lpad((row_number() over ())::text,5,'0'),
  CASE WHEN n % 2 = 0 THEN 'F' ELSE 'M' END
FROM public.schools s, generate_series(1,12) n
WHERE s.id::text LIKE '11111111-1111-1111-1111-1111111110%';

INSERT INTO public.notifications (type, title, message, school_id, severity) VALUES
  ('school_registered','Nouvelle inscription','Institut Étoile s''est inscrit et attend approbation.','11111111-1111-1111-1111-111111111008','info'),
  ('school_registered','Nouvelle inscription','Collège Saint-Joseph s''est inscrit et attend approbation.','11111111-1111-1111-1111-111111111005','info'),
  ('payment_received','Paiement reçu','Collège Boboto a payé 149 USD.','11111111-1111-1111-1111-111111111001','success'),
  ('subscription_expiring','Abonnement expiré','L''abonnement de Lycée Espoir a expiré.','11111111-1111-1111-1111-111111111006','warning'),
  ('system_alert','Sauvegarde terminée','La sauvegarde quotidienne a réussi.',NULL,'success'),
  ('admin_created','Administrateur créé','Nouveau compte administrateur créé pour Institut Mwanga.','11111111-1111-1111-1111-111111111003','info');

INSERT INTO public.activity_logs (actor_name, action, target_type, school_id, metadata, created_at)
SELECT
  (ARRAY['Jean-Marie K.','Marie I.','Patrick M.','Alice N.','Sarah U.','David K.'])[1 + (n % 6)],
  (ARRAY['school.registered','teacher.added','student.enrolled','report.generated','user.logged_in','announcement.published'])[1 + (n % 6)],
  (ARRAY['school','teacher','student','report','user','announcement'])[1 + (n % 6)],
  ('11111111-1111-1111-1111-11111111100'||(1 + (n % 8)))::uuid,
  '{}'::jsonb,
  now() - (n * interval '1 hour')
FROM generate_series(0,29) n;

INSERT INTO public.audit_logs (event, ip_address, user_agent, metadata, created_at) VALUES
  ('login.success','196.10.42.11','Chrome/120','{}'::jsonb, now() - interval '1 hour'),
  ('login.success','41.243.5.22','Firefox/121','{}'::jsonb, now() - interval '3 hours'),
  ('login.failed','196.10.42.99','Chrome/120','{"reason":"wrong password"}'::jsonb, now() - interval '5 hours'),
  ('school.suspended','196.10.42.11','Chrome/120','{"school":"Lycée Espoir"}'::jsonb, now() - interval '1 day'),
  ('role.granted','196.10.42.11','Chrome/120','{"role":"school_admin"}'::jsonb, now() - interval '2 days');
