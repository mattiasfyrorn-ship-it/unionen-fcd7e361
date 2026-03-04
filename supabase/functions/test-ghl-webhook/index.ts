const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const webhookUrl = Deno.env.get("GHL_COUPLE_PAIRED_WEBHOOK_URL");
  const ghlSecret = Deno.env.get("GHL_WEBHOOK_SECRET");

  if (!webhookUrl) {
    return new Response(JSON.stringify({ error: "No webhook URL" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const samplePayload = {
    event: "couple_paired",
    pair_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    paired_at: new Date().toISOString(),
    secret: ghlSecret || null,
    buyer: {
      user_id: "11111111-aaaa-bbbb-cccc-dddddddddddd",
      email: "buyer@example.com",
      first_name: "Anna",
      last_name: "Svensson",
      phone: "+46701234567",
      ghl_contact_id: "ghl_contact_abc123",
    },
    partner: {
      user_id: "22222222-aaaa-bbbb-cccc-dddddddddddd",
      email: "partner@example.com",
      first_name: "Erik",
      last_name: "Johansson",
      phone: "+46709876543",
      ghl_contact_id: null,
    },
  };

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ghlSecret) headers["X-HAMNEN-SECRET"] = ghlSecret;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(samplePayload),
  });

  const responseBody = await res.text();

  return new Response(JSON.stringify({
    sent: true,
    ghl_status: res.status,
    ghl_response: responseBody,
    payload_sent: samplePayload,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
