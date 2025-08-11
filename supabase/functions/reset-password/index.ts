// supabase/functions/reset-user-password/index.ts
// Deno / Edge Functions runtime

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Customize your own admin check
const isAdminUser = (email?: string, role?: string) => {
  if (!email) return false;
  const adminDomains = ["@othainsoft.com", "@jerseytechpartners.com", "@markenzoworldwide.com", "@example.com"];
  const emailDomain = email.slice(email.lastIndexOf("@")).toLowerCase();
  // Optionally require a role flag too
  return adminDomains.includes(emailDomain) || role === "admin";
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }
      });
    }

    // 1) Authenticate the caller (must be signed-in admin)
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseForAuth = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await supabaseForAuth.auth.getUser();

    if (!caller || !isAdminUser(caller.email ?? undefined, (caller.user_metadata as any)?.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { 
        status: 403,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }
      });
    }

    // 2) Parse input
    const { user_id, email, new_password } = await req.json();
    if (!new_password || (!user_id && !email)) {
      return new Response(JSON.stringify({ error: "Missing user_id/email or new_password" }), { 
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }
      });
    }

    // 3) Admin client (service role)
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Resolve target user id if only email provided
    let targetId = user_id as string | undefined;

    if (!targetId && email) {
      // Try to find by email via listUsers (simple scan; fine for small/med tenants)
      let page = 1;
      const perPage = 1000;
      while (!targetId) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        if (!data?.users?.length) break;
        const found = data.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());
        if (found) targetId = found.id;
        page++;
      }
      if (!targetId) {
        return new Response(JSON.stringify({ error: "User not found for given email" }), { 
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
          }
        });
      }
    }

    // 4) Update password
    const { data, error } = await admin.auth.admin.updateUserById(targetId!, { password: new_password });
    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        }
      });
    }

    return new Response(JSON.stringify({ ok: true, user_id: targetId, updated_at: data?.user?.updated_at }), { 
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message ?? "Unexpected error" }), { 
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      }
    });
  }
});
