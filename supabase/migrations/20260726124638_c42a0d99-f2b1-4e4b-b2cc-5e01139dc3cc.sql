
-- Student profile extensions
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS emergency_contact text,
  ADD COLUMN IF NOT EXISTS medical_info text,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Timetable slots
CREATE TABLE IF NOT EXISTS public.timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL,
  subject_id uuid,
  teacher_id uuid,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.timetable_slots TO authenticated;
GRANT ALL ON public.timetable_slots TO service_role;
ALTER TABLE public.timetable_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "School members read timetable" ON public.timetable_slots;
CREATE POLICY "School members read timetable" ON public.timetable_slots
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school(auth.uid()) OR public.is_super_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage timetable" ON public.timetable_slots;
CREATE POLICY "Admins manage timetable" ON public.timetable_slots
  FOR ALL TO authenticated
  USING (school_id = public.get_user_school(auth.uid()) AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'secretary') OR public.is_super_admin(auth.uid())))
  WITH CHECK (school_id = public.get_user_school(auth.uid()) AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'secretary') OR public.is_super_admin(auth.uid())));

-- Student bookmarks (announcements, materials)
CREATE TABLE IF NOT EXISTS public.student_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_type, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_bookmarks TO authenticated;
GRANT ALL ON public.student_bookmarks TO service_role;
ALTER TABLE public.student_bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own bookmarks" ON public.student_bookmarks;
CREATE POLICY "Users manage own bookmarks" ON public.student_bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Ensure students table has strict own-record SELECT policy for students
DROP POLICY IF EXISTS "Students read own record" ON public.students;
CREATE POLICY "Students read own record" ON public.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Ensure students can read own submissions
DROP POLICY IF EXISTS "Students access own submissions" ON public.assignment_submissions;
CREATE POLICY "Students access own submissions" ON public.assignment_submissions
  FOR ALL TO authenticated
  USING (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
  WITH CHECK (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()));
