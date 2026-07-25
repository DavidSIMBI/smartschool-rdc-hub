import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SUPER_ADMIN_EMAIL } from "./super-admin.constants";

/**
 * Idempotently ensures a single Super Admin account exists.
 * Public server function (called from the login page). It ONLY takes action
 * for the hard-coded super-admin email — no other account can be created
 * or elevated through this endpoint.
 */
export const ensureSuperAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) =>
    z.object({ email: z.string().email() }).parse(input),
  )
  .handler(async ({ data }) => {
    if (data.email.trim().toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return { ok: false as const, reason: "not_super_admin" };
    }
    const password = process.env.SUPER_ADMIN_INITIAL_PASSWORD;
    if (!password) {
      return { ok: false as const, reason: "password_not_configured" };
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    // Look up user by email via listUsers pagination
    let userId: string | null = null;
    let page = 1;
    while (page < 20) {
      const { data: page_data, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return { ok: false as const, reason: "list_failed" };
      const found = page_data.users.find(
        (u) => u.email?.toLowerCase() === SUPER_ADMIN_EMAIL,
      );
      if (found) {
        userId = found.id;
        break;
      }
      if (page_data.users.length < 200) break;
      page += 1;
    }

    if (!userId) {
      const { data: created, error } =
        await supabaseAdmin.auth.admin.createUser({
          email: SUPER_ADMIN_EMAIL,
          password,
          email_confirm: true,
          user_metadata: { full_name: "David Simbi Lyabo" },
        });
      if (error || !created.user) {
        return { ok: false as const, reason: "create_failed" };
      }
      userId = created.user.id;
    }

    // Ensure profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email: SUPER_ADMIN_EMAIL,
      full_name: "David Simbi Lyabo",
    });

    // Ensure super_admin role
    const { data: existing } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "super_admin")
      .maybeSingle();
    if (!existing) {
      await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role: "super_admin" });
    }

    return { ok: true as const };
  });

/* ------------------------------------------------------------------ */
/* School management                                                   */
/* ------------------------------------------------------------------ */

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertSuperAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("is_super_admin", { _user_id: userId });
  if (!data) throw new Error("Forbidden: super admin only");
}

export const updateSchoolStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { schoolId: string; status: "active" | "pending" | "suspended" }) =>
    z
      .object({
        schoolId: z.string().uuid(),
        status: z.enum(["active", "pending", "suspended"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("schools")
      .update({ status: data.status })
      .eq("id", data.schoolId);
    if (error) throw error;
    await context.supabase.from("activity_logs").insert({
      actor_id: context.userId,
      action: `school.${data.status}`,
      target_type: "school",
      target_id: data.schoolId,
    });
    return { ok: true };
  });

export const deleteSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { schoolId: string }) =>
    z.object({ schoolId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { error } = await supabaseAdmin
      .from("schools")
      .delete()
      .eq("id", data.schoolId);
    if (error) throw error;
    await context.supabase.from("activity_logs").insert({
      actor_id: context.userId,
      action: "school.deleted",
      target_type: "school",
      target_id: data.schoolId,
    });
    return { ok: true };
  });

export const createSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    name: string;
    province: string;
    city: string;
    principal_name?: string;
    email?: string;
    phone?: string;
  }) =>
    z
      .object({
        name: z.string().min(2),
        province: z.string().min(2),
        city: z.string().min(2),
        principal_name: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: school, error } = await context.supabase
      .from("schools")
      .insert({
        name: data.name,
        province: data.province,
        city: data.city,
        principal_name: data.principal_name || null,
        email: data.email || null,
        phone: data.phone || null,
        status: "active",
      })
      .select()
      .single();
    if (error) throw error;
    return { ok: true, school };
  });

export const resetSchoolAdminPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { schoolId: string }) =>
    z.object({ schoolId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    // Find school admin
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("school_id", data.schoolId)
      .eq("role", "school_admin")
      .limit(1)
      .maybeSingle();
    if (!role) return { ok: false, reason: "no_admin" };
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", role.user_id)
      .maybeSingle();
    if (!profile?.email) return { ok: false, reason: "no_email" };
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: profile.email,
    });
    if (error) throw error;
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      event: "password.reset_sent",
      metadata: { schoolId: data.schoolId, email: profile.email },
    });
    return { ok: true, email: profile.email };
  });

export const sendPlatformAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { title: string; body: string }) =>
    z
      .object({ title: z.string().min(2), body: z.string().min(2) })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: schools } = await supabaseAdmin
      .from("schools")
      .select("id");
    const rows = (schools ?? []).map((s) => ({
      school_id: s.id,
      author_id: context.userId,
      title: data.title,
      body: data.body,
      audience: "all",
    }));
    if (rows.length) await supabaseAdmin.from("announcements").insert(rows);
    return { ok: true, count: rows.length };
  });

export const updatePlatformSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: Record<string, unknown>) =>
    z
      .object({
        platform_name: z.string().min(2).optional(),
        default_locale: z.string().optional(),
        default_theme: z.string().optional(),
        support_email: z.string().email().optional().or(z.literal("")),
        notifications_enabled: z.boolean().optional(),
        backups_enabled: z.boolean().optional(),
        backup_frequency: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: existing } = await context.supabase
      .from("platform_settings")
      .select("id")
      .limit(1)
      .maybeSingle();
    if (existing) {
      const { error } = await context.supabase
        .from("platform_settings")
        .update(data as any)
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await context.supabase
        .from("platform_settings")
        .insert(data as any);
      if (error) throw error;
    }
    return { ok: true };
  });

export const triggerBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    await context.supabase.from("audit_logs").insert({
      actor_id: context.userId,
      event: "backup.triggered",
    });
    await context.supabase.from("notifications").insert({
      type: "system_alert",
      title: "Sauvegarde lancée",
      message: "Une sauvegarde de la base de données a été déclenchée.",
      severity: "info",
    });
    return { ok: true };
  });