-- 1. Teaching resources
CREATE TABLE public.teaching_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  academic_year text,
  term text,
  topic text,
  title text NOT NULL,
  description text,
  resource_type text NOT NULL DEFAULT 'note' CHECK (resource_type IN ('note','presentation','video','video_link','image','reference')),
  storage_path text,
  external_url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  publish_at timestamptz NOT NULL DEFAULT now(),
  due_date timestamptz,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','scheduled','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teaching_resources TO authenticated;
GRANT ALL ON public.teaching_resources TO service_role;
ALTER TABLE public.teaching_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read school resources" ON public.teaching_resources
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (school_id = public.get_user_school(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin')
    OR public.has_role(auth.uid(), 'secretary')
    OR public.has_role(auth.uid(), 'teacher')
  ))
);

CREATE POLICY "Students read published resources" ON public.teaching_resources
FOR SELECT TO authenticated
USING (
  status = 'published' AND publish_at <= now()
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid()
      AND s.school_id = teaching_resources.school_id
      AND (teaching_resources.class_id IS NULL OR teaching_resources.class_id = s.class_id)
  )
);

CREATE POLICY "Teachers manage own resources" ON public.teaching_resources
FOR ALL TO authenticated
USING (
  teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  AND (class_id IS NULL OR EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    JOIN public.teachers t2 ON t2.id = tcs.teacher_id
    WHERE t2.user_id = auth.uid() AND tcs.class_id = teaching_resources.class_id
  ))
)
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND teacher_id IN (SELECT t.id FROM public.teachers t WHERE t.user_id = auth.uid())
  AND (class_id IS NULL OR EXISTS (
    SELECT 1 FROM public.teacher_class_subjects tcs
    JOIN public.teachers t2 ON t2.id = tcs.teacher_id
    WHERE t2.user_id = auth.uid() AND tcs.class_id = teaching_resources.class_id
  ))
);

CREATE POLICY "School admins manage resources" ON public.teaching_resources
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR (school_id = public.get_user_school(auth.uid()) AND public.has_role(auth.uid(), 'school_admin')))
WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.get_user_school(auth.uid()) AND public.has_role(auth.uid(), 'school_admin')));

CREATE TRIGGER trg_teaching_resources_updated BEFORE UPDATE ON public.teaching_resources
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_teaching_resources_school ON public.teaching_resources(school_id);
CREATE INDEX idx_teaching_resources_class ON public.teaching_resources(class_id);

-- 2. Upload history
CREATE TABLE public.resource_upload_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  resource_id uuid,
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.resource_upload_history TO authenticated;
GRANT ALL ON public.resource_upload_history TO service_role;
ALTER TABLE public.resource_upload_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read upload history" ON public.resource_upload_history
FOR SELECT TO authenticated
USING (
  public.is_super_admin(auth.uid())
  OR (school_id = public.get_user_school(auth.uid()) AND (
    public.has_role(auth.uid(), 'school_admin')
    OR public.has_role(auth.uid(), 'secretary')
    OR public.has_role(auth.uid(), 'teacher')
  ))
);

CREATE POLICY "Actors write upload history" ON public.resource_upload_history
FOR INSERT TO authenticated
WITH CHECK (actor_id = auth.uid() AND school_id = public.get_user_school(auth.uid()));

CREATE INDEX idx_resource_upload_history_school ON public.resource_upload_history(school_id, created_at DESC);

-- 3. Exam questions
CREATE TABLE public.exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'mcq' CHECK (kind IN ('mcq','truefalse','short')),
  prompt text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer text,
  points numeric NOT NULL DEFAULT 1,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;
GRANT ALL ON public.exam_questions TO service_role;
ALTER TABLE public.exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own exam questions" ON public.exam_questions
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.teachers t ON t.id = e.teacher_id
    WHERE e.id = exam_questions.exam_id AND t.user_id = auth.uid()
  )
)
WITH CHECK (
  school_id = public.get_user_school(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.exams e
    JOIN public.teachers t ON t.id = e.teacher_id
    WHERE e.id = exam_questions.exam_id AND t.user_id = auth.uid()
  )
);

CREATE POLICY "School admins manage exam questions" ON public.exam_questions
FOR ALL TO authenticated
USING (public.is_super_admin(auth.uid()) OR (school_id = public.get_user_school(auth.uid()) AND public.has_role(auth.uid(), 'school_admin')))
WITH CHECK (public.is_super_admin(auth.uid()) OR (school_id = public.get_user_school(auth.uid()) AND public.has_role(auth.uid(), 'school_admin')));

CREATE TRIGGER trg_exam_questions_updated BEFORE UPDATE ON public.exam_questions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_exam_questions_exam ON public.exam_questions(exam_id, order_index);

-- 4. Assignment extensions
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS open_at timestamptz,
  ADD COLUMN IF NOT EXISTS allow_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_score numeric NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- 5. Submission extensions
ALTER TABLE public.assignment_submissions
  ADD COLUMN IF NOT EXISTS is_late boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS graded_by uuid,
  ADD COLUMN IF NOT EXISTS grade_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS returned_at timestamptz;

-- 6. Exam extensions
ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS available_from timestamptz,
  ADD COLUMN IF NOT EXISTS available_to timestamptz,
  ADD COLUMN IF NOT EXISTS randomize boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS document_url text,
  ADD COLUMN IF NOT EXISTS exam_kind text NOT NULL DEFAULT 'document';

-- 7. Cross-user notification helper (same school only)
CREATE OR REPLACE FUNCTION public.notify_school_user(
  _user_id uuid,
  _type text,
  _title text,
  _body text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_school uuid;
  target_school uuid;
BEGIN
  SELECT school_id INTO caller_school FROM public.profiles WHERE id = auth.uid();
  SELECT school_id INTO target_school FROM public.profiles WHERE id = _user_id;
  IF caller_school IS NULL OR target_school IS NULL OR caller_school IS DISTINCT FROM target_school THEN
    RETURN;
  END IF;
  INSERT INTO public.teacher_notifications (user_id, school_id, type, title, body, read)
  VALUES (_user_id, target_school, _type, _title, _body, false);
END;
$$;

REVOKE ALL ON FUNCTION public.notify_school_user(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_school_user(uuid, text, text, text) TO authenticated;