-- ============================================================
-- Helper enums
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('present','absent','late','excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.exam_status AS ENUM ('draft','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.assignment_status AS ENUM ('open','closed','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- teacher_class_subjects
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_class_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  weekly_hours numeric(4,1) NOT NULL DEFAULT 0,
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, class_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_class_subjects TO authenticated;
GRANT ALL ON public.teacher_class_subjects TO service_role;
ALTER TABLE public.teacher_class_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access tcs" ON public.teacher_class_subjects FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));

-- ============================================================
-- attendance_sessions + records
-- ============================================================
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT ALL ON public.attendance_sessions TO service_role;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access attendance_sessions" ON public.attendance_sessions FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));
CREATE TRIGGER trg_attendance_sessions_updated BEFORE UPDATE ON public.attendance_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.attendance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT ALL ON public.attendance_records TO service_role;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access attendance_records" ON public.attendance_records FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND (s.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.attendance_sessions s WHERE s.id = session_id AND (s.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))));

-- ============================================================
-- assignments + submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  instructions text,
  due_date timestamptz,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.assignment_status NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT ALL ON public.assignments TO service_role;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access assignments" ON public.assignments FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));
CREATE TRIGGER trg_assignments_updated BEFORE UPDATE ON public.assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  content text,
  file_url text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  grade numeric(6,2),
  feedback text,
  UNIQUE(assignment_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignment_submissions TO authenticated;
GRANT ALL ON public.assignment_submissions TO service_role;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access submissions" ON public.assignment_submissions FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND (a.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.assignments a WHERE a.id = assignment_id AND (a.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))));

-- ============================================================
-- exams + results
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  exam_date date,
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  term text,
  status public.exam_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exams TO authenticated;
GRANT ALL ON public.exams TO service_role;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access exams" ON public.exams FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));
CREATE TRIGGER trg_exams_updated BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score numeric(6,2),
  grade text,
  position integer,
  comment text,
  UNIQUE(exam_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_results TO authenticated;
GRANT ALL ON public.exam_results TO service_role;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access exam_results" ON public.exam_results FOR ALL TO authenticated
  USING (EXISTS(SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))))
  WITH CHECK (EXISTS(SELECT 1 FROM public.exams e WHERE e.id = exam_id AND (e.school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))));

-- ============================================================
-- lesson_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  week text,
  objectives text,
  content text,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access lesson_plans" ON public.lesson_plans FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));
CREATE TRIGGER trg_lesson_plans_updated BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- teacher_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  name text NOT NULL,
  url text NOT NULL,
  kind text,
  size_bytes bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_documents TO authenticated;
GRANT ALL ON public.teacher_documents TO service_role;
ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members access teacher_documents" ON public.teacher_documents FOR ALL TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()))
  WITH CHECK (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));

-- ============================================================
-- messages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sender or recipient reads" ON public.messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR is_super_admin(auth.uid()));
CREATE POLICY "sender inserts" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND school_id = get_user_school(auth.uid()));
CREATE POLICY "recipient marks read" ON public.messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid());
CREATE POLICY "sender deletes" ON public.messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- ============================================================
-- calendar_events
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'event',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  audience text NOT NULL DEFAULT 'school',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "school members read calendar" ON public.calendar_events FOR SELECT TO authenticated
  USING (school_id = get_user_school(auth.uid()) OR is_super_admin(auth.uid()));
CREATE POLICY "owner writes calendar" ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (school_id = get_user_school(auth.uid()) AND owner_id = auth.uid());
CREATE POLICY "owner updates calendar" ON public.calendar_events FOR UPDATE TO authenticated
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner deletes calendar" ON public.calendar_events FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================
-- teacher_notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS public.teacher_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_notifications TO authenticated;
GRANT ALL ON public.teacher_notifications TO service_role;
ALTER TABLE public.teacher_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own notifications" ON public.teacher_notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()))
  WITH CHECK (user_id = auth.uid() OR is_super_admin(auth.uid()));

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_notifications;