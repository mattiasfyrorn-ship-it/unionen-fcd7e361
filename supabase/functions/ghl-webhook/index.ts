import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hamnen-secret, x-hamnen-event",
};

function sanitize(str: string | undefined | null, maxLen = 200): string {
  if (!str) return "";
  return str.replace(/[<>&"']/g, "").slice(0, maxLen).trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Validate secret
    const secret = req.headers.get("x-hamnen-secret");
    const expectedSecret = Deno.env.get("GHL_WEBHOOK_SECRET");
    if (!secret || secret !== expectedSecret) {
      console.error("Invalid or missing X-HAMNEN-SECRET");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Parse body
    const body = await req.json();
    const headerEvent = req.headers.get("x-hamnen-event") || "";
    const bodyEvent = body.event || "";

    // 3. Validate event header matches body
    if (headerEvent && bodyEvent && headerEvent !== bodyEvent) {
      console.error("Event mismatch", { headerEvent, bodyEvent });
      return new Response(JSON.stringify({ error: "Event mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const eventType = bodyEvent || headerEvent || "unknown";

    // 4. Extract and validate fields
    const email = sanitize(body.email, 255).toLowerCase();
    const firstName = sanitize(body.first_name || body.firstName, 100);
    const lastName = sanitize(body.last_name || body.lastName, 100);
    const phone = sanitize(body.phone, 30);
    const ghlContactId = sanitize(body.contact_id || body.contactId, 100);
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];

    if (!email || !isValidEmail(email)) {
      console.error("Invalid or missing email", { email });
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Build webhook_id for idempotency
    const webhookId =
      body.webhook_id || body.webhookId || `${eventType}:${ghlContactId || email}:${body.timestamp || Date.now()}`;

    // 6. Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 7. Idempotency check
    const { data: existing } = await supabaseAdmin
      .from("webhook_events")
      .select("id")
      .eq("webhook_id", webhookId)
      .maybeSingle();

    if (existing) {
      console.log("Duplicate webhook, skipping", { webhookId });
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 8. Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email
    );

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      console.log("User already exists", { email, userId });

      // Update display name if needed
      if (displayName) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { display_name: displayName },
        });
        await supabaseAdmin
          .from("profiles")
          .update({ display_name: displayName })
          .eq("user_id", userId);
      }

      // Re-send welcome email if user has never signed in
      if (!existingUser.last_sign_in_at) {
        console.log("User never signed in, re-sending welcome email", { email });
        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "recovery",
            email,
            options: {
              redirectTo: "https://hamnen.fyrorn.se/reset-password",
            },
          });

        if (linkError || !linkData) {
          console.error("Failed to generate recovery link for existing user", linkError);
        } else {
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            // Extract token and build direct link (bypasses Supabase redirect allowlist)
            const verifyUrl = new URL(linkData.properties?.action_link || "");
            const tokenHash = verifyUrl.searchParams.get("token");
            const actionLink = `https://hamnen.fyrorn.se/reset-password?token_hash=${tokenHash}&type=recovery`;
            const emailHtml = `
              <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
                <h1 style="font-size: 28px; font-weight: 300; color: #1a1a1a; margin-bottom: 24px;">
                  Välkommen till Hamnen, ${sanitize(firstName || displayName, 50)}!
                </h1>
                <p style="color: #555; line-height: 1.6; font-size: 16px;">
                  Ditt konto har skapats. Klicka på knappen nedan för att välja ditt lösenord och komma igång.
                </p>
                <div style="margin: 32px 0; text-align: center;">
                  <a href="${actionLink}" 
                     style="display: inline-block; background: #7c6f5b; color: white; padding: 14px 32px; 
                            border-radius: 8px; text-decoration: none; font-size: 16px;">
                    Välj ditt lösenord
                  </a>
                </div>
                <p style="color: #888; font-size: 13px; margin-top: 32px;">
                  Om du inte förväntar dig detta mail kan du ignorera det.
                </p>
              </div>
            `;

            try {
              const resendRes = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${resendKey}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  from: "Hamnen <noreply@mail1.fyrorn.se>",
                  to: [email],
                  subject: "Välkommen till Hamnen – välj ditt lösenord",
                  html: emailHtml,
                }),
              });
              const resendResult = await resendRes.json();
              console.log("Re-sent welcome email", { resendResult });
            } catch (emailErr) {
              console.error("Resend email error (re-send)", emailErr);
            }
          }
        }
      }
    } else {
      // 9. Create new user
      const tempPassword = crypto.randomUUID() + "!Aa1";
      const { data: newUser, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { display_name: displayName },
        });

      if (createError || !newUser?.user) {
        console.error("Failed to create user", createError);
        return new Response(
          JSON.stringify({ error: "User creation failed", detail: createError?.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = newUser.user.id;
      console.log("User created", { email, userId });

      // 10. Generate recovery link for password setup
      const { data: linkData, error: linkError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "recovery",
          email,
          options: {
            redirectTo: "https://hamnen.fyrorn.se/reset-password",
          },
        });

      if (linkError || !linkData) {
        console.error("Failed to generate recovery link", linkError);
      } else {
        // 11. Send welcome email via Resend
        const resendKey = Deno.env.get("RESEND_API_KEY");
        if (resendKey) {
          // Extract token and build direct link (bypasses Supabase redirect allowlist)
          const verifyUrl = new URL(linkData.properties?.action_link || "");
          const tokenHash = verifyUrl.searchParams.get("token");
          const actionLink = `https://hamnen.fyrorn.se/reset-password?token_hash=${tokenHash}&type=recovery`;
          const emailHtml = `
            <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="font-size: 28px; font-weight: 300; color: #1a1a1a; margin-bottom: 24px;">
                Välkommen till Hamnen, ${sanitize(firstName || displayName, 50)}!
              </h1>
              <p style="color: #555; line-height: 1.6; font-size: 16px;">
                Ditt konto har skapats. Klicka på knappen nedan för att välja ditt lösenord och komma igång.
              </p>
              <div style="margin: 32px 0; text-align: center;">
                <a href="${actionLink}" 
                   style="display: inline-block; background: #7c6f5b; color: white; padding: 14px 32px; 
                          border-radius: 8px; text-decoration: none; font-size: 16px;">
                  Välj ditt lösenord
                </a>
              </div>
              <p style="color: #888; font-size: 13px; margin-top: 32px;">
                Om du inte förväntar dig detta mail kan du ignorera det.
              </p>
            </div>
          `;

          try {
            const resendRes = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${resendKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "Hamnen <noreply@mail1.fyrorn.se>",
                to: [email],
                subject: "Välkommen till Hamnen – välj ditt lösenord",
                html: emailHtml,
              }),
            });
            const resendResult = await resendRes.json();
            console.log("Email sent", { resendResult });
          } catch (emailErr) {
            console.error("Resend email error", emailErr);
          }
        } else {
          console.warn("RESEND_API_KEY not configured, skipping welcome email");
        }
      }
    }

    // 12. Upsert ghl_links
    if (ghlContactId) {
      await supabaseAdmin.from("ghl_links").upsert(
        { user_id: userId, ghl_contact_id: ghlContactId },
        { onConflict: "ghl_contact_id" }
      );
    }

    // 13. Record webhook event
    await supabaseAdmin.from("webhook_events").insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload: { email, ghl_contact_id: ghlContactId, first_name: firstName },
    });

    console.log("Webhook processed", { eventType, email, ghlContactId });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook handler error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
