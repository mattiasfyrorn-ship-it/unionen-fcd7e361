import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString().split("T")[0];

    // Fetch evaluations with need/want data
    const { data: evaluations } = await supabase
      .from("evaluations")
      .select("check_date, area, score, need_today, want_today")
      .eq("user_id", userId)
      .gte("check_date", since)
      .order("check_date", { ascending: true });

    // Fetch daily checks for climate
    const { data: dailyChecks } = await supabase
      .from("daily_checks")
      .select("check_date, climate")
      .eq("user_id", userId)
      .gte("check_date", since)
      .order("check_date", { ascending: true });

    // Filter entries that have need_today or want_today
    const entriesWithNeeds = (evaluations || []).filter(
      (e: any) => e.need_today || e.want_today
    );

    if (entriesWithNeeds.length < 5) {
      return new Response(
        JSON.stringify({
          insights: null,
          message:
            "Du behöver minst 5 dagars behov/vilja-data för att generera insikter. Fortsätt fylla i dina dagliga behov!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build data summary for AI
    const needsWants = entriesWithNeeds.map((e: any) => ({
      date: e.check_date,
      need: e.need_today,
      want: e.want_today,
    }));

    // Group scores by date
    const scoresByDate: Record<string, Record<string, number>> = {};
    (evaluations || []).forEach((e: any) => {
      if (!scoresByDate[e.check_date]) scoresByDate[e.check_date] = {};
      scoresByDate[e.check_date][e.area] = e.score;
    });

    const climateByDate: Record<string, number> = {};
    (dailyChecks || []).forEach((d: any) => {
      if (d.climate != null) climateByDate[d.check_date] = d.climate;
    });

    const prompt = `Du är en relationscoach. Analysera följande data från en persons dagliga självutvärdering de senaste 30 dagarna.

BEHOV OCH VILJA (vad personen skrivit att de behöver/vill varje dag):
${JSON.stringify(needsWants, null, 2)}

NÄRINGSPOÄNG PER DAG (1-10 per område: health=Kropp, career=Sinne, economy=Relationer, relationships=Mission):
${JSON.stringify(scoresByDate, null, 2)}

RELATIONSKLIMAT PER DAG (1-10):
${JSON.stringify(climateByDate, null, 2)}

Ge en kort analys på svenska med:
1. **Återkommande behov**: Vilka behov dyker upp ofta? Finns det mönster?
2. **Behov & näring**: Ser du kopplingar mellan specifika behov och höga/låga poäng i något livsområde?
3. **Behov & klimat**: Hur verkar behoven påverka eller samvariera med relationsklimatet?
4. **2-3 konkreta insikter**: Korta, personliga observationer som kan hjälpa personen förstå sig själv bättre.

Håll det kort, varmt och coachande. Max 300 ord. Använd inte markdown-rubriker, skriv i löpande text med korta stycken.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Du är en varm, insiktsfull relationscoach som hjälper människor förstå sina behov och mönster. Svara alltid på svenska.",
            },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "För många förfrågningar, försök igen om en stund." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI-krediter slut. Kontakta support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI gateway error");
    }

    const aiData = await aiResponse.json();
    const insights = aiData.choices?.[0]?.message?.content || "Kunde inte generera insikter.";

    return new Response(
      JSON.stringify({ insights, message: null }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("needs-insights error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Okänt fel" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
