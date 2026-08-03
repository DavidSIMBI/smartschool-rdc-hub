import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

type Ctx = { supabase: any; userId: string };

async function requireSchoolAdmin(context: Ctx) {
  const { data: profile } = await context.supabase
    .from("profiles")
    .select("school_id")
    .eq("id", context.userId)
    .maybeSingle();
  const schoolId = profile?.school_id as string | undefined;
  if (!schoolId) throw new Error("Aucune école associée à ce compte.");
  const { data: roles } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId);
  const list = (roles ?? []).map((r: any) => r.role);
  const allowed = list.some((r: string) =>
    ["school_admin", "secretary", "accountant", "super_admin"].includes(r),
  );
  if (!allowed) throw new Error("Accès refusé.");
  return { schoolId, roles: list as string[] };
}

const uuid = z.string().uuid();
const idInput = z.object({ id: uuid });

/* ------------------------------------------------------------------ */
/* overview                                                            */
/* ------------------------------------------------------------------ */

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const head = { count: "exact" as const, head: true };
    const [students, teachers, classes, announcements, school, payments, recent] =
      await Promise.all([
        sb.from("students").select("id", head).eq("school_id", schoolId),
        sb.from("teachers").select("id", head).eq("school_id", schoolId),
        sb.from("classes").select("id", head).eq("school_id", schoolId),
        sb.from("announcements").select("id", head).eq("school_id", schoolId),
        sb.from("schools").select("*").eq("id", schoolId).maybeSingle(),
        sb.from("fee_payments").select("amount, currency").eq("school_id", schoolId),
        sb
          .from("students")
          .select("id, first_name, last_name, matricule, created_at")
          .eq("school_id", schoolId)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
    const collected = (payments.data ?? []).reduce(
      (s: number, p: any) => s + Number(p.amount ?? 0),
      0,
    );
    return {
      schoolId,
      school: school.data ?? null,
      stats: {
        students: students.count ?? 0,
        teachers: teachers.count ?? 0,
        classes: classes.count ?? 0,
        announcements: announcements.count ?? 0,
        collected,
      },
      recentStudents: recent.data ?? [],
    };
  });

/* ------------------------------------------------------------------ */
/* reference lists                                                     */
/* ------------------------------------------------------------------ */

export const listReferenceData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [classes, subjects, teachers] = await Promise.all([
      sb.from("classes").select("id, name, level, section, academic_year, class_teacher_id").eq("school_id", schoolId).order("name"),
      sb.from("subjects").select("id, name, code").eq("school_id", schoolId).order("name"),
      sb.from("teachers").select("id, first_name, last_name, email, specialty").eq("school_id", schoolId).order("last_name"),
    ]);
    return {
      classes: classes.data ?? [],
      subjects: subjects.data ?? [],
      teachers: teachers.data ?? [],
    };
  });

/* ------------------------------------------------------------------ */
/* file upload                                                         */
/* ------------------------------------------------------------------ */

export const uploadSchoolFile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { folder: string; fileName: string; contentType: string; base64: string }) =>
    z
      .object({
        folder: z.string().min(1).max(40),
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1).max(120),
        base64: z.string().min(1).max(12_000_000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const clean = data.base64.includes(",") ? data.base64.split(",")[1] : data.base64;
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${schoolId}/${data.folder}/${Date.now()}-${safe}`;
    const { error } = await (supabaseAdmin as any).storage
      .from("school-assets")
      .upload(path, bytes, { contentType: data.contentType, upsert: true });
    if (error) throw new Error(error.message);
    const { data: signed } = await (supabaseAdmin as any).storage
      .from("school-assets")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    return { path, url: signed?.signedUrl as string };
  });

/* ------------------------------------------------------------------ */
/* students                                                            */
/* ------------------------------------------------------------------ */

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data } = await sb
      .from("students")
      .select(
        "id, first_name, last_name, matricule, gender, phone, email, address, date_of_birth, guardian_name, guardian_phone, photo_url, status, class_id, user_id, classes(name, section)",
      )
      .eq("school_id", schoolId)
      .order("last_name");
    return data ?? [];
  });

const studentInput = z.object({
  id: uuid.optional(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  gender: z.string().max(20).optional().nullable(),
  date_of_birth: z.string().max(20).optional().nullable(),
  guardian_name: z.string().max(120).optional().nullable(),
  guardian_phone: z.string().max(40).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  email: z.string().max(255).optional().nullable(),
  class_id: uuid.optional().nullable(),
  matricule: z.string().max(60).optional().nullable(),
  photo_url: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "suspended"]).optional(),
  createAccount: z.boolean().optional(),
  tempPassword: z.string().max(72).optional().nullable(),
});

export const saveStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => studentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { createAccount, tempPassword, id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));

    let studentId = id;
    if (id) {
      const { error } = await sb.from("students").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
    } else {
      const { data: inserted, error } = await sb.from("students").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      studentId = inserted.id;
    }

    if (createAccount && data.email && tempPassword) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: created, error: aErr } = await (supabaseAdmin as any).auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${data.first_name} ${data.last_name}` },
      });
      if (aErr) throw new Error(aErr.message);
      const uid = created.user.id;
      await (supabaseAdmin as any)
        .from("profiles")
        .upsert({ id: uid, email: data.email, full_name: `${data.first_name} ${data.last_name}`, school_id: schoolId });
      await (supabaseAdmin as any)
        .from("user_roles")
        .insert({ user_id: uid, role: "student", school_id: schoolId });
      await (supabaseAdmin as any).from("students").update({ user_id: uid }).eq("id", studentId);
    }
    return { id: studentId };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("students").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setStudentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, status: z.enum(["active", "suspended"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb
      .from("students")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* password reset (shared)                                             */
/* ------------------------------------------------------------------ */

async function resetPasswordFor(context: Ctx, schoolId: string, table: "students" | "teachers", rowId: string, password: string) {
  const sb = context.supabase;
  const { data: row } = await sb
    .from(table)
    .select("user_id")
    .eq("id", rowId)
    .eq("school_id", schoolId)
    .maybeSingle();
  if (!row?.user_id) throw new Error("Aucun compte de connexion associé.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await (supabaseAdmin as any).auth.admin.updateUserById(row.user_id, { password });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export const resetStudentPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    return resetPasswordFor(context as any, schoolId, "students", data.id, data.password);
  });

export const resetTeacherPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, password: z.string().min(8).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    return resetPasswordFor(context as any, schoolId, "teachers", data.id, data.password);
  });

/* ------------------------------------------------------------------ */
/* teachers                                                            */
/* ------------------------------------------------------------------ */

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [{ data: teachers }, { data: links }] = await Promise.all([
      sb
        .from("teachers")
        .select("id, first_name, last_name, email, phone, specialty, qualification, photo_url, status, user_id")
        .eq("school_id", schoolId)
        .order("last_name"),
      sb
        .from("teacher_class_subjects")
        .select("teacher_id, class_id, subject_id, classes(name), subjects(name)")
        .eq("school_id", schoolId),
    ]);
    return (teachers ?? []).map((t: any) => ({
      ...t,
      links: (links ?? []).filter((l: any) => l.teacher_id === t.id),
    }));
  });

const teacherInput = z.object({
  id: uuid.optional(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().max(255).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  specialty: z.string().max(200).optional().nullable(),
  qualification: z.string().max(200).optional().nullable(),
  photo_url: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).optional(),
  subjectIds: z.array(uuid).max(30).optional(),
  classIds: z.array(uuid).max(30).optional(),
  createAccount: z.boolean().optional(),
  tempPassword: z.string().max(72).optional().nullable(),
});

export const saveTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => teacherInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { subjectIds = [], classIds = [], createAccount, tempPassword, id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));

    let teacherId = id;
    if (id) {
      const { error } = await sb.from("teachers").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await sb.from("teachers").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      teacherId = ins.id;
    }

    if (subjectIds.length || classIds.length) {
      await sb.from("teacher_class_subjects").delete().eq("teacher_id", teacherId).eq("school_id", schoolId);
      const rows: any[] = [];
      for (const c of classIds) for (const s of subjectIds) rows.push({ school_id: schoolId, teacher_id: teacherId, class_id: c, subject_id: s });
      if (rows.length) await sb.from("teacher_class_subjects").insert(rows);
    }

    if (createAccount && data.email && tempPassword) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: created, error: aErr } = await (supabaseAdmin as any).auth.admin.createUser({
        email: data.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: `${data.first_name} ${data.last_name}` },
      });
      if (aErr) throw new Error(aErr.message);
      const uid = created.user.id;
      await (supabaseAdmin as any)
        .from("profiles")
        .upsert({ id: uid, email: data.email, full_name: `${data.first_name} ${data.last_name}`, school_id: schoolId });
      await (supabaseAdmin as any).from("user_roles").insert({ user_id: uid, role: "teacher", school_id: schoolId });
      await (supabaseAdmin as any).from("teachers").update({ user_id: uid }).eq("id", teacherId);
    }
    return { id: teacherId };
  });

export const deleteTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("teachers").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTeacherStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, status: z.enum(["active", "inactive"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("teachers").update({ status: data.status }).eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* classes & subjects                                                  */
/* ------------------------------------------------------------------ */

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [{ data: classes }, { data: students }, { data: teachers }] = await Promise.all([
      sb.from("classes").select("id, name, level, section, academic_year, class_teacher_id").eq("school_id", schoolId).order("name"),
      sb.from("students").select("id, class_id").eq("school_id", schoolId),
      sb.from("teachers").select("id, first_name, last_name").eq("school_id", schoolId),
    ]);
    return (classes ?? []).map((c: any) => ({
      ...c,
      student_count: (students ?? []).filter((s: any) => s.class_id === c.id).length,
      teacher: (teachers ?? []).find((t: any) => t.id === c.class_teacher_id) ?? null,
    }));
  });

export const saveClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().trim().min(1).max(80),
        level: z.string().max(60).optional().nullable(),
        section: z.string().max(60).optional().nullable(),
        academic_year: z.string().max(20).optional().nullable(),
        class_teacher_id: uuid.optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    if (id) {
      const { error } = await sb.from("classes").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("classes").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    await sb.from("students").update({ class_id: null }).eq("class_id", data.id).eq("school_id", schoolId);
    const { error } = await sb.from("classes").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const assignStudentsToClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ classId: uuid, studentIds: z.array(uuid).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    if (data.studentIds.length) {
      const { error } = await sb
        .from("students")
        .update({ class_id: data.classId })
        .in("id", data.studentIds)
        .eq("school_id", schoolId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: uuid.optional(), name: z.string().trim().min(1).max(80), code: z.string().max(20).optional().nullable() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    if (id) {
      const { error } = await sb.from("subjects").update(rest).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("subjects").insert({ ...rest, school_id: schoolId }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

/* ------------------------------------------------------------------ */
/* attendance                                                          */
/* ------------------------------------------------------------------ */

export const getAttendanceSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ classId: uuid, date: z.string().min(8).max(10) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data: students } = await sb
      .from("students")
      .select("id, first_name, last_name, matricule")
      .eq("school_id", schoolId)
      .eq("class_id", data.classId)
      .order("last_name");
    const { data: session } = await sb
      .from("attendance_sessions")
      .select("id, notes")
      .eq("school_id", schoolId)
      .eq("class_id", data.classId)
      .eq("session_date", data.date)
      .maybeSingle();
    let records: any[] = [];
    if (session) {
      const { data: recs } = await sb
        .from("attendance_records")
        .select("student_id, status")
        .eq("session_id", session.id);
      records = recs ?? [];
    }
    return { students: students ?? [], session: session ?? null, records };
  });

export const saveAttendanceSheet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        classId: uuid,
        date: z.string().min(8).max(10),
        notes: z.string().max(500).optional().nullable(),
        entries: z
          .array(z.object({ student_id: uuid, status: z.enum(["present", "absent", "late", "excused"]) }))
          .max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId, } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    let { data: session } = await sb
      .from("attendance_sessions")
      .select("id")
      .eq("school_id", schoolId)
      .eq("class_id", data.classId)
      .eq("session_date", data.date)
      .maybeSingle();
    if (!session) {
      const { data: ins, error } = await sb
        .from("attendance_sessions")
        .insert({
          school_id: schoolId,
          class_id: data.classId,
          teacher_id: (context as any).userId,
          session_date: data.date,
          notes: data.notes ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      session = ins;
    } else {
      await sb.from("attendance_sessions").update({ notes: data.notes ?? null }).eq("id", session.id);
      await sb.from("attendance_records").delete().eq("session_id", session.id);
    }
    if (data.entries.length) {
      const { error } = await sb
        .from("attendance_records")
        .insert(data.entries.map((e) => ({ session_id: session.id, student_id: e.student_id, status: e.status })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listAttendanceHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data: sessions } = await sb
      .from("attendance_sessions")
      .select("id, session_date, class_id, notes, classes(name)")
      .eq("school_id", schoolId)
      .order("session_date", { ascending: false })
      .limit(60);
    const ids = (sessions ?? []).map((s: any) => s.id);
    let records: any[] = [];
    if (ids.length) {
      const { data } = await sb.from("attendance_records").select("session_id, status").in("session_id", ids);
      records = data ?? [];
    }
    return (sessions ?? []).map((s: any) => {
      const rs = records.filter((r) => r.session_id === s.id);
      return {
        ...s,
        total: rs.length,
        present: rs.filter((r) => r.status === "present").length,
        absent: rs.filter((r) => r.status === "absent").length,
        late: rs.filter((r) => r.status === "late").length,
        excused: rs.filter((r) => r.status === "excused").length,
      };
    });
  });

/* ------------------------------------------------------------------ */
/* exams                                                               */
/* ------------------------------------------------------------------ */

export const listExams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data } = await sb
      .from("exams")
      .select("id, title, exam_date, max_score, term, status, class_id, subject_id, classes(name), subjects(name)")
      .eq("school_id", schoolId)
      .order("exam_date", { ascending: false });
    return data ?? [];
  });

export const saveExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        title: z.string().trim().min(1).max(120),
        class_id: uuid,
        subject_id: uuid.optional().nullable(),
        exam_date: z.string().max(20).optional().nullable(),
        max_score: z.number().min(1).max(1000),
        term: z.string().max(40).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId, teacher_id: (context as any).userId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    if (id) {
      const { error } = await sb.from("exams").update(rest).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("exams").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("exams").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const publishExam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, status: z.enum(["draft", "published"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("exams").update({ status: data.status }).eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getExamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data: exam } = await sb
      .from("exams")
      .select("id, title, class_id, max_score, status")
      .eq("id", data.id)
      .eq("school_id", schoolId)
      .maybeSingle();
    if (!exam) throw new Error("Examen introuvable.");
    const [{ data: students }, { data: results }] = await Promise.all([
      sb.from("students").select("id, first_name, last_name, matricule").eq("school_id", schoolId).eq("class_id", exam.class_id).order("last_name"),
      sb.from("exam_results").select("student_id, score, grade, comment").eq("exam_id", exam.id),
    ]);
    return { exam, students: students ?? [], results: results ?? [] };
  });

export const saveExamResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        examId: uuid,
        entries: z
          .array(z.object({ student_id: uuid, score: z.number().nullable(), comment: z.string().max(300).optional().nullable() }))
          .max(500),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data: exam } = await sb.from("exams").select("id, max_score").eq("id", data.examId).eq("school_id", schoolId).maybeSingle();
    if (!exam) throw new Error("Examen introuvable.");
    await sb.from("exam_results").delete().eq("exam_id", exam.id);
    const scored = data.entries.filter((e) => e.score !== null);
    const sorted = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rows = data.entries.map((e) => {
      const pct = e.score !== null ? (Number(e.score) / Number(exam.max_score)) * 100 : null;
      const grade =
        pct === null ? null : pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : pct >= 50 ? "E" : "F";
      return {
        exam_id: exam.id,
        student_id: e.student_id,
        score: e.score,
        grade,
        comment: e.comment ?? null,
        position: e.score === null ? null : sorted.findIndex((s) => s.student_id === e.student_id) + 1,
      };
    });
    if (rows.length) {
      const { error } = await sb.from("exam_results").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getClassReportCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ classId: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [{ data: school }, { data: klass }, { data: students }, { data: exams }] = await Promise.all([
      sb.from("schools").select("name, city, province, academic_year, current_term, logo_url").eq("id", schoolId).maybeSingle(),
      sb.from("classes").select("name, section, level").eq("id", data.classId).maybeSingle(),
      sb.from("students").select("id, first_name, last_name, matricule").eq("school_id", schoolId).eq("class_id", data.classId).order("last_name"),
      sb.from("exams").select("id, title, max_score, subject_id, subjects(name)").eq("school_id", schoolId).eq("class_id", data.classId).eq("status", "published"),
    ]);
    const examIds = (exams ?? []).map((e: any) => e.id);
    let results: any[] = [];
    if (examIds.length) {
      const { data: rs } = await sb.from("exam_results").select("exam_id, student_id, score, grade").in("exam_id", examIds);
      results = rs ?? [];
    }
    return { school: school ?? null, klass: klass ?? null, students: students ?? [], exams: exams ?? [], results };
  });

/* ------------------------------------------------------------------ */
/* fees                                                                */
/* ------------------------------------------------------------------ */

export const listFees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [{ data: structures }, { data: payments }, { data: students }] = await Promise.all([
      sb.from("fee_structures").select("*, classes(name)").eq("school_id", schoolId).order("created_at", { ascending: false }),
      sb
        .from("fee_payments")
        .select("*, students(first_name, last_name, matricule, class_id), fee_structures(name, amount)")
        .eq("school_id", schoolId)
        .order("paid_at", { ascending: false }),
      sb.from("students").select("id, first_name, last_name, matricule, class_id").eq("school_id", schoolId).order("last_name"),
    ]);
    return { structures: structures ?? [], payments: payments ?? [], students: students ?? [] };
  });

export const saveFeeStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        name: z.string().trim().min(1).max(120),
        description: z.string().max(500).optional().nullable(),
        class_id: uuid.optional().nullable(),
        amount: z.number().min(0),
        currency: z.string().max(8).default("CDF"),
        term: z.string().max(40).optional().nullable(),
        academic_year: z.string().max(20).optional().nullable(),
        due_date: z.string().max(20).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    if (id) {
      const { error } = await sb.from("fee_structures").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("fee_structures").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteFeeStructure = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("fee_structures").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const recordPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        student_id: uuid,
        fee_structure_id: uuid.optional().nullable(),
        amount: z.number().min(0),
        currency: z.string().max(8).default("CDF"),
        method: z.string().max(40).optional().nullable(),
        reference: z.string().max(80).optional().nullable(),
        status: z.enum(["paid", "pending"]).default("paid"),
        note: z.string().max(300).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const receipt = `REC-${Date.now().toString().slice(-8)}`;
    const row: Record<string, unknown> = { ...data, school_id: schoolId, receipt_no: receipt };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    const { data: ins, error } = await sb.from("fee_payments").insert(row).select("id, receipt_no").single();
    if (error) throw new Error(error.message);
    return ins;
  });

export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("fee_payments").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* timetable                                                           */
/* ------------------------------------------------------------------ */

export const listTimetable = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data } = await sb
      .from("timetable_slots")
      .select("id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room, classes(name), subjects(name), teachers(first_name, last_name)")
      .eq("school_id", schoolId)
      .order("day_of_week")
      .order("start_time");
    return data ?? [];
  });

export const saveTimetableSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        class_id: uuid,
        subject_id: uuid.optional().nullable(),
        teacher_id: uuid.optional().nullable(),
        day_of_week: z.number().min(1).max(7),
        start_time: z.string().min(4).max(8),
        end_time: z.string().min(4).max(8),
        room: z.string().max(40).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    if (id) {
      const { error } = await sb.from("timetable_slots").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("timetable_slots").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteTimetableSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("timetable_slots").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* announcements                                                       */
/* ------------------------------------------------------------------ */

export const listAdminAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data } = await sb
      .from("announcements")
      .select("id, title, body, audience, image_url, attachment_url, publish_at, status, created_at")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });

export const saveAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: uuid.optional(),
        title: z.string().trim().min(1).max(160),
        body: z.string().max(5000).optional().nullable(),
        audience: z.string().max(40).optional().nullable(),
        image_url: z.string().max(1000).optional().nullable(),
        attachment_url: z.string().max(1000).optional().nullable(),
        publish_at: z.string().max(40).optional().nullable(),
        status: z.enum(["draft", "published", "scheduled"]).default("published"),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { id, ...rest } = data;
    const row: Record<string, unknown> = { ...rest, school_id: schoolId, author_id: (context as any).userId };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    if (id) {
      const { error } = await sb.from("announcements").update(row).eq("id", id).eq("school_id", schoolId);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: ins, error } = await sb.from("announcements").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return { id: ins.id };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => idInput.parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb.from("announcements").delete().eq("id", data.id).eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* school settings                                                     */
/* ------------------------------------------------------------------ */

export const getSchoolSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { data } = await sb.from("schools").select("*").eq("id", schoolId).maybeSingle();
    return data ?? null;
  });

export const updateSchoolSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(160),
        motto: z.string().max(200).optional().nullable(),
        address: z.string().max(300).optional().nullable(),
        province: z.string().max(80),
        territory: z.string().max(80).optional().nullable(),
        city: z.string().max(80),
        phone: z.string().max(40).optional().nullable(),
        email: z.string().max(255).optional().nullable(),
        website: z.string().max(255).optional().nullable(),
        facebook: z.string().max(255).optional().nullable(),
        whatsapp: z.string().max(60).optional().nullable(),
        principal_name: z.string().max(120).optional().nullable(),
        logo_url: z.string().max(1000).optional().nullable(),
        cover_url: z.string().max(1000).optional().nullable(),
        stamp_url: z.string().max(1000).optional().nullable(),
        signature_url: z.string().max(1000).optional().nullable(),
        primary_color: z.string().max(20).optional().nullable(),
        secondary_color: z.string().max(20).optional().nullable(),
        accent_color: z.string().max(20).optional().nullable(),
        academic_year: z.string().max(20).optional().nullable(),
        current_term: z.string().max(40).optional().nullable(),
        locale: z.string().max(10).optional(),
        currency: z.string().max(10).optional(),
        timezone: z.string().max(60).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const row: Record<string, unknown> = { ...data };
    Object.keys(row).forEach((k) => row[k] === "" && (row[k] = null));
    const { error } = await sb.from("schools").update(row).eq("id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------ */
/* notifications center                                               */
/* ------------------------------------------------------------------ */

export const listAdminNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const [notifs, anns] = await Promise.all([
      sb
        .from("notifications")
        .select("id, type, title, message, severity, read, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(200),
      sb
        .from("announcements")
        .select("id, title, body, audience, status, publish_at, created_at")
        .eq("school_id", schoolId)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    return {
      notifications: notifs.data ?? [],
      announcements: anns.data ?? [],
      unread: (notifs.data ?? []).filter((n: any) => !n.read).length,
    };
  });

export const setNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: uuid, read: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb
      .from("notifications")
      .update({ read: data.read })
      .eq("id", data.id)
      .eq("school_id", schoolId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markAllNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { schoolId } = await requireSchoolAdmin(context as any);
    const sb = (context as any).supabase;
    const { error } = await sb
      .from("notifications")
      .update({ read: true })
      .eq("school_id", schoolId)
      .eq("read", false);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
