import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const idSchema = z.object({ id: z.string().uuid() });

async function getStudentRow(supabase: any, userId: string) {
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as any;
}

export const getStudentOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return { student: null, school: null, klass: null, stats: null };

    const [{ data: school }, { data: klass }] = await Promise.all([
      supabase.from("schools").select("id, name, city, province, logo_url").eq("id", student.school_id).maybeSingle(),
      student.class_id
        ? supabase.from("classes").select("id, name, level, academic_year").eq("id", student.class_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    // Attendance stats
    const { data: attRecs } = await supabase
      .from("attendance_records")
      .select("status")
      .eq("student_id", student.id);
    const total = (attRecs ?? []).length;
    const present = (attRecs ?? []).filter((r: any) => r.status === "present").length;
    const absent = (attRecs ?? []).filter((r: any) => r.status === "absent").length;
    const late = (attRecs ?? []).filter((r: any) => r.status === "late").length;
    const attendancePct = total ? Math.round((present / total) * 100) : 0;

    // Grades average
    const { data: results } = await supabase
      .from("exam_results")
      .select("score, exams(max_score, status)")
      .eq("student_id", student.id);
    const graded = (results ?? []).filter((r: any) => r.score !== null && r.exams?.status === "published");
    const avg = graded.length
      ? Math.round(
          (graded.reduce((s: number, r: any) => s + (Number(r.score) / Number(r.exams.max_score || 100)) * 100, 0) / graded.length) * 10
        ) / 10
      : 0;

    // Subjects, assignments, upcoming exams, messages
    let subjectsCount = 0;
    if (student.class_id) {
      const { data: tcs } = await supabase
        .from("teacher_class_subjects")
        .select("subject_id")
        .eq("class_id", student.class_id);
      subjectsCount = new Set((tcs ?? []).map((r: any) => r.subject_id)).size;
    }

    const [{ data: assignments }, { data: subs }, upExams, unread, ann] = await Promise.all([
      student.class_id
        ? supabase.from("assignments").select("id, due_date, status").eq("class_id", student.class_id).eq("status", "open")
        : Promise.resolve({ data: [] }),
      supabase.from("assignment_submissions").select("assignment_id, grade").eq("student_id", student.id),
      student.class_id
        ? supabase
            .from("exams")
            .select("id", { count: "exact", head: true })
            .eq("class_id", student.class_id)
            .eq("status", "published")
            .gte("exam_date", new Date().toISOString().slice(0, 10))
        : Promise.resolve({ count: 0 }),
      supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", context.userId).is("read_at", null),
      supabase.from("announcements").select("id", { count: "exact", head: true }).eq("school_id", student.school_id),
    ]);

    const submittedIds = new Set((subs ?? []).map((s: any) => s.assignment_id));
    const pending = (assignments ?? []).filter((a: any) => !submittedIds.has(a.id)).length;
    const completed = (subs ?? []).length;

    return {
      student,
      school,
      klass,
      stats: {
        attendancePct,
        present,
        absent,
        late,
        totalDays: total,
        avg,
        subjects: subjectsCount,
        pending,
        completed,
        upcomingExams: (upExams as any).count ?? 0,
        unreadMessages: (unread as any).count ?? 0,
        announcements: (ann as any).count ?? 0,
      },
    };
  });

export const listStudentSubjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student?.class_id) return [];
    const { data: tcs } = await supabase
      .from("teacher_class_subjects")
      .select("weekly_hours, subjects(id, name, code), teachers(first_name, last_name)")
      .eq("class_id", student.class_id);

    // Attach current subject average from published exams
    const { data: results } = await supabase
      .from("exam_results")
      .select("score, exams(subject_id, max_score, status)")
      .eq("student_id", student.id);
    const bySubject: Record<string, { total: number; n: number }> = {};
    for (const r of (results ?? []) as any[]) {
      if (r.exams?.status !== "published") continue;
      const sid = r.exams?.subject_id;
      if (!sid) continue;
      const pct = (Number(r.score) / Number(r.exams.max_score || 100)) * 100;
      bySubject[sid] = bySubject[sid] || { total: 0, n: 0 };
      bySubject[sid].total += pct;
      bySubject[sid].n += 1;
    }
    return (tcs ?? []).map((row: any) => {
      const sid = row.subjects?.id;
      const agg = sid ? bySubject[sid] : null;
      return {
        ...row,
        average: agg && agg.n ? Math.round((agg.total / agg.n) * 10) / 10 : null,
      };
    });
  });

export const listStudentAssignments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student?.class_id) return [];
    const [{ data: assignments }, { data: subs }] = await Promise.all([
      supabase
        .from("assignments")
        .select("*, subjects(name), teachers(first_name, last_name)")
        .eq("class_id", student.class_id)
        .not("published_at", "is", null)
        .neq("status", "archived")
        .order("due_date", { ascending: true, nullsFirst: false }),
      supabase.from("assignment_submissions").select("*").eq("student_id", student.id),
    ]);
    const bySub: Record<string, any> = {};
    for (const s of (subs ?? []) as any[]) {
      const visible = s.grade_published ? s : { ...s, grade: null, feedback: null };
      // Files are served through the app endpoint, never as raw storage URLs.
      visible.file_url = null;
      bySub[s.assignment_id] = visible;
    }
    return (assignments ?? []).map((a: any) => ({ ...a, submission: bySub[a.id] ?? null }));
  });

const submitSchema = z.object({
  assignment_id: z.string().uuid(),
  content: z.string().optional().nullable(),
  file_path: z.string().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_type: z.string().optional().nullable(),
  file_size: z.number().optional().nullable(),
});

/** Short-lived, app-internal link to the student's OWN submitted file. */
export const getMySubmissionFileLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ submission_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) throw new Error("Profil élève introuvable.");
    const { data: row, error } = await supabase
      .from("assignment_submissions")
      .select("id, student_id, file_path, file_name, file_type")
      .eq("id", data.submission_id)
      .maybeSingle();
    if (error) {
      console.error("[getMySubmissionFileLink] lookup failed", error);
      throw new Error("Impossible d'ouvrir ce fichier. Veuillez réessayer.");
    }
    if (!row || row.student_id !== student.id || !row.file_path) {
      throw new Error("Fichier introuvable.");
    }
    const { signFileToken } = await import("@/lib/file-token.server");
    const token = await signFileToken({
      b: "teacher-materials",
      p: row.file_path,
      n: row.file_name ?? "remise",
      t: row.file_type ?? null,
    });
    return { url: `/api/public/submission-file?t=${encodeURIComponent(token)}`, file_name: row.file_name ?? "remise" };
  });

/**
 * Validates that the signed-in student may submit to this assignment and
 * returns the storage path the file must be uploaded to. The path starts with
 * the school id, which is required by the storage access rules.
 */
export const prepareSubmissionUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ assignment_id: z.string().uuid(), file_name: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) throw new Error("Profil élève introuvable. Contactez le secrétariat de votre école.");
    const assignment = await loadSubmittableAssignment(supabase, data.assignment_id, student);
    const safeName = data.file_name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-120);
    return {
      bucket: "teacher-materials",
      path: `${student.school_id}/submissions/${assignment.id}/${student.id}/${Date.now()}-${safeName}`,
      is_late: assignment.is_late,
    };
  });

async function loadSubmittableAssignment(supabase: any, assignmentId: string, student: any) {
  const { data: assignment, error } = await supabase
    .from("assignments")
    .select("id, title, class_id, due_date, allow_late, status, open_at, teacher_id, published_at")
    .eq("id", assignmentId)
    .maybeSingle();
  if (error) throw new Error("Impossible de charger ce devoir. Réessayez.");
  if (!assignment) throw new Error("Devoir introuvable");
  if (assignment.class_id !== student.class_id) throw new Error("Ce devoir n'est pas destiné à votre classe");
  if (!assignment.published_at) throw new Error("Ce devoir n'est pas encore publié");
  if (assignment.open_at && new Date(assignment.open_at) > new Date()) {
    throw new Error("Ce devoir n'est pas encore ouvert");
  }
  if (assignment.status !== "open") throw new Error("Ce devoir est clôturé");
  const is_late = Boolean(assignment.due_date) && new Date(assignment.due_date) < new Date();
  if (is_late && !assignment.allow_late) {
    throw new Error("La date limite est dépassée : les remises tardives ne sont pas autorisées");
  }
  return { ...assignment, is_late };
}

export const submitAssignment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => submitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) throw new Error("Profil élève introuvable. Contactez le secrétariat de votre école.");

    const assignment = await loadSubmittableAssignment(supabase, data.assignment_id, student);
    const past = assignment.is_late;

    if (!data.file_path && !(data.content && data.content.trim())) {
      throw new Error("Ajoutez un texte ou un fichier avant d'envoyer votre travail.");
    }

    const { data: existing } = await supabase
      .from("assignment_submissions")
      .select("file_path, file_name, file_type, file_size")
      .eq("assignment_id", data.assignment_id)
      .eq("student_id", student.id)
      .maybeSingle();

    const { error } = await supabase.from("assignment_submissions").upsert(
      {
        assignment_id: data.assignment_id,
        student_id: student.id,
        content: data.content ?? null,
        file_path: data.file_path ?? existing?.file_path ?? null,
        file_name: data.file_name ?? existing?.file_name ?? null,
        file_type: data.file_type ?? existing?.file_type ?? null,
        file_size: data.file_size ?? existing?.file_size ?? null,
        submitted_at: new Date().toISOString(),
        is_late: past,
        status: past ? "late" : "submitted",
        grade: null,
        feedback: null,
        graded_at: null,
        graded_by: null,
        grade_published: false,
        returned_at: null,
      },
      { onConflict: "assignment_id,student_id" as any },
    );
    if (error) throw new Error(`Votre remise n'a pas pu être enregistrée : ${error.message}`);

    const { data: teacher } = await supabase.from("teachers").select("user_id").eq("id", assignment.teacher_id).maybeSingle();
    if (teacher?.user_id) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await (supabaseAdmin as any).rpc("notify_user_as", {
        _caller_id: context.userId,
        _user_id: teacher.user_id,
        _type: "submission",
        _title: "Nouvelle remise de devoir",
        _body: `${student.first_name} ${student.last_name} — ${assignment.title}`,
      });
    }
    return { ok: true, is_late: past, submitted_at: new Date().toISOString() };
  });

export const listStudentExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student?.class_id) return { exams: [], results: [] };
    const [{ data: exams }, { data: results }] = await Promise.all([
      supabase
        .from("exams")
        .select("*, subjects(name)")
        .eq("class_id", student.class_id)
        .eq("status", "published")
        .order("exam_date", { ascending: false, nullsFirst: false }),
      supabase.from("exam_results").select("*").eq("student_id", student.id),
    ]);
    return { exams: exams ?? [], results: results ?? [] };
  });

export const getStudentReportCard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return null;
    const { data: results } = await supabase
      .from("exam_results")
      .select("score, grade, position, comment, exams(title, term, max_score, exam_date, subjects(name), status)")
      .eq("student_id", student.id);
    const rows = (results ?? []).filter((r: any) => r.exams?.status === "published");
    return { student, rows };
  });

export const listStudentAttendance = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return [];
    const { data } = await supabase
      .from("attendance_records")
      .select("status, attendance_sessions(session_date, subjects(name), classes(name))")
      .eq("student_id", student.id)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const listStudentTimetable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student?.class_id) return [];
    const { data } = await supabase
      .from("timetable_slots")
      .select("*, subjects(name), teachers(first_name, last_name)")
      .eq("class_id", student.class_id)
      .order("day_of_week")
      .order("start_time");
    return data ?? [];
  });

export const getStudentCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return { classesToday: [], exams: [], assignments: [], events: [] };

    const today = new Date();
    const dow = today.getDay(); // 0=Sunday
    const in90 = new Date(today.getTime() + 90 * 86400000).toISOString();
    const todayISO = today.toISOString().slice(0, 10);

    const [classesToday, exams, assignments, events] = await Promise.all([
      student.class_id
        ? supabase
            .from("timetable_slots")
            .select("id, start_time, end_time, room, subjects(name), teachers(first_name, last_name)")
            .eq("class_id", student.class_id)
            .eq("day_of_week", dow)
            .order("start_time")
        : Promise.resolve({ data: [] }),
      student.class_id
        ? supabase
            .from("exams")
            .select("id, title, exam_date, term, subjects(name)")
            .eq("class_id", student.class_id)
            .gte("exam_date", todayISO)
            .order("exam_date", { ascending: true })
            .limit(50)
        : Promise.resolve({ data: [] }),
      student.class_id
        ? supabase
            .from("assignments")
            .select("id, title, due_date, status, subjects(name)")
            .eq("class_id", student.class_id)
            .eq("status", "open")
            .gte("due_date", today.toISOString())
            .lte("due_date", in90)
            .order("due_date", { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from("calendar_events")
        .select("id, title, description, kind, starts_at, ends_at, audience")
        .eq("school_id", student.school_id)
        .gte("starts_at", today.toISOString())
        .order("starts_at", { ascending: true })
        .limit(100),
    ]);

    return {
      classesToday: (classesToday as any).data ?? [],
      exams: (exams as any).data ?? [],
      assignments: (assignments as any).data ?? [],
      events: (events as any).data ?? [],
    };
  });

export const listStudentAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return [];
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("school_id", student.school_id)
      .eq("status", "published")
      .or(`publish_at.is.null,publish_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const listStudentMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    const [{ data: inbox }, { data: sent }] = await Promise.all([
      supabase.from("messages").select("*").eq("recipient_id", context.userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("messages").select("*").eq("sender_id", context.userId).order("created_at", { ascending: false }).limit(50),
    ]);
    // Recipients: teachers of the student's class + school admins/secretaries
    let recipients: any[] = [];
    if (student?.school_id) {
      const { data: staff } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("school_id", student.school_id)
        .neq("id", context.userId);
      recipients = staff ?? [];
    }
    return { inbox: inbox ?? [], sent: sent ?? [], recipients };
  });

const msgSchema = z.object({
  recipient_id: z.string().uuid(),
  subject: z.string().optional().nullable(),
  body: z.string().min(1),
});

export const sendStudentMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => msgSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) throw new Error("Student profile not found");
    const { error } = await supabase.from("messages").insert({
      school_id: student.school_id,
      sender_id: context.userId,
      recipient_id: data.recipient_id,
      subject: data.subject ?? null,
      body: data.body,
    });
    if (error) throw error;
    return { ok: true };
  });

export const markMessageRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("recipient_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const listStudentMaterials = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return [];
    const filters: any[] = [`class_id.eq.${student.class_id}`, "class_id.is.null"];
    const { data } = await supabase
      .from("teacher_documents")
      .select("*, subjects(name), teachers(first_name, last_name)")
      .eq("school_id", student.school_id)
      .or(filters.join(","))
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const listStudentBookmarks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const { data } = await supabase.from("student_bookmarks").select("*").eq("user_id", context.userId);
    return data ?? [];
  });

export const listStudentResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) return [];
    const { data } = await supabase
      .from("teaching_resources")
      .select("*, subjects(name), classes(name), teachers(first_name, last_name)")
      .eq("school_id", student.school_id)
      .or(`class_id.is.null,class_id.eq.${student.class_id ?? "00000000-0000-0000-0000-000000000000"}`)
      .eq("status", "published")
      .lte("publish_at", new Date().toISOString())
      .order("publish_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

const searchSchema = z.object({ q: z.string().min(1).max(120) });

export const searchStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => searchSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) {
      return { subjects: [], assignments: [], materials: [], announcements: [], messages: [] };
    }
    const q = data.q.trim();
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    const classId = student.class_id;

    const subjectsP = classId
      ? supabase
          .from("teacher_class_subjects")
          .select("subjects(id, name, code)")
          .eq("class_id", classId)
      : Promise.resolve({ data: [] });

    const assignmentsP = classId
      ? supabase
          .from("assignments")
          .select("id, title, instructions, due_date, status, subjects(name)")
          .eq("class_id", classId)
          .or(`title.ilike.${like},instructions.ilike.${like}`)
          .order("due_date", { ascending: false, nullsFirst: false })
          .limit(20)
      : Promise.resolve({ data: [] });

    const materialsP = supabase
      .from("teacher_documents")
      .select("id, name, kind, url, created_at, subjects(name)")
      .eq("school_id", student.school_id)
      .or(`class_id.eq.${classId ?? "00000000-0000-0000-0000-000000000000"},class_id.is.null`)
      .ilike("name", like)
      .order("created_at", { ascending: false })
      .limit(20);

    const announcementsP = supabase
      .from("announcements")
      .select("id, title, body, created_at")
      .eq("school_id", student.school_id)
      .or(`title.ilike.${like},body.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(20);

    const messagesP = supabase
      .from("messages")
      .select("id, subject, body, created_at, sender_id, recipient_id, read_at")
      .or(`sender_id.eq.${context.userId},recipient_id.eq.${context.userId}`)
      .or(`subject.ilike.${like},body.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(20);

    const [subjRes, aRes, mRes, anRes, msgRes] = await Promise.all([
      subjectsP,
      assignmentsP,
      materialsP,
      announcementsP,
      messagesP,
    ]);

    const needle = q.toLowerCase();
    const subjects = (((subjRes as any).data ?? []) as any[])
      .map((r) => r.subjects)
      .filter((s: any) => s && (s.name?.toLowerCase().includes(needle) || s.code?.toLowerCase().includes(needle)))
      .filter((s: any, i: number, arr: any[]) => arr.findIndex((x) => x.id === s.id) === i)
      .slice(0, 20);

    return {
      subjects,
      assignments: (aRes as any).data ?? [],
      materials: (mRes as any).data ?? [],
      announcements: (anRes as any).data ?? [],
      messages: (msgRes as any).data ?? [],
    };
  });

const bookmarkSchema = z.object({
  target_type: z.string(),
  target_id: z.string().uuid(),
  action: z.enum(["add", "remove"]),
});

export const toggleBookmark = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bookmarkSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    if (data.action === "add") {
      const { error } = await supabase.from("student_bookmarks").upsert(
        { user_id: context.userId, target_type: data.target_type, target_id: data.target_id },
        { onConflict: "user_id,target_type,target_id" as any },
      );
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("student_bookmarks")
        .delete()
        .eq("user_id", context.userId)
        .eq("target_type", data.target_type)
        .eq("target_id", data.target_id);
      if (error) throw error;
    }
    return { ok: true };
  });

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
});

export const askStudentAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => chatSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI non configuré");

    const systemPrompt = `Tu es l'assistant pédagogique de SmartSchool RDC pour un élève${
      student?.class_id ? ` de la classe ${student.class_id}` : ""
    }. Réponds en français par défaut (ou dans la langue de l'élève). Sois bienveillant, clair, et concis. Aide à comprendre les devoirs, planifier les révisions, expliquer des concepts et donner des conseils d'étude. Ne partage jamais d'informations d'autres élèves.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error("Limite atteinte, réessayez plus tard.");
      if (res.status === 402) throw new Error("Crédits IA épuisés.");
      throw new Error(`AI error: ${text}`);
    }
    const json = await res.json();
    const reply = json.choices?.[0]?.message?.content ?? "";
    return { reply };
  });

const profilePrefsSchema = z.object({
  photo_url: z.string().optional().nullable(),
});

export const updateStudentPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => profilePrefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    const student = await getStudentRow(supabase, context.userId);
    if (!student) throw new Error("Student not found");
    const { error } = await supabase
      .from("students")
      .update({ photo_url: data.photo_url ?? null })
      .eq("id", student.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });