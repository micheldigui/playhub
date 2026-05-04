# PlayHub Supabase schema exports

Esta pasta guarda exportacoes do esquema do Supabase.

- `PLAYHUB_DB_MASTER_baseline.sql`: copia do schema SQL documentado atualmente no repositorio.
- `supabase_schema_from_dashboard.sql`: schema copiado do Supabase Dashboard em Database > Schema Visualizer > Copy as SQL.
- `supabase_schema_live.sql`: destino sugerido para o dump real do Supabase remoto.

Para exportar o schema real sem dados de usuarios, use uma connection string do banco:

```powershell
npx.cmd supabase db dump --db-url "postgresql://postgres:<SENHA>@db.ftwdixnimxpiigjzxutt.supabase.co:5432/postgres" --schema public,storage,auth --file supabase\schema_exports\supabase_schema_live.sql
```

Alternativa via projeto linkado:

```powershell
npx.cmd supabase link --project-ref ftwdixnimxpiigjzxutt --password "<SENHA_DO_BANCO>"
npx.cmd supabase db dump --linked --schema public,storage,auth --file supabase\schema_exports\supabase_schema_live.sql
```

Use `--schema public,storage` se quiser evitar objetos internos de `auth`.
