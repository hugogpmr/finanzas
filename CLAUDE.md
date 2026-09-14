@AGENTS.md

# Finanzas — app de finanzas personales

MVP personal de gestión financiera: cuentas multi-divisa, transacciones categorizadas,
presupuestos, objetivos de ahorro, deudas (con simuladores) e inversiones (TWR/XIRR),
con patrimonio neto consolidado. Sin agregación bancaria en esta fase: entrada manual + CSV.

Contexto de producto y decisiones de mercado: [docs/investigacion-mercado.md](docs/investigacion-mercado.md).
Plan técnico completo (roadmap por sprints, fórmulas, esquema de datos detallado): [docs/plan-tecnico.md](docs/plan-tecnico.md).

## Stack

- Next.js 16 (App Router, TypeScript), React 19
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + RLS), cliente vía `@supabase/ssr`
- Prisma como fuente de verdad del esquema (`prisma/schema.prisma`)
- Vitest para tests (foco en `src/lib/finance/`)
- Despliegue en Vercel (plan Hobby)

## Convenciones

- **UI en español.** Nombres de variables/funciones/commits en inglés como es habitual en código.
- **Todo importe monetario es `numeric`, nunca `float`** (evita errores de redondeo). Tipos de cambio con más precisión decimal.
- **RLS activada en todas las tablas de usuario**, política `user_id = auth.uid()`. Nunca acceder a datos sin pasar por RLS.
- **`service_role` key de Supabase JAMÁS en el cliente ni en el repo.** Solo `anon` key en el frontend. Todo secreto va en `.env` (ignorado por git; el CLI de Prisma solo lee `.env`, no `.env.local`, así que usamos `.env` para todo).
- **Arquitectura por features** en `src/features/<feature>/`, no por tipo de archivo. Cada feature agrupa sus componentes, hooks y acciones.
- **Lógica financiera pura y aislada** en `src/lib/finance/` (funciones puras, sin efectos secundarios, sin UI ni acceso a BD). Todo cálculo no trivial (XIRR, TWR, FIRE, simuladores de deuda) lleva test en `tests/` con casos conocidos.
- Next.js 16 tiene cambios respecto a versiones anteriores — consultar `node_modules/next/dist/docs/` antes de asumir una API o convención de versiones previas (ver `AGENTS.md`). En concreto: el archivo de middleware se llama `proxy.ts` (no `middleware.ts`) y **debe vivir en `src/`** junto a `app/`, no en la raíz del proyecto — si se pone en la raíz, Next no lo detecta y las rutas quedan sin proteger sin avisar.
- Autenticación: Supabase Auth vía `@supabase/ssr`. `src/lib/supabase/{client,server,middleware}.ts` son los tres clientes (browser, Server Components/Actions, proxy). `src/proxy.ts` protege todo lo que no esté en `/login`, `/registro` o `/auth`.
- **Leer/escribir datos de usuario: siempre con el cliente de Supabase (`createClient()` de `src/lib/supabase/server.ts`), nunca con Prisma.** `DATABASE_URL` conecta como el rol `postgres` (dueño de las tablas), que **salta RLS** — usar Prisma para queries filtraría "por las buenas" pero no por diseño, y un olvido de `where: { userId }` filtraría datos de todos los usuarios. Prisma se queda solo para `schema.prisma` y migraciones. Los tipos de cada feature (p. ej. `src/features/accounts/types.ts`) se escriben a mano en snake_case porque así es como los devuelve PostgREST/supabase-js, no en camelCase como los modelos de Prisma.
- `numeric` de Postgres llega desde supabase-js como **string**, no `number` (evita perder precisión) — convertir con `Number()` solo al formatear o calcular, nunca asumir que ya es numérico.
- **`@default(uuid())` y `@updatedAt` de Prisma son trucos de Prisma Client, no de la base de datos.** Como escribimos con supabase-js (no Prisma Client), esos valores nunca se generaban y los inserts fallaban con "null value in column ... violates not-null constraint" (nos pasó con `id` y con `updated_at` en `accounts`). Para cualquier columna así: `id` → `@default(dbgenerated("gen_random_uuid()"))`; `updatedAt` → `@default(now())` además de `@updatedAt`, más un trigger `BEFORE UPDATE` que llame a `set_updated_at()` (ya creada, ver `prisma/migrations/20260914234525_updated_at_default_and_trigger/`) para que se refresque también en los `update()` de supabase-js.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build            # build de producción
npm run lint             # eslint
npm test                 # vitest (cuando esté configurado)
npx prisma migrate dev   # nueva migración (esquema normal, sin RLS/auth.*)
npx prisma studio        # explorar/editar datos con UI
```

**Migraciones que tocan RLS o la función `auth.uid()`:** la shadow database que usa
`prisma migrate dev` para validar no tiene el schema `auth` de Supabase, así que falla
con "schema auth does not exist". Flujo para estos casos:
1. `npx prisma migrate dev --create-only --name <nombre>` (crea el SQL sin aplicarlo)
2. Editar `prisma/migrations/<carpeta>/migration.sql` a mano
3. `npx prisma migrate deploy` (aplica sin pasar por la shadow database)

Prisma no gestiona RLS: cada tabla nueva con datos de usuario necesita su policy añadida
a mano en una migración así (ver `prisma/migrations/20260914194025_enable_row_level_security/`
como referencia — policy `user_id = auth.uid()` para tablas con `user_id` propio, o un
`EXISTS` contra la tabla padre para las que no lo tienen, p.ej. `transaction_splits`).

## Estado actual

Sprint 0 casi cerrado:
- ✅ Proyecto Next.js + Tailwind + shadcn/ui creado.
- ✅ Cuentas de GitHub, Supabase y Vercel creadas por el usuario.
- ✅ Esquema Prisma completo (`prisma/schema.prisma`) migrado a Supabase, con RLS activada
  en todas las tablas.
- ✅ Repo subido a GitHub, proyecto conectado y desplegado en Vercel.
- ✅ Supabase Auth (login/registro) y proxy que protege `/dashboard`.
- ✅ Layout base del dashboard con sidebar de shadcn/ui y logout.
- ✅ Site URL/Redirect URLs configuradas en Supabase y `NEXT_PUBLIC_SITE_URL` en Vercel.
  Flujo de registro + confirmación por email verificado de punta a punta en producción.
- ⬜ Cron keep-alive de GitHub Actions (evita que Supabase pause el proyecto por inactividad).

Sprint 1 en progreso:
- ✅ CRUD de cuentas (`src/features/accounts`, `/cuentas`): crear, editar, eliminar,
  agrupadas en Activos/Pasivos con subtotal. Pendiente de probar en producción con el
  usuario real (Claude no tiene la contraseña para probarlo autenticado).
- ⬜ CRUD de transacciones con categorías jerárquicas y tags.
- ⬜ Reglas de auto-categorización por comerciante.
- ⬜ División de transacciones.
- ⬜ Conversión de divisa (Frankfurter) y `amount_eur`.
- ⬜ Detección básica de recurrentes.
