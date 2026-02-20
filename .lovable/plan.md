
## Problemet: PostgREST-cache ej uppdaterad

Unika indexet `evaluations_user_id_check_date_area_key` skapades korrekt i databasen, men PostgREST (API-lagret som Supabase använder) håller en intern cache av databasschemat. Den cachen uppdateras inte automatiskt vid DDL-ändringar (som `CREATE UNIQUE INDEX`), och därför vet API:et fortfarande inte att indexet finns — och avvisar `ON CONFLICT`-specifikationen.

Felet "no unique or exclusion constraint matching the ON CONFLICT specification" är precis detta: API:et hittar inte det nya indexet i sin cache.

### Lösning

Kör `NOTIFY pgrst, 'reload schema';` via en ny databasmigration. Det tvingar PostgREST att läsa om databasschemat och känna igen det nya unika indexet — inga kodfiler behöver ändras.

### Tekniska detaljer

**En ny migration med en enda SQL-rad:**

```sql
NOTIFY pgrst, 'reload schema';
```

Det är allt. Indexet finns redan, koden är redan korrekt — det är bara cache-synkroniseringen som saknas.

### Påverkan

- Inga databasstrukturer ändras
- Ingen kod ändras
- Efter migrationen fungerar sparning i Närd direkt — rätt dag sparas, prickar visas, standardvärden återställs korrekt
