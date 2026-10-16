# Scripts de mantenimiento (uso manual)

Scripts de una sola vez para consultar o cargar datos. Usan la **service role key**
(saltan RLS), así que ejecútalos solo en local y con cuidado.

```bash
cd backend
npx ts-node scripts/check_db.ts
```

Todos leen las variables de `backend/.env`.
