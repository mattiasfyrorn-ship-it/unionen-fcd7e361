

## Fix: Parkoppling vid inbjudningslank

### Rotorsak

Tre buggar forhindrar parkoppling:

1. **Saknad parameter i RPC-anrop:** `accept_invitation(p_token, p_user_id)` kraver tva parametrar men koden skickar bara `p_token`. Anropet misslyckas tyst.

2. **AuthRoute redirectar for tidigt:** Nar en redan inloggad anvandare klickar pa inbjudningslanken (`/auth?invite=TOKEN`) redirectar `AuthRoute` direkt till `/` utan att kora `accept_invitation`.

3. **Signup-flode tappar token:** Efter registrering + e-postbekraftelse atergar anvandaren till `/auth?invite=TOKEN` men ar nu autentiserad, sa `AuthRoute` redirectar till `/` innan koppling sker.

### Losning

#### 1. Fixa AuthRoute i App.tsx

Istallet for att blint redirecta inloggade anvandare till `/`, kontrollera om det finns en `invite`-parameter i URL:en. Om sa, lat Auth-komponenten renderas sa att den kan kora `accept_invitation`.

```typescript
function AuthRoute() {
  const { user, loading } = useAuth();
  const [searchParams] = useSearchParams();
  const hasInvite = searchParams.has("invite");
  
  if (loading) return null;
  if (user && !hasInvite) return <Navigate to="/" replace />;
  return <Auth />;
}
```

#### 2. Fixa Auth.tsx — hantera redan inloggad anvandare med invite

Lagg till en `useEffect` som kor `accept_invitation` direkt om anvandaren redan ar inloggad och har en invite-token. Detta hanterar bade fallet dar anvandaren klickar lanken medan de ar inloggade och fallet dar de atergar fran e-postbekraftelse.

```typescript
useEffect(() => {
  if (user && inviteToken) {
    // Redan inloggad med invite — acceptera direkt
    acceptInvitation(inviteToken).then(() => navigate("/"));
  }
}, [user, inviteToken]);
```

#### 3. Fixa saknad p_user_id i alla accept_invitation-anrop

Lagg till `p_user_id: "00000000-0000-0000-0000-000000000000"` (dummy-varde, funktionen anvander `auth.uid()` internt men kraver parametern).

### Teknisk sammanfattning

| Fil | Andring |
|---|---|
| `src/App.tsx` | AuthRoute: lat invite-lank passera aven for inloggade anvandare |
| `src/pages/Auth.tsx` | Lagg till useEffect for auto-accept vid redan inloggad + invite. Fixa p_user_id i alla RPC-anrop. Navigera till `/` efter lyckad koppling. |

