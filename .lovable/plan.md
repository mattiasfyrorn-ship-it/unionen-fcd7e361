

## Vercel-proxy för GHL-webhook

### Ändring

Uppdatera `vercel.json` — lägg till en rewrite-regel för `/api/ghl-webhook` **före** den befintliga catch-all-regeln.

```json
{
  "rewrites": [
    {
      "source": "/api/ghl-webhook",
      "destination": "https://ucgarzkamhrcihmcfsul.supabase.co/functions/v1/ghl-webhook"
    },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Påverkan på invite-flödet

Ingen. Partner-invite använder `/auth?invite=TOKEN` som inte matchar `/api/ghl-webhook` och fortsätter fångas av catch-all → `index.html` → React Router.

### Filer som ändras

| Fil | Ändring |
|-----|---------|
| `vercel.json` | Lägg till `/api/ghl-webhook`-rewrite före catch-all |

