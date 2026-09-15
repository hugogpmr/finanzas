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

Sprint 0 cerrado:
- ✅ Proyecto Next.js + Tailwind + shadcn/ui creado.
- ✅ Cuentas de GitHub, Supabase y Vercel creadas por el usuario.
- ✅ Esquema Prisma completo (`prisma/schema.prisma`) migrado a Supabase, con RLS activada
  en todas las tablas.
- ✅ Repo subido a GitHub, proyecto conectado y desplegado en Vercel.
- ✅ Supabase Auth (login/registro) y proxy que protege `/dashboard`.
- ✅ Layout base del dashboard con sidebar de shadcn/ui y logout.
- ✅ Site URL/Redirect URLs configuradas en Supabase y `NEXT_PUBLIC_SITE_URL` en Vercel.
  Flujo de registro + confirmación por email verificado de punta a punta en producción.
- ✅ Cron keep-alive de GitHub Actions (`.github/workflows/keepalive.yml`, cada 3 días)
  contra `GET /api/keepalive` (ruta pública, hace un `select` real vía anon key —
  no hace falta la service_role key). Si GitHub desactiva el cron por inactividad
  del repo (~60 días sin commits), hay que relanzarlo a mano una vez desde la
  pestaña Actions.

Sprint 1 completo (pendiente solo de que el usuario confirme el guardado real
con su sesión — ver sección de arriba):
- ✅ CRUD de cuentas (`src/features/accounts`, `/cuentas`): crear, editar, eliminar,
  agrupadas en Activos/Pasivos con subtotal. Verificado en producción por el usuario.
- ✅ CRUD de categorías (`src/features/categories`, `/categorias`): crear, editar,
  eliminar; jerarquía a 2 niveles, tipo ingreso/gasto, etiqueta 50/30/20 opcional.
  Se siembra un set de categorías por defecto la primera vez que el usuario visita
  `/categorias` o `/transacciones` (`ensureDefaultCategories`).
- ✅ CRUD de transacciones (`src/features/transactions`, `/transacciones`): crear,
  editar, eliminar; selector de cuenta, categoría (jerárquica, filtrada por
  ingreso/gasto) y etiquetas libres (se crean al vuelo, tabla `tags` +
  `transaction_tags`). El formulario pide tipo (ingreso/gasto) + importe positivo
  y la acción calcula el signo (`amount`); la divisa se toma de la cuenta elegida.
- ✅ Reglas de auto-categorización (`src/features/categorization-rules`, `/reglas`):
  `merchant_contains` o `description_regex`, con prioridad (mayor primero). Se
  aplican en `upsertTransaction` solo cuando el usuario no elige categoría a mano.
- ✅ División de transacciones (`transaction_splits`): checkbox "Dividir en varias
  categorías" en el diálogo de transacción, filas dinámicas categoría+importe+nota,
  validación en cliente (el botón Guardar se desactiva si no cuadra la suma) y en
  servidor. Una transacción dividida guarda `category_id = null` e `is_split = true`;
  la lista de transacciones muestra las categorías de la división en vez de una sola.
- ✅ Conversión de divisa real (`src/lib/fx.ts`, Frankfurter, `api.frankfurter.dev`):
  cachea el tipo de cambio en `fx_rates` por fecha+base+quote y calcula `amount_eur`
  real. Si Frankfurter falla, hace fallback a `fx_rate = 1` en vez de bloquear el
  guardado (ver comentario en el propio archivo). No es lógica financiera pura
  (hace red + caché en BD), por eso vive en `src/lib/fx.ts` y no en `src/lib/finance/`.
- ✅ Detección básica de recurrentes: al crear una transacción con comercio, si ya
  hay 3+ transacciones del mismo usuario con mismo comercio+importe+divisa, se
  marcan todas `is_recurring = true` con un `recurring_group_id` compartido
  (icono de repetición en la lista). Heurística simple, sin UI para gestionar
  grupos todavía.

Sprint 2 completo — Dashboard con KPIs (`src/features/dashboard`, `/dashboard`):
- ✅ `src/lib/finance/kpis.ts`: funciones puras (cash flow, tasa de ahorro, ratio de
  gastos fijos, 50/30/20, fondo de emergencia, ratio de liquidez, DTI, ratio de
  vivienda, patrimonio neto, múltiplo sobre ingresos, FIRE number, años hasta FIRE).
  Primer módulo con tests (`tests/finance/kpis.test.ts`, Vitest configurado con
  `vitest.config.ts` — `resolve.tsconfigPaths` nativo de Vite, sin plugin extra).
- ✅ `src/features/dashboard/queries.ts` agrega cuentas + transacciones (últimos 12
  meses) + `debts` en los KPIs de arriba. Los importes "mensuales" del dashboard son
  el **promedio de los últimos 3 meses con movimientos**, no el mes en curso a
  secas (evita que un mes a medias parezca un mes flojo). El patrimonio neto sí usa
  el saldo actual de cada cuenta convertido a EUR con el tipo de cambio de hoy
  (`getEurRate`), no promedios.
- ✅ Las divisiones (`transaction_splits`) no guardan su propio `amount_eur`: para
  atribuir needs/wants/savings/fijo/vivienda por división se prorratea con el
  tipo de cambio de la transacción padre (`amount_eur / amount`).
- ✅ "Ratio de vivienda" detecta la categoría por **nombre** (`vivienda` en el
  nombre propio o el de su categoría padre) — no hay un flag dedicado en el
  esquema. Si el usuario renombra/borra esa categoría, el KPI vuelve a 0 sin más.
- ✅ DTI usa `debts.minimum_payment` (tabla ya migrada con RLS, pero sin CRUD hasta
  el Sprint 4): hoy da 0%/sin deudas para todo el mundo, y empezará a funcionar
  solo cuando exista el CRUD de deudas, sin tocar el dashboard.
- ✅ Categorías: nuevo checkbox "Gasto fijo" (`is_fixed`, ya estaba en el esquema
  desde Sprint 0 pero no era editable). Vivienda y Suscripciones vienen marcadas
  como fijas en `DEFAULT_CATEGORIES`.
- ✅ Gráficas con Recharts: evolución de ingresos/gastos (12 meses) y gasto por
  categoría raíz (mes actual vs. anterior). `DashboardView` (presentación pura,
  recibe `DashboardData` ya calculado) está separado de `page.tsx` (fetch) para
  poder montarlo con datos falsos en `/devtest` sin sesión real.

Sprint 3 completo — Presupuestos y objetivos (`src/features/budgets`,
`src/features/goals`, `/presupuestos`, `/objetivos`):
- ✅ `src/lib/transactions/attribution.ts` extrae el prorrateo de divisiones por
  tipo de cambio (antes duplicado en el dashboard) a una función pura y
  testeada, reutilizada por `src/lib/transactions/category-totals.ts` (gasto
  por categoría en un rango de fechas, usado por presupuestos).
- ✅ CRUD de presupuestos (`Budget`) y sus líneas (`BudgetLine`, una por
  categoría). Solo un presupuesto puede estar activo a la vez: al crear uno
  se desactivan los demás; también se puede reactivar uno desde el menú de
  la fila. **El enum `BudgetMethod` de Postgres usa el valor real `50_30_20`**
  (no `fifty_thirty_twenty`, que es solo el nombre que le da Prisma porque un
  identificador no puede empezar por un número — ver `src/features/budgets/types.ts`).
- ✅ `src/features/budgets/period.ts` calcula la ventana del periodo activo
  (mes o semana que contiene hoy, no un rango fijo desde `start_date`).
  El rollover ("sobres") solo mira **un** periodo hacia atrás, no acumula
  histórico completo: `effectiveAllocated = allocated + max(0, allocated_anterior − gastado_anterior)`.
- ✅ Alertas de límite: `alert_threshold_pct` por línea pinta la barra de
  progreso en ámbar (cerca del límite) o rojo (superado) — sin envío de
  email/push, es un MVP visual.
- ✅ CRUD de objetivos (`Goal`): ahorro, fondo de emergencia o sinking fund.
  Proyección lineal en `src/lib/finance/goals.ts` (`monthsToGoal`, sin
  rentabilidad asumida, a diferencia de `yearsToFire` en `kpis.ts`).
- ✅ Un objetivo con `linked_account_id` **no usa su `current_amount` guardado**:
  el importe actual se calcula siempre a partir del saldo real de esa cuenta
  (convertido a EUR), para no tener dos fuentes de verdad que se desincronicen
  (ver `src/features/goals/queries.ts`). El diálogo oculta el campo manual
  cuando hay cuenta enlazada.
- ✅ Plantilla de fondo de emergencia: botón que pre-rellena el diálogo de
  objetivo (6 meses de gasto esencial, reutilizando `avgEssentialMonthlyExpensesEur`
  ya calculado por el dashboard del Sprint 2) en vez de pedir el dato otra vez.
- 🐛 De paso se corrigió un bug real de Sprint 1/2: la fecha por defecto de una
  transacción nueva y el rango de fechas del dashboard usaban
  `toISOString().slice(0,10)`, que en España podía dar el día de ayer (ver la
  nota en Convenciones sobre `src/lib/date.ts`).

Con esto termina el roadmap de `docs/plan-tecnico.md` hasta Sprint 3. Siguiente
en orden estricto: **Sprint 4 — Deudas con simuladores** (CRUD de deudas,
avalancha vs. bola de nieve, comparativa de meses e intereses ahorrados). El
CRUD de deudas hará que el DTI del dashboard (Sprint 2) empiece a dar datos
reales sin tocarlo.
