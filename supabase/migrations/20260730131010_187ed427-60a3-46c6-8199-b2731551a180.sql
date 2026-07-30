
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS motto text,
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS territory text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS facebook text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS stamp_url text,
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS academic_year text,
  ADD COLUMN IF NOT EXISTS current_term text,
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'CDF',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Africa/Kinshasa';

ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS section text,
  ADD COLUMN IF NOT EXISTS class_teacher_id uuid;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS qualification text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS publish_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

CREATE TABLE IF NOT EXISTS public.fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid,
  name text NOT NULL,
  description text,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CDF',
  term text,
  academic_year text,
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_structures TO authenticated;
GRANT ALL ON public.fee_structures TO service_role;
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_structures_school_read" ON public.fee_structures
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fee_structures_school_manage" ON public.fee_structures
  FOR ALL TO authenticated
  USING (
    school_id = public.get_user_school(auth.uid())
    AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'secretary'))
  )
  WITH CHECK (
    school_id = public.get_user_school(auth.uid())
    AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'secretary'))
  );

CREATE TABLE IF NOT EXISTS public.fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  fee_structure_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CDF',
  method text,
  reference text,
  receipt_no text,
  status text NOT NULL DEFAULT 'paid',
  paid_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_payments TO authenticated;
GRANT ALL ON public.fee_payments TO service_role;
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fee_payments_school_read" ON public.fee_payments
  FOR SELECT TO authenticated
  USING (school_id = public.get_user_school(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE POLICY "fee_payments_school_manage" ON public.fee_payments
  FOR ALL TO authenticated
  USING (
    school_id = public.get_user_school(auth.uid())
    AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'secretary'))
  )
  WITH CHECK (
    school_id = public.get_user_school(auth.uid())
    AND (public.has_role(auth.uid(),'school_admin') OR public.has_role(auth.uid(),'accountant') OR public.has_role(auth.uid(),'secretary'))
  );

CREATE INDEX IF NOT EXISTS idx_fee_payments_student ON public.fee_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school ON public.fee_structures(school_id);

CREATE TRIGGER set_fee_structures_updated_at BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_fee_payments_updated_at BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
