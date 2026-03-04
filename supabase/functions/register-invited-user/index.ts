import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, displayName, inviteToken } = await req.json();

    if (!email || !password || !displayName || !inviteToken) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate invite token
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("partner_invitations")
      .select("id, couple_id, inviter_id, invitee_email")
      .eq("token", inviteToken)
      .eq("status", "pending")
      .single();

    if (invErr || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create user with email pre-confirmed
    const { data: userData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        invite_token: inviteToken,
      },
    });

    if (createErr) {
      console.error("Create user error:", createErr);
      return new Response(
        JSON.stringify({ error: createErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // The handle_new_user trigger creates the profile.
    // The handle_invitation_on_signup trigger pairs if invitee_email matches.
    // But since the invite link may use a different email, we do manual pairing too:
    const userId = userData.user.id;

    // Update profile with couple_id
    await supabaseAdmin
      .from("profiles")
      .update({ couple_id: invitation.couple_id })
      .eq("user_id", userId);

    // Also set couple_id on inviter's profile
    await supabaseAdmin
      .from("profiles")
      .update({ couple_id: invitation.couple_id })
      .eq("user_id", invitation.inviter_id);

    // Mark invitation as accepted
    await supabaseAdmin
      .from("partner_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    // Generate a session by signing in
    const { data: signInData, error: signInErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    // Return user info - client will sign in with password
    return new Response(
      JSON.stringify({ success: true, userId }),
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
