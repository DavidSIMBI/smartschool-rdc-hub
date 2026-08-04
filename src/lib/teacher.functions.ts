import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ id: z.string().uuid() });

async function getTeacherRow(supabase: any, userId: string) {
  const { data } = await supabase
    .from("teachers")
    .select("id, first_name, last_name, email, phone, specialty, school_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data as { id: string; first_name: string; last_name: string; email: string | null; phone: string | null; specialty: string | null; school_id: string } | null;
}

async function assertTeachesClass(supabase: any, userId: string, classId?: string | null) {
  if (!classId) return;
  const { data } = await supabase
    .from("teacher_class_subjects")
    .select("id, teachers!inner(user_id)")
    .eq("class_id", classId)
    .eq("teachers.user_id", userId)
    .limit(1);
  if (!data || data.length === 0) {
    throw new Error("Vous n'enseignez pas dans cette classe");
  }
}

async function notifyUsers(supabase: any, userIds: (string | null | undefined)[], type: string, title: string, body: string) {
  const ids = Array.from(new Set(userIds.filter(Boolean))) as string[];
  for (const id of ids) {
    await supabase.rpc("notify_school_user", { _user_id: id, _type: type, _title: title, _body: body });
  }
}

async function notifyClassStudents(supabase: any, classId: string | null | undefined, type: string, title: string, body: string) {
  if (!classId) return;
  const { data } = await supabase.from("students").select("user_id").eq("class_id", classId).not("user_id", "is", null);
  await notifyUsers(supabase, (data ?? []).map((s: any) => s.user_id), type, title, body);
}

export const getTeacherOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) {
      return { teacher: null, school: null, stats: null, assignments: [] };
    }
    const { data: school } = await supabase
      .from("schools")
      .select("id, name, city, province, logo_url")
      .eq("id", teacher.school_id)
      .maybeSingle();

    const [{ data: tcs }, todayA, assignments, exams] = await Promise.all([
      supabase
        .from("teacher_class_subjects")
        .select("class_id, subject_id")
        .eq("teacher_id", teacher.id),
      supabase
        .from("attendance_sessions")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacher.id)
        .eq("session_date", new Date().toISOString().slice(0, 10)),
      supabase
        .from("assignments")
        .select("id, title, due_date, status", { count: "exact" })
        .eq("teacher_id", teacher.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("teacher_id", teacher.id)
        .eq("status", "draft"),
    ]);

    const classIds = Array.from(new Set((tcs ?? []).map((r: any) => r.class_id)));
    const subjectIds = Array.from(new Set((tcs ?? []).map((r: any) => r.subject_id)));

    let studentCount = 0;
    if (classIds.length) {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("class_id", classIds);
      studentCount = count ?? 0;
    }

    const { count: unreadMessages } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", context.userId)
      .is("read_at", null);

    return {
      teacher,
      school,
      stats: {
        classes: classIds.length,
        subjects: subjectIds.length,
        students: studentCount,
        lessonsToday: todayA.count ?? 0,
        attendanceToday: todayA.count ?? 0,
        assignments: assignments.count ?? 0,
        examsToGrade: exams.count ?? 0,
        unreadMessages: unreadMessages ?? 0,
      },
      assignments: assignments.data ?? [],
    };
  });

export const listMyClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("teacher_class_subjects")
      .select("class_id, subject_id, weekly_hours, classes(id, name, level, academic_year), subjects(id, name, code)")
      .eq("teacher_id", teacher.id);
    return data ?? [];
  });

export const getClassDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const [{ data: cls }, { data: students }] = await Promise.all([
      supabase.from("classes").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("students").select("*").eq("class_id", data.id).order("last_name"),
    ]);
    return { class: cls, students: students ?? [] };
  });

export const listMySubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("teacher_class_subjects")
      .select("weekly_hours, schedule, subjects(id, name, code), classes(id, name, level)")
      .eq("teacher_id", teacher.id);
    return data ?? [];
  });

// --- Attendance ---
const attendanceSaveSchema = z.object({
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  session_date: z.string(),
  notes: z.string().optional().nullable(),
  records: z.array(z.object({
    student_id: z.string().uuid(),
    status: z.enum(["present", "absent", "late", "excused"]),
  })),
});

export const saveAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => attendanceSaveSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) throw new Error("Teacher profile not found");

    const { data: session, error: sErr } = await supabase
      .from("attendance_sessions")
      .upsert({
        school_id: teacher.school_id,
        teacher_id: teacher.id,
        class_id: data.class_id,
        subject_id: data.subject_id ?? null,
        session_date: data.session_date,
        notes: data.notes ?? null,
      }, { onConflict: "teacher_id,class_id,session_date" as any, ignoreDuplicates: false })
      .select()
      .maybeSingle();
    if (sErr) throw sErr;

    let sessionRow = session;
    if (!sessionRow) {
      const { data: existing } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("teacher_id", teacher.id)
        .eq("class_id", data.class_id)
        .eq("session_date", data.session_date)
        .maybeSingle();
      sessionRow = existing;
    }
    if (!sessionRow) throw new Error("Failed to persist session");

    for (const r of data.records) {
      await supabase.from("attendance_records").upsert({
        session_id: sessionRow.id,
        student_id: r.student_id,
        status: r.status,
      }, { onConflict: "session_id,student_id" as any });
    }
    return { session_id: sessionRow.id };
  });

export const listAttendanceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("attendance_sessions")
      .select("id, session_date, notes, classes(name), subjects(name)")
      .eq("teacher_id", teacher.id)
      .order("session_date", { ascending: false })
      .limit(50);
    return data ?? [];
  });

// --- Assignments ---
const assignmentSchema = z.object({
  id: z.string().uuid().optional(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  instructions: z.string().optional().nullable(),
  due_date: z.string().nullable().optional(),
  attachments: z.array(z.object({ name: z.string(), url: z.string() })).default([]),
  status: z.enum(["open", "closed", "archived"]).default("open"),
});

const extendedAssignmentSchema = assignmentSchema.extend({
  open_at: z.string().nullable().optional(),
  allow_late: z.boolean().default(false),
  max_score: z.number().default(20),
  publish: z.boolean().default(false),
});

export const saveAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => extendedAssignmentSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) throw new Error("Teacher not found");
    await assertTeachesClass(supabase, context.userId, data.class_id);
    const payload = {
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      class_id: data.class_id,
      subject_id: data.subject_id ?? null,
      title: data.title,
      instructions: data.instructions ?? null,
      due_date: data.due_date ?? null,
      attachments: data.attachments,
      status: data.status,
      open_at: data.open_at ?? null,
      allow_late: data.allow_late,
      max_score: data.max_score,
      ...(data.publish ? { published_at: new Date().toISOString() } : {}),
    };
    if (data.id) {
      const { error } = await supabase.from("assignments").update(payload).eq("id", data.id);
      if (error) throw error;
      if (data.publish) {
        await notifyClassStudents(supabase, data.class_id, "assignment", "Devoir publié", data.title);
      }
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("assignments").insert(payload).select("id").maybeSingle();
    if (error) throw error;
    if (data.publish) {
      await notifyClassStudents(supabase, data.class_id, "assignment", "Nouveau devoir publié", data.title);
    }
    return { id: row!.id };
  });

export const publishAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("assignments")
      .update({ published_at: new Date().toISOString(), status: "open" })
      .eq("id", data.id)
      .select("title, class_id")
      .maybeSingle();
    if (error) throw error;
    if (row) await notifyClassStudents(supabase, row.class_id, "assignment", "Nouveau devoir publié", row.title);
    return { ok: true };
  });

export const deleteAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("assignments").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const listAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("assignments")
      .select("*, classes(name), subjects(name)")
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

// --- Exams ---
const examSchema = z.object({
  id: z.string().uuid().optional(),
  class_id: z.string().uuid(),
  subject_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  exam_date: z.string().nullable().optional(),
  max_score: z.number().default(100),
  term: z.string().nullable().optional(),
});

const extendedExamSchema = examSchema.extend({
  duration_minutes: z.number().nullable().optional(),
  available_from: z.string().nullable().optional(),
  available_to: z.string().nullable().optional(),
  randomize: z.boolean().default(false),
  document_url: z.string().nullable().optional(),
  exam_kind: z.enum(["document", "quiz"]).default("document"),
});

export const saveExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => extendedExamSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) throw new Error("Teacher not found");
    await assertTeachesClass(supabase, context.userId, data.class_id);
    const payload = {
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      class_id: data.class_id,
      subject_id: data.subject_id ?? null,
      title: data.title,
      exam_date: data.exam_date ?? null,
      max_score: data.max_score,
      term: data.term ?? null,
      duration_minutes: data.duration_minutes ?? null,
      available_from: data.available_from ?? null,
      available_to: data.available_to ?? null,
      randomize: data.randomize,
      document_url: data.document_url ?? null,
      exam_kind: data.exam_kind,
    };
    if (data.id) {
      const { error } = await supabase.from("exams").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("exams").insert(payload).select("id").maybeSingle();
    if (error) throw error;
    return { id: row!.id };
  });

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("exams")
      .select("*, classes(name), subjects(name)")
      .eq("teacher_id", teacher.id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

const marksSchema = z.object({
  exam_id: z.string().uuid(),
  results: z.array(z.object({
    student_id: z.string().uuid(),
    score: z.number().nullable(),
    comment: z.string().optional().nullable(),
  })),
});

function computeGrade(pct: number): string {
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  if (pct >= 50) return "E";
  return "F";
}

export const saveExamMarks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => marksSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: exam } = await supabase.from("exams").select("max_score").eq("id", data.exam_id).maybeSingle();
    const max = Number(exam?.max_score ?? 100);
    const withGrades = data.results
      .filter((r) => r.score !== null && r.score !== undefined)
      .map((r) => ({ score: r.score!, student_id: r.student_id, comment: r.comment ?? null }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    for (let i = 0; i < withGrades.length; i++) {
      const r = withGrades[i];
      const pct = (r.score / max) * 100;
      await supabase.from("exam_results").upsert({
        exam_id: data.exam_id,
        student_id: r.student_id,
        score: r.score,
        grade: computeGrade(pct),
        position: i + 1,
        comment: r.comment,
      }, { onConflict: "exam_id,student_id" as any });
    }
    return { ok: true, graded: withGrades.length };
  });

export const publishExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: row, error } = await supabase
      .from("exams")
      .update({ status: "published" })
      .eq("id", data.id)
      .select("title, class_id")
      .maybeSingle();
    if (error) throw error;
    if (row) await notifyClassStudents(supabase, row.class_id, "exam", "Examen publié", row.title);
    return { ok: true };
  });

export const unpublishExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("exams").update({ status: "draft" }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("exams").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getExamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const [{ data: exam }, { data: results }, { data: students }] = await Promise.all([
      supabase.from("exams").select("*").eq("id", data.id).maybeSingle(),
      supabase.from("exam_results").select("*").eq("exam_id", data.id),
      supabase.from("students").select("id, first_name, last_name").eq("class_id", (await supabase.from("exams").select("class_id").eq("id", data.id).maybeSingle()).data?.class_id ?? "00000000-0000-0000-0000-000000000000"),
    ]);
    return { exam, results: results ?? [], students: students ?? [] };
  });

// --- Lesson plans ---
const lessonSchema = z.object({
  id: z.string().uuid().optional(),
  class_id: z.string().uuid().nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  week: z.string().optional().nullable(),
  objectives: z.string().optional().nullable(),
  content: z.string().optional().nullable(),
});

export const saveLessonPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => lessonSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) throw new Error("Teacher not found");
    const payload = {
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      class_id: data.class_id ?? null,
      subject_id: data.subject_id ?? null,
      title: data.title,
      week: data.week ?? null,
      objectives: data.objectives ?? null,
      content: data.content ?? null,
    };
    if (data.id) {
      const { error } = await supabase.from("lesson_plans").update(payload).eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await supabase.from("lesson_plans").insert(payload).select("id").maybeSingle();
    if (error) throw error;
    return { id: row!.id };
  });

export const listLessonPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("lesson_plans")
      .select("*, classes(name), subjects(name)")
      .eq("teacher_id", teacher.id)
      .order("updated_at", { ascending: false });
    return data ?? [];
  });

// --- Messages ---
const messageSchema = z.object({
  recipient_id: z.string().uuid(),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
});

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => messageSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", context.userId).maybeSingle();
    if (!profile?.school_id) throw new Error("No school");
    const { error } = await supabase.from("messages").insert({
      school_id: profile.school_id,
      sender_id: context.userId,
      recipient_id: data.recipient_id,
      subject: data.subject ?? null,
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const [inbox, sent, colleagues] = await Promise.all([
      supabase.from("messages").select("*").eq("recipient_id", context.userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("messages").select("*").eq("sender_id", context.userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name, email").eq("school_id", (await supabase.from("profiles").select("school_id").eq("id", context.userId).maybeSingle()).data?.school_id ?? "00000000-0000-0000-0000-000000000000").neq("id", context.userId),
    ]);
    return { inbox: inbox.data ?? [], sent: sent.data ?? [], colleagues: colleagues.data ?? [] };
  });

export const markMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

// --- Calendar ---
const eventSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  kind: z.string().default("event"),
  starts_at: z.string(),
  ends_at: z.string().optional().nullable(),
});

export const listCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data } = await supabase.from("calendar_events").select("*").order("starts_at").limit(200);
    return data ?? [];
  });

export const createCalendarEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => eventSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { data: profile } = await supabase.from("profiles").select("school_id").eq("id", context.userId).maybeSingle();
    if (!profile?.school_id) throw new Error("No school");
    const { error } = await supabase.from("calendar_events").insert({
      school_id: profile.school_id,
      owner_id: context.userId,
      title: data.title,
      description: data.description ?? null,
      kind: data.kind,
      starts_at: data.starts_at,
      ends_at: data.ends_at ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

// --- Notifications ---
export const listTeacherNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data } = await supabase
      .from("teacher_notifications")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await supabase.from("teacher_notifications").update({ read: true }).eq("id", data.id).eq("user_id", context.userId);
    return { ok: true };
  });

// --- Profile ---
const profileSchema = z.object({
  full_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  avatar_url: z.string().optional().nullable(),
});

export const updateTeacherProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profileSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const patch: Record<string, unknown> = {};
    if (data.full_name !== undefined) patch.full_name = data.full_name;
    if (data.phone !== undefined) patch.phone = data.phone;
    if (data.avatar_url !== undefined) patch.avatar_url = data.avatar_url;
    const { error } = await supabase.from("profiles").update(patch).eq("id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

// --- Documents ---
const docSchema = z.object({
  name: z.string().min(1),
  url: z.string(),
  kind: z.string().optional().nullable(),
  size_bytes: z.number().optional().nullable(),
  class_id: z.string().uuid().optional().nullable(),
  subject_id: z.string().uuid().optional().nullable(),
});

export const saveDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => docSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) throw new Error("Teacher not found");
    const { error } = await supabase.from("teacher_documents").insert({
      teacher_id: teacher.id,
      school_id: teacher.school_id,
      name: data.name,
      url: data.url,
      kind: data.kind ?? null,
      size_bytes: data.size_bytes ?? null,
      class_id: data.class_id ?? null,
      subject_id: data.subject_id ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const teacher = await getTeacherRow(supabase, context.userId);
    if (!teacher) return [];
    const { data } = await supabase
      .from("teacher_documents")
      .select("*, classes(name), subjects(name)")
      .eq("school_id", teacher.school_id)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase.from("teacher_documents").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });