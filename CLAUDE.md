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

Sprint 1 completo — CRUD base, verificado en producción: cuentas multi-divisa
(`/cuentas`), categorías a 2 niveles con etiqueta 50/30/20 opcional
(`/categorias`, `ensureDefaultCategories` siembra un set por defecto),
transacciones con categoría jerárquica/etiquetas/división en varias
categorías (`/transacciones`, `transaction_splits`), reglas de
auto-categorización (`/reglas`), conversión de divisa real cacheada
(`src/lib/fx.ts`, Frankfurter) y detección básica de recurrentes (3+
transacciones iguales de comercio+importe+divisa).

Sprint 2 completo — Dashboard con KPIs (`src/features/dashboard`, `/dashboard`):
- ✅ `src/lib/finance/kpis.ts`: funciones puras (cash flow, tasa de ahorro,
  gastos fijos, 50/30/20, fondo de emergencia, liquidez, DTI, vivienda,
  patrimonio neto, múltiplo, FIRE number, años hasta FIRE) — primer módulo
  con tests (Vitest, `vitest.config.ts` con `resolve.tsconfigPaths` nativo).
- ✅ `src/features/dashboard/queries.ts` agrega cuentas+transacciones (12
  meses)+`debts`; los importes "mensuales" son el **promedio de los últimos 3
  meses con movimientos**, no el mes en curso a secas. El patrimonio neto usa
  el saldo actual de cada cuenta a EUR con el tipo de cambio de hoy.
- ✅ "Ratio de vivienda" detecta la categoría por **nombre** (`vivienda`), no
  hay un flag dedicado en el esquema. Categorías: checkbox "Gasto fijo"
  (`is_fixed`). Gráficas con Recharts.
- ✅ `DashboardView` (presentación pura) separado de `page.tsx` (fetch) para
  poder montarlo con datos falsos en `/devtest` sin sesión real (los sprints
  siguientes prueban igual por `/devtest` pero sin extraer un componente de
  vista propio: alcanza con montar la página real con datos falsos).

Sprint 3 completo — Presupuestos y objetivos (`src/features/budgets`,
`src/features/goals`, `/presupuestos`, `/objetivos`):
- ✅ `src/lib/transactions/attribution.ts` prorratea divisiones por tipo de
  cambio (reutilizado por presupuestos y por el dashboard). CRUD de
  presupuestos y líneas: solo uno activo a la vez. **El enum `BudgetMethod`
  usa el valor real `50_30_20`**, no `fifty_thirty_twenty` (nombre de
  Prisma: un identificador no puede empezar por un número).
- ✅ `src/features/budgets/period.ts` calcula la ventana del periodo activo
  (mes/semana que contiene hoy). El rollover solo mira **un** periodo atrás.
  Alertas de límite pintan la barra en ámbar/rojo (visual, sin email/push).
- ✅ CRUD de objetivos: uno con `linked_account_id` usa siempre el saldo real
  de esa cuenta como importe actual, no el campo guardado (evita dos fuentes
  de verdad). La plantilla de fondo de emergencia reutiliza
  `avgEssentialMonthlyExpensesEur` ya calculado por el dashboard.
- 🐛 De paso se corrigió un bug real de Sprint 1/2: la fecha por defecto de
  una transacción y el rango del dashboard usaban `toISOString().slice(0,10)`,
  que en España podía dar el día de ayer (ver `src/lib/date.ts`).

Sprint 4 completo — Deudas con simuladores (`src/features/debts`, `/deudas`):
- ✅ CRUD de deudas (`Debt`). **`interest_rate`/`apr` se guardan como puntos
  porcentuales (19.5 = 19,5%), no como fracción** — es como el usuario los ve
  en el papel de su préstamo/tarjeta.
- ✅ `src/lib/finance/debts.ts`: motor de amortización mes a mes puro
  (`simulateDebtPayoff`, `compareDebtStrategies`). Avalancha ordena por TIN
  descendente, bola de nieve por saldo ascendente; el extra mensual (más las
  cuotas que se liberan al saldar una deuda) se dirige a la primera deuda
  activa del orden, con cascada al resto de deudas **dentro del mismo mes**
  si sobra. Detecta amortización negativa (cuota que no cubre el interés) y
  tiene un tope de seguridad de 600 meses para no simular para siempre.
- 🐛 Bug real encontrado con los tests: si la deuda que se saldaba con
  sobrante era la última del orden, ese sobrante se descartaba en vez de
  pasar al mes siguiente — con pocas deudas y sin extra mensual, eso podía
  hacer que avalancha saliera (mal) más cara que bola de nieve, violando la
  propiedad matemática de que avalancha nunca es peor. Corregido: el
  sobrante no usado en el mes se sube al fondo "extra" permanente.
- ✅ `DebtSimulator` (cliente): recalcula en vivo al cambiar el extra mensual,
  sin pasar por el servidor (la función es pura, se ejecuta en el navegador).
  El "orden" que muestra cada tarjeta es el orden **real de liquidación**
  (cuándo se salda cada deuda), que solo coincide con la prioridad de la
  estrategia cuando hay extra suficiente para que el orden importe.
- ✅ El DTI del dashboard (Sprint 2, `dtiPct` con `debts.minimum_payment`)
  ya da datos reales en cuanto hay deudas, sin haber tocado ese código.

Sprint 5 completo — Inversiones con TWR/XIRR (`src/features/investments`,
`/inversiones`):
- ✅ CRUD de posiciones (`Holding`) y movimientos (`InvestmentTransaction`):
  igual que `accounts.current_balance`, `quantity`/`current_price` se
  mantienen a mano, no se recalculan solos desde el historial.
- ✅ `src/lib/finance/xirr.ts` envuelve `@webcarrot/xirr` (Newton-Raphson);
  test con el ejemplo del README de `xirr` (-1000/-2500/-1000, valor final
  5050 ⇒ 0.2504234710540838, precisión 4: `@webcarrot/xirr` usa un day-count
  ligeramente distinto, no es un bug). `src/lib/finance/twr.ts` codifica TWR
  a mano (enlace geométrico de subperiodos): ninguna librería JS lo trae.
  Convención de signo de `amount` = flujo de caja real (compra/aportación/
  comisión negativo, venta/retirada/dividendo positivo), ver
  `src/lib/finance/CLAUDE.md`.
- ✅ TWR por posición enlaza los periodos entre `price_snapshots`
  consecutivos, con flujo externo = compras/ventas en ese rango de fechas —
  simplificación honesta sin valoración diaria continua (ver
  `src/features/investments/queries.ts`).
- ✅ Botón "Actualizar precios" contra Twelve Data (`TWELVE_DATA_API_KEY`
  opcional, plan gratis 800 llamadas/día): sin la clave no falla, solo
  informa — el precio se puede seguir editando a mano.
- ✅ Asignación de activos por clase/sector/geografía/divisa y yield-on-cost
  (dividendos de los últimos 12 meses / coste de adquisición).

Sprint 6 completo — Importación CSV (`src/features/import`, `/importar`):
- ✅ `src/lib/csv/parse-row.ts`: parseo puro y testeado de fecha (ISO o
  DD/MM/YYYY español, no MM/DD/YYYY) e importe (acepta `1.234,56` y
  `1,234.56`; con un solo separador se asume que es el decimal). Devuelve
  `null` ante formatos irreconocibles en vez de adivinar mal — la
  previsualización es la red de seguridad real, no un parseo perfecto.
- ✅ Flujo en 3 pasos (subir CSV con `papaparse` en el navegador → mapear
  columnas a fecha/importe/comercio/descripción → previsualizar): la
  previsualización llama a `previewImport` (server action) para marcar
  duplicados y sugerir categoría antes de importar nada.
- ✅ Duplicado = misma cuenta+fecha+importe+comercio (o descripción si no hay
  comercio) que una transacción ya existente; empieza sin seleccionar en la
  tabla pero el usuario puede forzar su importación con el checkbox.
- ✅ Reutiliza `matchCategorizationRule` (ya usado por la creación manual de
  transacciones) para sugerir categoría; el usuario puede cambiarla por fila.

Con esto termina el roadmap de `docs/plan-tecnico.md` hasta Sprint 6. Siguiente
en orden estricto: **Sprint 7 — Pulido UX/UI + seguridad** (estados de carga/
vacío/error, responsive, modo oscuro, MFA opcional, revisión de RLS,
snapshot mensual de patrimonio neto automatizado).
