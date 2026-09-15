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
- **Para "hoy" en formato YYYY-MM-DD, usar siempre `toDateStr`/`todayDateStr` de `src/lib/date.ts`, nunca `date.toISOString().slice(0, 10)`.** `toISOString()` convierte a UTC: para España (UTC+1/+2) eso resta horas y puede devolver el día de ayer (nos pasó de verdad en el valor por defecto de la fecha de una transacción nueva y en el rango de fechas del dashboard — Sprint 3, ver `src/lib/date.ts`).
- **`@default(uuid())` y `@updatedAt` de Prisma son trucos de Prisma Client, no de la base de datos.** Como escribimos con supabase-js (no Prisma Client), esos valores nunca se generaban y los inserts fallaban con "null value in column ... violates not-null constraint" (nos pasó con `id` y con `updated_at` en `accounts`). Para cualquier columna así: `id` → `@default(dbgenerated("gen_random_uuid()"))`; `updatedAt` → `@default(now())` además de `@updatedAt`, más un trigger `BEFORE UPDATE` que llame a `set_updated_at()` (ya creada, ver `prisma/migrations/20260914234525_updated_at_default_and_trigger/`) para que se refresque también en los `update()` de supabase-js.

## Comandos

```bash
npm run dev              # servidor de desarrollo
npm run build            # build de producción
npm run lint             # eslint
npm test                 # vitest (una pasada, no watch); usa `npx vitest` para modo watch
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

## Cómo verifica Claude sin poder iniciar sesión

Claude tiene prohibido crear cuentas o iniciar sesión en la app (regla fija, no
negociable). Patrón usado para probar cada feature de todos modos, antes de
pedirle al usuario que la pruebe él:
1. **Script puntual contra la base de datos real** (Prisma Client directo con
   `DATABASE_URL`, un `user_id` de prueba al azar, todo borrado al final):
   reproduce exactamente las queries de los server actions para pillar
   problemas de esquema/constraints.
2. **Ruta temporal sin autenticación** (añadir el path a `PUBLIC_PATHS` en
   `src/lib/supabase/middleware.ts` + una página en `src/app/<nombre>/page.tsx`
   con props falsas — ojo, un nombre con `_` inicial como `_devtest` hace que
   Next.js la trate como carpeta privada y devuelva 404) para probar de verdad
   los diálogos en el navegador (Selects controlados, reseteos, precarga en
   edición, mensajes de error). Se revierte todo (archivo borrado, middleware
   restaurado) antes de dar la feature por probada.
Solo el guardado real con la sesión del usuario queda pendiente de que él lo
confirme.

## Estado actual

Sprint 0 cerrado: Next.js+Tailwind+shadcn/ui, esquema Prisma completo con RLS
en todas las tablas, repo en GitHub desplegado en Vercel, Supabase Auth
(login/registro/confirmación por email) verificado de punta a punta en
producción, layout con sidebar. Cron keep-alive de GitHub Actions
(`.github/workflows/keepalive.yml`, cada 3 días contra `GET /api/keepalive`,
ruta pública vía anon key); si GitHub lo desactiva por inactividad del repo
(~60 días sin commits) hay que relanzarlo a mano desde la pestaña Actions.

Sprints 1-6 completos: cuentas multi-divisa (`/cuentas`), categorías con
reglas de auto-categorización (`/categorias`, `/reglas`), transacciones con
splits/etiquetas/recurrentes (`/transacciones`), dashboard de KPIs
(`/dashboard`, `src/lib/finance/kpis.ts`), presupuestos y objetivos
(`/presupuestos`, `/objetivos`), deudas con simulador avalancha/bola de nieve
(`/deudas`, `src/lib/finance/debts.ts`) e inversiones con XIRR/TWR
(`/inversiones`, `src/lib/finance/xirr.ts`+`twr.ts`) e importación CSV
(`/importar`, `src/lib/csv/parse-row.ts`).

Gotchas de esos sprints que siguen siendo relevantes:
- **`BudgetMethod` en Postgres usa el valor real `50_30_20`**, no
  `fifty_thirty_twenty` (nombre de Prisma: un identificador no puede empezar
  por un número). **`interest_rate`/`apr` de `debts` son puntos porcentuales**
  (19.5 = 19,5%), no una fracción.
- Simulador de deudas: el sobrante sin usar en el mes se sube al fondo
  "extra" del mes siguiente — si no, avalancha podía salir peor que bola de
  nieve (test de regresión en `tests/finance/debts.test.ts`).
- XIRR (`src/lib/finance/xirr.ts`, envuelve `@webcarrot/xirr`) y TWR
  (`src/lib/finance/twr.ts`, a mano) siguen la convención de signo de
  `investment_transactions.amount` (negativo = entra dinero). TWR por
  posición enlaza periodos entre `price_snapshots` consecutivos.
- Importación CSV: duplicado = misma cuenta+fecha+importe+comercio (o
  descripción) ya existente; el usuario puede forzar igualmente su importación.

Sprint 7 completo — Pulido UX/UI + seguridad:
- ✅ Modo oscuro con `next-themes` (`src/components/theme-provider.tsx` +
  `theme-toggle.tsx`); `loading.tsx`/`error.tsx` en `(dashboard)` y `error.tsx`
  raíz; `Toaster` (sonner) en el layout raíz. Las 10 acciones `deleteX` ahora
  devuelven `{error?}` y sus row-actions muestran un toast si falla, en vez
  de fallar en silencio.
- ✅ MFA (TOTP) opcional vía Supabase Auth (`/ajustes`,
  `src/features/security/mfa-enrollment.tsx`). Activarlo no basta por sí
  solo: `src/lib/supabase/middleware.ts` exige aal2
  (`getAuthenticatorAssuranceLevel()`) y redirige a `/mfa-verify` si falta —
  si no, el segundo factor nunca se comprobaría de verdad al iniciar sesión.
- ✅ Contraseña mínima subida a 12 caracteres. El chequeo de contraseñas
  filtradas (HaveIBeenPwned) es un ajuste de Supabase Dashboard
  (Authentication → Policies), no de código — pendiente de que el usuario lo
  active a mano.
- ✅ Revisión de RLS: las 17 tablas de usuario tienen RLS y policy propia
  (auditado con una query a `pg_policies`); sin cambios necesarios.
- ✅ Snapshot mensual de patrimonio neto: `src/lib/finance/net-worth.ts`
  (extraído del dashboard y testeado, ambos lo reutilizan ahora) +
  `POST /api/snapshot-net-worth` con `SUPABASE_SERVICE_ROLE_KEY` (salta RLS
  para escribir de todos los usuarios a la vez) protegido por `CRON_SECRET`,
  llamado el día 1 de cada mes por `.github/workflows/net-worth-snapshot.yml`.
  **Pendiente que el usuario añada `SUPABASE_SERVICE_ROLE_KEY` y
  `CRON_SECRET` en Vercel, y `CRON_SECRET` como secret del repo en GitHub**
  (ver `.env.example`) — sin eso el cron falla con 401.

Con esto se completa el roadmap de `docs/plan-tecnico.md` (Sprints 0-7).
