import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendEmail(to: string, subject: string, html: string) {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Hamnen <noreply@mail1.fyrorn.se>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error("Resend error:", res.status, await res.text());
    return false;
  }
  return true;
}

function buildEmail(heading: string, body: string): string {
  return `
    <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: hsl(24, 14%, 20%); font-size: 28px; font-weight: 300;">Hamnen</h1>
      </div>
      <h2 style="color: hsl(24, 10%, 30%); font-size: 20px; font-weight: 400; text-align: center;">${heading}</h2>
      <p style="color: hsl(24, 10%, 35%); font-size: 16px; line-height: 1.6; text-align: center; margin-top: 16px;">
        ${body}
      </p>
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://hamnen.fyrorn.se/" style="display: inline-block; padding: 14px 32px; background: hsl(150, 24%, 24%); color: hsl(30, 26%, 92%); text-decoration: none; border-radius: 12px; font-size: 16px;">
          Öppna Hamnen
        </a>
      </div>
    </div>
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { inviteToken, inviteeName } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Look up invitation
    const { data: inv } = await admin
      .from("partner_invitations")
      .select("inviter_id, inviter_name, invitee_email")
      .eq("token", inviteToken)
      .limit(1)
      .single();

    if (!inv) {
      return new Response(JSON.stringify({ error: "Invitation not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get inviter's email
    const { data: inviterUser } = await admin.auth.admin.getUserById(inv.inviter_id);
    const inviterEmail = inviterUser?.user?.email;

    const safeName = (inviteeName || "Din partner").replace(/[<>"'&]/g, "").slice(0, 100);
    const safeInviterName = (inv.inviter_name || "Din partner").replace(/[<>"'&]/g, "").slice(0, 100);

    const results: Record<string, boolean> = {};

    // Email to invitee
    if (inv.invitee_email) {
      results.invitee = await sendEmail(
        inv.invitee_email,
        `Välkommen ${safeName}! Ni är nu ihopkopplade 💕`,
        buildEmail(
          `Välkommen ${safeName}! 💕`,
          `Du är nu ihopkopplad med <strong>${safeInviterName}</strong> på Hamnen. Börja utforska appen tillsammans!`
        )
      );
    }

    // Email to inviter
    if (inviterEmail) {
      results.inviter = await sendEmail(
        inviterEmail,
        `${safeName} har registrerat sig! Ni är ihopkopplade 💕`,
        buildEmail(
          `${safeName} är här! 🎉`,
          `<strong>${safeName}</strong> har registrerat sig och ni är nu ihopkopplade på Hamnen. Börja utforska appen tillsammans!`
        )
      );
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-partner-paired error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
