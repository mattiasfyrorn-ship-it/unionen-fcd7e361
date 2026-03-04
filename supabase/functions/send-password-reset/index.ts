import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate recovery link
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    if (linkError) {
      console.error("Generate link error:", linkError);
      // Don't reveal if user exists or not
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract token_hash from the generated link
    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) {
      console.error("No action link generated");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = new URL(actionLink);
    const tokenHash = url.searchParams.get("token_hash") || url.hash?.match(/token_hash=([^&]+)/)?.[1];

    const resetUrl = `https://hamnen.fyrorn.se/reset-password?token_hash=${tokenHash}&type=recovery`;

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Hamnen <noreply@notify.fyrorn.se>",
        to: [email],
        subject: "Återställ ditt lösenord – Hamnen",
        html: `
          <div style="font-family: 'Georgia', serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 300; color: #2d2d2d; margin: 0;">Hamnen</h1>
            </div>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Hej!
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
              Vi fick en begäran om att återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="display: inline-block; background-color: #6b7c5e; color: #ffffff; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 16px; font-weight: 500;">
                Återställ lösenord
              </a>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.5;">
              Om du inte begärde detta kan du ignorera det här mejlet. Länken är giltig i 1 timme.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">
              Hamnen – Där relationell trygghet byggs
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
