-- Clean orphans before adding FKs
DELETE FROM public.timetable_slots t WHERE NOT EXISTS (SELECT 1 FROM public.schools s WHERE s.id = t.school_id) OR NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = t.class_id);
UPDATE public.timetable_slots t SET subject_id = NULL WHERE subject_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.subjects s WHERE s.id = t.subject_id);
UPDATE public.timetable_slots t SET teacher_id = NULL WHERE teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teachers s WHERE s.id = t.teacher_id);
UPDATE public.classes c SET class_teacher_id = NULL WHERE class_teacher_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.teachers t WHERE t.id = c.class_teacher_id);
DELETE FROM public.fee_structures f WHERE NOT EXISTS (SELECT 1 FROM public.schools s WHERE s.id = f.school_id);
UPDATE public.fee_structures f SET class_id = NULL WHERE class_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = f.class_id);
DELETE FROM public.fee_payments p WHERE NOT EXISTS (SELECT 1 FROM public.schools s WHERE s.id = p.school_id) OR NOT EXISTS (SELECT 1 FROM public.students st WHERE st.id = p.student_id);
UPDATE public.fee_payments p SET fee_structure_id = NULL WHERE fee_structure_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.fee_structures f WHERE f.id = p.fee_structure_id);

ALTER TABLE public.timetable_slots
  ADD CONSTRAINT timetable_slots_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD CONSTRAINT timetable_slots_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE,
  ADD CONSTRAINT timetable_slots_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE SET NULL,
  ADD CONSTRAINT timetable_slots_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.classes
  ADD CONSTRAINT classes_class_teacher_id_fkey FOREIGN KEY (class_teacher_id) REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE public.fee_structures
  ADD CONSTRAINT fee_structures_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD CONSTRAINT fee_structures_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE public.fee_payments
  ADD CONSTRAINT fee_payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE,
  ADD CONSTRAINT fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE,
  ADD CONSTRAINT fee_payments_fee_structure_id_fkey FOREIGN KEY (fee_structure_id) REFERENCES public.fee_structures(id) ON DELETE SET NULL;

-- Dedupe then enforce uniqueness for teacher assignments and submissions
DELETE FROM public.teacher_class_subjects a USING public.teacher_class_subjects b
  WHERE a.ctid < b.ctid AND a.teacher_id = b.teacher_id AND a.class_id = b.class_id AND a.subject_id = b.subject_id;
CREATE UNIQUE INDEX IF NOT EXISTS teacher_class_subjects_unique_idx ON public.teacher_class_subjects (teacher_id, class_id, subject_id);

DELETE FROM public.assignment_submissions a USING public.assignment_submissions b
  WHERE a.ctid < b.ctid AND a.assignment_id = b.assignment_id AND a.student_id = b.student_id;
CREATE UNIQUE INDEX IF NOT EXISTS assignment_submissions_unique_idx ON public.assignment_submissions (assignment_id, student_id);

CREATE INDEX IF NOT EXISTS timetable_slots_class_idx ON public.timetable_slots (class_id);
CREATE INDEX IF NOT EXISTS timetable_slots_teacher_idx ON public.timetable_slots (teacher_id);
CREATE INDEX IF NOT EXISTS teaching_resources_class_idx ON public.teaching_resources (class_id);
CREATE INDEX IF NOT EXISTS assignments_class_idx ON public.assignments (class_id);
CREATE INDEX IF NOT EXISTS exams_class_idx ON public.exams (class_id);
CREATE INDEX IF NOT EXISTS students_user_idx ON public.students (user_id);
CREATE INDEX IF NOT EXISTS teachers_user_idx ON public.teachers (user_id);