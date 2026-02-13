import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the calling user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, inviterName } = await req.json();
    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get or create couple for the inviter
    const { data: profile } = await adminClient
      .from("profiles")
      .select("couple_id")
      .eq("user_id", user.id)
      .single();

    let coupleId = profile?.couple_id;
    if (!coupleId) {
      const { data: couple, error: coupleErr } = await adminClient
        .from("couples")
        .insert({})
        .select()
        .single();
      if (coupleErr || !couple) {
        return new Response(JSON.stringify({ error: "Could not create couple" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      coupleId = couple.id;
      await adminClient
        .from("profiles")
        .update({ couple_id: coupleId })
        .eq("user_id", user.id);
    }

    // Generate token and create invitation
    const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const { error: invErr } = await adminClient.from("partner_invitations").insert({
      inviter_id: user.id,
      invitee_email: email,
      couple_id: coupleId,
      token,
      status: "pending",
    });

    if (invErr) {
      console.error("Invitation insert error:", invErr);
      return new Response(JSON.stringify({ error: invErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteUrl = `https://unionen.lovable.app/auth?invite=${token}`;

    // Send invitation email via Supabase Auth admin
    try {
      const { error: emailErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
        data: { invited_by: inviterName || "Din partner", invite_token: token },
      });
      if (emailErr) {
        console.log("Email invite failed, falling back to link-only:", emailErr.message);
      }
    } catch (e) {
      console.log("Email sending not available:", e);
    }

    return new Response(
      JSON.stringify({ success: true, inviteUrl, token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-invitation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
