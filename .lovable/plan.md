

## Plan: Ta bort Partner-länken från desktop-navigeringen

### Ändring

**`src/components/AppLayout.tsx`** — Ta bort objektet `{ to: "/pairing", label: "Partner", icon: Link2 }` från `DESKTOP_NAV`-arrayen. Partnerkoppling nås redan via kontosidan. Ta även bort `Link2`-importen om den inte längre används.

