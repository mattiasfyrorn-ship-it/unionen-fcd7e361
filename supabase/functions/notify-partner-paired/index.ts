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
    const { inviteToken, inviteeName, coupleId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let resolvedCoupleId: string | null = coupleId || null;
    let inviterEmail: string | null = null;
    let inviteeEmail: string | null = null;
    let safeName = (inviteeName || "Din partner").replace(/[<>"'&]/g, "").slice(0, 100);
    let safeInviterName = "Din partner";

    // --- Resolve couple from invite token if provided ---
    if (inviteToken) {
      const { data: inv } = await admin
        .from("partner_invitations")
        .select("inviter_id, inviter_name, invitee_email, couple_id")
        .eq("token", inviteToken)
        .limit(1)
        .single();

      if (inv) {
        resolvedCoupleId = resolvedCoupleId || inv.couple_id;
        inviteeEmail = inv.invitee_email;
        safeInviterName = (inv.inviter_name || "Din partner").replace(/[<>"'&]/g, "").slice(0, 100);

        const { data: inviterUser } = await admin.auth.admin.getUserById(inv.inviter_id);
        inviterEmail = inviterUser?.user?.email || null;

        const results: Record<string, boolean> = {};

        // Email to invitee
        if (inviteeEmail) {
          results.invitee = await sendEmail(
            inviteeEmail,
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

        console.log("Email results:", results);
      }
    }

    // --- GHL Webhook: Send couple_paired event ---
    if (!resolvedCoupleId) {
      console.log("No couple_id resolved, skipping GHL webhook");
      return new Response(JSON.stringify({ success: true, ghl: "skipped_no_couple" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency check
    const { data: couple } = await admin
      .from("couples")
      .select("id, created_at, ghl_day1_started_at")
      .eq("id", resolvedCoupleId)
      .single();

    if (!couple) {
      console.log("Couple not found:", resolvedCoupleId);
      return new Response(JSON.stringify({ success: true, ghl: "couple_not_found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (couple.ghl_day1_started_at) {
      console.log("GHL webhook already sent for couple:", resolvedCoupleId);
      return new Response(JSON.stringify({ success: true, ghl: "already_sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch both profiles in this couple
    const { data: profiles } = await admin
      .from("profiles")
      .select("user_id, display_name, phone, couple_id")
      .eq("couple_id", resolvedCoupleId);

    if (!profiles || profiles.length < 2) {
      console.log("Not enough profiles for couple:", resolvedCoupleId, "found:", profiles?.length);
      return new Response(JSON.stringify({ success: true, ghl: "not_enough_profiles" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch emails for both users
    const userEmails: Record<string, string> = {};
    for (const p of profiles) {
      const { data: u } = await admin.auth.admin.getUserById(p.user_id);
      if (u?.user?.email) userEmails[p.user_id] = u.user.email;
    }

    // Fetch GHL links to determine buyer vs partner
    const { data: ghlLinks } = await admin
      .from("ghl_links")
      .select("user_id, ghl_contact_id")
      .in("user_id", profiles.map(p => p.user_id));

    const ghlMap: Record<string, string> = {};
    if (ghlLinks) {
      for (const link of ghlLinks) {
        ghlMap[link.user_id] = link.ghl_contact_id;
      }
    }

    // Buyer = the one with a ghl_links entry; partner = the other
    const buyerProfile = profiles.find(p => ghlMap[p.user_id]) || profiles[0];
    const partnerProfile = profiles.find(p => p.user_id !== buyerProfile.user_id) || profiles[1];

    function splitName(displayName: string): { first_name: string; last_name: string } {
      const parts = (displayName || "").trim().split(/\s+/);
      return {
        first_name: parts[0] || "",
        last_name: parts.slice(1).join(" ") || "",
      };
    }

    const buyerName = splitName(buyerProfile.display_name);
    const partnerName = splitName(partnerProfile.display_name);

    const webhookBody = {
      event: "couple_paired",
      pair_id: resolvedCoupleId,
      paired_at: new Date().toISOString(),
      buyer: {
        user_id: buyerProfile.user_id,
        email: userEmails[buyerProfile.user_id] || "",
        first_name: buyerName.first_name,
        last_name: buyerName.last_name,
        phone: (buyerProfile as any).phone || null,
        ghl_contact_id: ghlMap[buyerProfile.user_id] || null,
      },
      partner: {
        user_id: partnerProfile.user_id,
        email: userEmails[partnerProfile.user_id] || "",
        first_name: partnerName.first_name,
        last_name: partnerName.last_name,
        phone: (partnerProfile as any).phone || null,
        ghl_contact_id: ghlMap[partnerProfile.user_id] || null,
      },
    };

    const webhookUrl = Deno.env.get("GHL_COUPLE_PAIRED_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("GHL_COUPLE_PAIRED_WEBHOOK_URL not configured");
      return new Response(JSON.stringify({ success: true, ghl: "no_webhook_url" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ghlSecret = Deno.env.get("GHL_WEBHOOK_SECRET");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ghlSecret) headers["X-HAMNEN-SECRET"] = ghlSecret;

    console.log("Sending GHL webhook for couple:", resolvedCoupleId,
      "buyer:", userEmails[buyerProfile.user_id],
      "partner:", userEmails[partnerProfile.user_id]);

    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(webhookBody),
    });

    console.log("GHL webhook response:", webhookRes.status);

    if (webhookRes.ok) {
      // Mark as sent (idempotency)
      await admin
        .from("couples")
        .update({ ghl_day1_started_at: new Date().toISOString() } as any)
        .eq("id", resolvedCoupleId);
      console.log("GHL day1 marked for couple:", resolvedCoupleId);
    } else {
      const body = await webhookRes.text();
      console.error("GHL webhook failed:", webhookRes.status, body);
    }

    return new Response(JSON.stringify({
      success: true,
      ghl: webhookRes.ok ? "sent" : "failed",
      ghl_status: webhookRes.status,
    }), {
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
