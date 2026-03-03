

## Problem

Loggarna visar att användaren `mattias@evolution.guide` redan skapades vid första webhook-anropet, men välkomstmailet misslyckades då (403, fel domän). Nu när from-adressen är fixad skickar webhooken **inget mail alls** eftersom koden går in i `if (existingUser)`-grenen som bara uppdaterar display_name — den genererar ingen recovery-länk och skickar inget mail.

## Lösning

Utöka `existingUser`-grenen i `ghl-webhook/index.ts` så att den **även skickar ett recovery-mail** om användaren aldrig har loggat in (`last_sign_in_at === null`). Det fångar exakt fallet "konto skapat men välkomstmail misslyckades".

### Ändring i `supabase/functions/ghl-webhook/index.ts`

I blocket `if (existingUser)` (rad 99–112), efter display_name-uppdateringen, lägg till:

```typescript
// Re-send welcome email if user has never signed in
if (!existingUser.last_sign_in_at) {
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "https://hamnen.fyrorn.se/reset-password" },
    });

  if (!linkError && linkData) {
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const actionLink = linkData.properties?.action_link;
      const emailHtml = `...same welcome template as line 155-175...`;
      await fetch("https://api.resend.com/emails", {
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
    }
  }
}
```

### Filer som ändras

| Fil | Ändring |
|-----|---------|
| `supabase/functions/ghl-webhook/index.ts` | Lägg till re-send av välkomstmail i `existingUser`-grenen |

En fil, en logisk ändring. Samma mail-template och from-adress som redan finns i filen.

