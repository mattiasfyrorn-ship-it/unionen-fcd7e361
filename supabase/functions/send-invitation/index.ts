import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

async function sendInviteEmail(to: string, inviterName: string, inviteUrl: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    console.error("RESEND_API_KEY not configured");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Unionen <noreply@mail1.fyrorn.se>",
      to: [to],
      subject: `${escapeHtml(inviterName)} vill koppla ihop med dig på Unionen 💕`,
      html: `
        <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: hsl(25, 30%, 25%); font-size: 28px; font-weight: 300;">Unionen</h1>
          </div>
          <p style="color: hsl(25, 20%, 35%); font-size: 16px; line-height: 1.6;">
            Hej! 👋
          </p>
          <p style="color: hsl(25, 20%, 35%); font-size: 16px; line-height: 1.6;">
            <strong>${escapeHtml(inviterName)}</strong> har bjudit in dig att koppla ihop på Unionen – en app för att stärka er relation.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${inviteUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, hsl(43, 60%, 55%), hsl(30, 50%, 48%)); color: white; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 500;">
              Acceptera inbjudan
            </a>
          </div>
          <p style="color: hsl(25, 15%, 55%); font-size: 13px; line-height: 1.5;">
            Eller kopiera länken: <br/>
            <a href="${inviteUrl}" style="color: hsl(30, 50%, 40%); word-break: break-all;">${inviteUrl}</a>
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("Resend error:", res.status, errBody);
    return false;
  }
  return true;
}

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

    // Validate email format and length
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== "string" || !emailRegex.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sanitize and validate inviterName to prevent HTML injection
    let sanitizedInviterName = "Din partner";
    if (inviterName && typeof inviterName === "string") {
      const stripped = inviterName.replace(/[<>"'&]/g, "").trim().slice(0, 100);
      if (stripped) sanitizedInviterName = stripped;
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // If a pending invitation already exists, return the existing link
    const { data: existing } = await adminClient
      .from("partner_invitations")
      .select("id, token")
      .eq("inviter_id", user.id)
      .eq("status", "pending")
      .limit(1);

    if (existing && existing.length > 0) {
      const existingToken = existing[0].token;
      const inviteUrl = `https://unionen.fyrorn.se/auth?invite=${existingToken}`;

      // Re-send the email even for existing invitations
      await sendInviteEmail(email, sanitizedInviterName, inviteUrl);

      return new Response(
        JSON.stringify({ success: true, inviteUrl, token: existingToken, existing: true, emailSent: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if inviter already has a couple_id — reuse it to avoid orphaned records
    const { data: inviterProfile } = await adminClient
      .from("profiles")
      .select("couple_id")
      .eq("user_id", user.id)
      .single();

    let coupleId: string;

    if (inviterProfile?.couple_id) {
      // Reuse existing couple so we don't create orphaned records
      coupleId = inviterProfile.couple_id;
    } else {
      // Only create a new couple when the inviter has none
      const { data: couple, error: coupleErr } = await adminClient
        .from("couples")
        .insert({})
        .select()
        .single();

      if (coupleErr || !couple) {
        console.error("Create couple error:", coupleErr);
        return new Response(JSON.stringify({ error: "Could not create invitation" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      coupleId = couple.id;
    }

    // Generate token and create invitation
    const token = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const { error: invErr } = await adminClient.from("partner_invitations").insert({
      inviter_id: user.id,
      invitee_email: email,
      couple_id: coupleId,
      token,
      status: "pending",
      inviter_name: sanitizedInviterName,
    });

    if (invErr) {
      console.error("Invitation insert error:", invErr);
      return new Response(JSON.stringify({ error: invErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const inviteUrl = `https://unionen.fyrorn.se/auth?invite=${token}`;

    // Send the invitation email
    const emailSent = await sendInviteEmail(email, sanitizedInviterName, inviteUrl);

    return new Response(
      JSON.stringify({ success: true, inviteUrl, token, emailSent }),
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
