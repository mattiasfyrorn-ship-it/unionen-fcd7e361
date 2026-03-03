import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: "mattias@evolution.guide",
    options: { redirectTo: "https://hamnen.fyrorn.se/reset-password" },
  });

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Same logic as ghl-webhook: extract token, build direct link
  const verifyUrl = new URL(data.properties?.action_link || "");
  const tokenHash = verifyUrl.searchParams.get("token");
  const actionLink = `https://hamnen.fyrorn.se/reset-password?token_hash=${tokenHash}&type=recovery`;

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Hamnen <noreply@mail1.fyrorn.se>",
      to: ["mattias@evolution.guide"],
      subject: "Återställ ditt lösenord – Hamnen (test 3)",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2>Återställ ditt lösenord</h2>
        <p>Klicka nedan för att välja ett nytt lösenord:</p>
        <a href="${actionLink}" style="display:inline-block;padding:12px 24px;background:#b8860b;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Välj nytt lösenord</a>
        <p style="margin-top:16px;font-size:12px;color:#999;">Länk: ${actionLink}</p>
      </div>`,
    }),
  });

  return new Response(JSON.stringify({ actionLink, emailResult: await emailRes.json() }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
