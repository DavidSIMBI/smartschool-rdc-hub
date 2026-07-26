# Teacher Dashboard — Build Plan

Untouched: landing page, Super Admin Dashboard, School Administrator Dashboard. Existing routes stay.

## 1. Data model (one migration)

New tables, all with `school_id`, RLS scoped via `get_user_school(auth.uid())`, and GRANTs to `authenticated` + `service_role`.

- `teacher_class_subjects` — link (teacher_id, class_id, subject_id, weekly_hours, schedule jsonb).
- `attendance_sessions` — (class_id, subject_id, teacher_id, date, notes).
- `attendance_records` — (session_id, student_id, status: present|absent|late|excused).
- `assignments` — (teacher_id, class_id, subject_id, title, instructions, due_date, attachments jsonb, status).
- `assignment_submissions` — (assignment_id, student_id, content, file_url, submitted_at, grade, feedback).
- `exams` — (class_id, subject_id, teacher_id, title, exam_date, max_score, term, status: draft|published).
- `exam_results` — (exam_id, student_id, score, grade, position, comment).
- `lesson_plans` — (teacher_id, class_id, subject_id, title, week, objectives, content, resources jsonb).
- `teacher_documents` — (teacher_id, class_id?, subject_id?, name, url, kind, size).
- `messages` — (school_id, sender_id, recipient_id, subject, body, read_at). Realtime enabled.
- `calendar_events` — (school_id, owner_id, title, kind, starts_at, ends_at, audience).
- `teacher_notifications` — (teacher_id, type, title, body, read).

Storage bucket `teacher-materials` (private) with owner-scoped policies.

Policies: teachers only see rows where `school_id = get_user_school(auth.uid())` AND, where relevant, `teacher_id = auth.uid()`. School admins + super admins retain oversight per existing patterns.

## 2. Routing (all under existing `_authenticated/` gate)

```
src/routes/dashboard.teacher.tsx                (existing shell, extended)
src/routes/dashboard.teacher.index.tsx          overview + stat cards + quick actions
src/routes/dashboard.teacher.classes.tsx        my classes list
src/routes/dashboard.teacher.classes.$id.tsx    class detail + student list
src/routes/dashboard.teacher.subjects.tsx       my subjects
src/routes/dashboard.teacher.attendance.tsx     take/edit/history
src/routes/dashboard.teacher.assignments.tsx    CRUD + attachments
src/routes/dashboard.teacher.exams.tsx          exams + marks entry + publish
src/routes/dashboard.teacher.lesson-plans.tsx   plans + PDF export
src/routes/dashboard.teacher.documents.tsx      material library
src/routes/dashboard.teacher.messages.tsx       inbox/sent/compose
src/routes/dashboard.teacher.calendar.tsx       month/week views
src/routes/dashboard.teacher.notifications.tsx  notifications
src/routes/dashboard.teacher.profile.tsx        avatar/phone/address/password
```

Role gate in `dashboard.teacher.tsx`: verify `has_role(uid, 'teacher')`; render `AccessDenied` for others. Redirect from `/dashboard` for teachers lands on `/dashboard/teacher`.

## 3. Server functions (`src/lib/teacher.functions.ts`)

All use `.middleware([requireSupabaseAuth])` and rely on RLS. Handlers:
- `getTeacherOverview` — profile, school, live counts.
- `listMyClasses`, `getClassDetail(classId)` with students.
- `listMySubjects` with weekly hours.
- `createAttendanceSession`, `saveAttendanceRecords`, `listAttendanceHistory`.
- `createAssignment`, `updateAssignment`, `deleteAssignment`, `listAssignments`.
- `createExam`, `saveExamMarks`, `publishExam`, `getClassPerformance`.
- `createLessonPlan`, `updateLessonPlan`, `listLessonPlans`.
- `uploadTeacherDocument` (signed URL flow), `listDocuments`, `deleteDocument`.
- `sendMessage`, `listInbox`, `listSent`, `markMessageRead`.
- `listCalendar`, `createCalendarEvent`.
- `listTeacherNotifications`, `markNotificationRead`.
- `updateTeacherProfile`, `changePassword`.

## 4. AI Teacher Assistant

- Streaming chat server route `src/routes/api/chat.teacher.ts` using Lovable AI Gateway (`google/gemini-3.6-flash`) with tools: `find_students`, `list_my_classes`, `generate_quiz`, `generate_lesson_ideas`, `draft_announcement`, `navigate`.
- Floating `<TeacherAssistant />` widget available on every teacher route, using `useChat` with `DefaultChatTransport`.
- All tool executions scoped to the teacher's school through the authenticated Supabase client on the server.

## 5. UI + design

- Reuse `DashboardShell` + emerald tokens. Add teacher-specific sidebar nav (Overview, Classes, Subjects, Attendance, Assignments, Exams, Lesson Plans, Documents, Messages, Calendar, Notifications, Profile).
- Glassmorphism stat cards, hover elevation, framer-motion page transitions, dark/light aware via existing theme.
- Global search command palette (⌘K) scoped to teacher's data.
- Toast feedback on all mutations.

## 6. Realtime + notifications

- Enable Realtime on `messages` and `teacher_notifications`.
- Root-scoped hook subscribes when a teacher is signed in, updates a badge in the sidebar.

## 7. Seed data

Attach the existing demo teachers to seeded classes/subjects, add sample assignments, one draft exam, one published exam with marks, a few lesson plans, and cross-teacher messages so the UI is populated on first login.

## 8. Security guarantees

- Every table RLS-scoped by `school_id` + teacher ownership.
- No client-side role decisions: `dashboard.teacher.tsx` calls `is_teacher` server function which uses `has_role`.
- Teachers cannot write to `schools`, `platform_settings`, `user_roles`, or another teacher's rows (enforced by policies).
- Storage bucket private; downloads via signed URLs from an authenticated server fn.

## Technical notes

- Uses existing `requireSupabaseAuth` + generated bearer attacher; no new middleware.
- PDF export uses `jspdf` already in the project.
- CSV/Excel import not in scope for teacher (already exists for admin).
- Messages table uses Supabase Realtime channel filtered by `recipient_id = auth.uid()`.
- No changes to auto-generated files (`client.ts`, `types.ts`, `routeTree.gen.ts`).
