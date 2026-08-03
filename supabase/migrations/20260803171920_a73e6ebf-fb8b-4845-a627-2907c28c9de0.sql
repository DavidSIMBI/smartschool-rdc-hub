-- 1. Fee structures / fee payments: restrict reads to finance roles + own records
DROP POLICY IF EXISTS "fee_structures_school_read" ON public.fee_structures;
CREATE POLICY "fee_structures_finance_read" ON public.fee_structures
FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    school_id = get_user_school(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR has_role(auth.uid(), 'secretary'::app_role)
    )
  )
);

CREATE POLICY "fee_structures_student_read" ON public.fee_structures
FOR SELECT TO authenticated
USING (
  school_id = get_user_school(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.user_id = auth.uid()
      AND s.school_id = fee_structures.school_id
      AND (fee_structures.class_id IS NULL OR s.class_id = fee_structures.class_id)
  )
);

DROP POLICY IF EXISTS "fee_payments_school_read" ON public.fee_payments;
CREATE POLICY "fee_payments_finance_read" ON public.fee_payments
FOR SELECT TO authenticated
USING (
  is_super_admin(auth.uid())
  OR (
    school_id = get_user_school(auth.uid())
    AND (
      has_role(auth.uid(), 'school_admin'::app_role)
      OR has_role(auth.uid(), 'accountant'::app_role)
      OR has_role(auth.uid(), 'secretary'::app_role)
    )
  )
);

CREATE POLICY "fee_payments_student_read" ON public.fee_payments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = fee_payments.student_id
      AND s.user_id = auth.uid()
  )
);

-- 2. Subscriptions / payments: require admin or accountant role
DROP POLICY IF EXISTS "School admin reads own subscription" ON public.subscriptions;
CREATE POLICY "School admin reads own subscription" ON public.subscriptions
FOR SELECT TO authenticated
USING (
  school_id = get_user_school(auth.uid())
  AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  )
);

DROP POLICY IF EXISTS "School admin reads own payments" ON public.payments;
CREATE POLICY "School admin reads own payments" ON public.payments
FOR SELECT TO authenticated
USING (
  school_id = get_user_school(auth.uid())
  AND (
    has_role(auth.uid(), 'school_admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  )
);

-- 3. SECURITY DEFINER helpers: signed-in callers may only ask about themselves
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN current_setting('role', true) = 'authenticated'
         AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN current_setting('role', true) = 'authenticated'
         AND _user_id IS DISTINCT FROM auth.uid() THEN false
    ELSE EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin')
  END
$function$;

CREATE OR REPLACE FUNCTION public.get_user_school(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN current_setting('role', true) = 'authenticated'
         AND _user_id IS DISTINCT FROM auth.uid() THEN NULL::uuid
    ELSE (SELECT school_id FROM public.profiles WHERE id = _user_id LIMIT 1)
  END
$function$;