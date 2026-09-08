# BACKEND FEATURES TO IMPLEMENT LATER

Every screen in SmartSchool RDC that cannot run on the browser alone. If you rebuild
the backend yourself, this is the contract the frontend expects.

Current implementation: Supabase (Postgres + Row Level Security) for data and auth,
Supabase Storage for files, TanStack Start server functions (`src/lib/*.functions.ts`)
for all privileged logic, plus one public HTTP route for file streaming.

---

## 1. Authentication & session

| Screen | Needs |
| --- | --- |
| `auth.login`, `auth.register` | Email + password sign-in/sign-up, Google OAuth, session persistence, session refresh |
| `auth.forgot-password`, `auth.reset-password` | Password-reset email, single-use token with expiry, clear invalid/expired response |
| `src/lib/auth-context.tsx` | Endpoint returning the current user, their roles and their school id |

Backend must: issue and verify sessions, hash passwords, send reset mail, expose
`GET /me` returning `{ user, roles[], schoolId }`.

## 2. Multi-school isolation (tenancy)

Every read and write is scoped to one `school_id`. The backend must enforce this
server-side — never trust a school id sent from the browser. Roles live in a
separate `user_roles` table (never on the profile row) to prevent privilege
escalation, checked through a security-definer `has_role(user, role)` helper.

## 3. Roles & permissions

Six roles: `super_admin`, `school_admin`, `secretary`, `accountant`, `teacher`,
`student`. Backend must authorise each action per role, e.g. only a teacher assigned
to a class+subject may grade it, a student may read only their own records.

## 4. School Admin modules

| Module | Backend needs |
| --- | --- |
| Students | CRUD, admission numbers, CSV bulk import, class assignment, photo upload |
| Teachers | CRUD, invitations/accounts, subject & class assignment |
| Classes | CRUD, levels, sections, capacity, class-teacher link |
| Subjects / courses | CRUD, per-class subject catalogue, `teacher_class_subjects` mapping |
| Attendance | Daily records per class, present/absent/late, aggregation by student & period |
| Examinations | Exam schedule, marks entry, averages, ranks, report-card generation (PDF) |
| School fees | Fee items, payment records, balance & arrears reports, receipts |
| Timetable | Weekly slots per class/teacher/room, clash detection |
| Announcements | Create, target audiences, publish/unpublish |
| Notifications | Per-user notification rows, read/unread state, server-side creation only |
| School settings | School profile, logo upload, academic year & terms |

## 5. Teacher modules

Class rosters, attendance submission, assignment creation (deadline, late-submission
toggle), online exams (MCQ / true-false / short answer, randomisation, ordering),
grading with feedback and grade publication, lesson plans, teaching resources
(notes, videos, documents), messages, calendar, profile.

## 6. Student modules

Own profile & ID-card data, subjects, assignments with submission, exam results and
report card, attendance history, timetable, learning materials and resources,
announcements, messages, calendar, bookmarks, global search across their own data.

## 7. File storage

| Feature | Needs |
| --- | --- |
| Assignment submissions | Private bucket, school-scoped paths, size/type validation (PDF, Word, PPT, Excel, images, ZIP), stored metadata (path, name, mime, size) |
| Teaching resources & documents | Private bucket per school, teacher-only writes |
| School logo / assets | Public-read bucket scoped per school folder |
| Student & teacher photos | Upload + resize |

Downloads must not point at the storage host directly: ad-blockers break third-party
storage URLs. The current design issues a short-lived HMAC-signed token and streams
the bytes through the app's own domain (`/api/public/submission-file`), checking the
requester's permission first. Keep that pattern.

## 8. Server-side processing

- Report cards, receipts and lists rendered as PDF
- CSV import parsing and validation
- Averages, ranks, attendance rates, fee balances
- Live homepage counters (schools, students, teachers, admins) as a public aggregate endpoint
- Audit/activity log for Super Admin
- Signed file tokens (HMAC secret, server-only)

## 9. AI assistant

Student and Admin assistant screens call a model through a server-side gateway.
Backend must proxy the chat request, keep the API key server-side, and stream the
answer back. Never expose the key to the browser.

## 10. Payments & subscriptions

Super Admin manages school subscriptions, plans and payments. A real deployment
needs a payment provider (card and mobile money for the DRC market), webhook
verification, invoice records and subscription state transitions.

## 11. Other external services

- Transactional email (reset password, invitations, notifications)
- Optional SMS / WhatsApp alerts to parents
- Realtime channel for messages and live notifications
- Scheduled jobs (daily attendance reminders, fee-deadline notices)

## 12. Security checklist for the new backend

1. Row-level isolation by `school_id` on every table.
2. Roles in a dedicated table; role checks server-side only.
3. No anonymous read access to personal data.
4. Private storage buckets with ownership checks on the folder path.
5. Validate every input with zod (or equivalent) on the server.
6. Never return another user's PII; never log secrets.
7. Webhooks verify the provider signature before processing.
