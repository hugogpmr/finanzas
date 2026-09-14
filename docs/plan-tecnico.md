# Plan de ejecución técnico: MVP de app de finanzas personales con Claude Code (2026)

## TL;DR
- **Stack recomendado: Next.js 15/16 (App Router, TypeScript) + Supabase (Postgres + Auth + RLS) + Prisma (o Drizzle) + Tailwind + shadcn/ui, desplegado en Vercel Hobby ($0) con la base de datos en Supabase Free ($0).** Es la combinación con mayor huella en datasets de LLMs y documentación mainstream, lo que la hace la más amigable para desarrollo con Claude Code por un principiante.
- **Coste de operar el MVP: 0 €/mes** en tiers gratuitos (Vercel Hobby + Supabase Free), con un único gran caveat: Supabase pausa los proyectos gratuitos tras 7 días de inactividad — se resuelve con un cron gratuito de GitHub Actions que hace un `SELECT` cada 2-3 días.
- **Cálculos financieros: no reinventar la rueda.** XIRR con la librería npm `@webcarrot/xirr` (o `xirr` de RayDeCampo); TWR se implementa a mano (enlace geométrico de subperiodos, ninguna librería JS lo trae); CSV con `papaparse`. GoCardless Bank Account Data ya NO acepta nuevos clientes (cerrado desde julio de 2025), lo que confirma la decisión del informe de posponer open banking a la Fase 2 y, cuando llegue, usar Enable Banking.

## Key Findings

1. **La regla de oro del vibecoding en 2026 es "el mejor stack es el que la IA ya conoce".** Next.js + Supabase es el stack por defecto de facto para MVPs asistidos por IA, con la mayor huella en datos de entrenamiento y tutoriales. Esto reduce alucinaciones de Claude Code y errores de configuración para alguien sin experiencia.
2. **Todo el MVP puede operar con coste 0 €**, pero cada tier gratuito tiene una trampa concreta que hay que gestionar (pausa de Supabase, uso no comercial en Vercel Hobby). Se detallan y se dan mitigaciones.
3. **GoCardless (ex-Nordigen) dejó de aceptar nuevos registros de Bank Account Data desde julio de 2025.** La página oficial (bankaccountdata.gocardless.com) muestra "New signups for Bank Account Data are currently disabled", y la documentación de Actual Budget lo confirma: "From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts... if you are an existing user, your account should continue to work." Para la futura Fase 2, el reemplazo self-serve en Europa es Enable Banking. Esto valida la estrategia de dos fases del informe.
4. **Para los cálculos financieros existen librerías maduras para XIRR pero NO para TWR**, que debe codificarse manualmente. Se dan las fórmulas exactas y librerías concretas.
5. **La mayor fuente de deuda técnica del vibecoding se controla con disciplina de contexto** (CLAUDE.md), git por feature, y tests generados por la IA sobre la lógica financiera crítica.

## Details

### 1. Stack tecnológico recomendado y justificado (Fase 0)

**Decisión final:**

| Capa | Elección | Justificación para Claude Code + principiante |
|---|---|---|
| Frontend + Backend | **Next.js (App Router) con TypeScript** | Un único framework full-stack (React + API routes/Server Actions). Es el framework con más presencia en datasets de LLMs; Claude Code genera código Next.js idiomático con muy pocos errores. TypeScript da seguridad de tipos que atrapa errores antes de ejecutar — crucial para quien no revisa a fondo cada línea. |
| Base de datos | **Postgres gestionado por Supabase** | Postgres es la BD relacional #1 en adopción. Supabase lo expone con dashboard, migraciones y APIs autogeneradas. |
| Autenticación | **Supabase Auth** | Auth lista para usar (email/password, magic links, OAuth, MFA TOTP) integrada con la BD. Evita que un principiante implemente autenticación a mano (fuente #1 de vulnerabilidades). |
| ORM | **Prisma** (o Drizzle) | Ver discusión abajo. |
| UI | **Tailwind CSS + shadcn/ui** | shadcn/ui es el sistema de componentes por defecto para React+Tailwind; Claude Code tiene "skills" oficiales para él. Componentes accesibles copy-paste. |
| Hosting app | **Vercel (plan Hobby, $0)** | Integración nativa con Next.js, despliegue con `git push`, HTTPS y preview URLs automáticas. |
| Datos de mercado/FX | **Frankfurter (FX, gratis, sin API key)** + Alpha Vantage/Twelve Data (precios de activos) | Ver sección 5/8. |

**Comparativa de alternativas full-stack:**

- **Next.js + Supabase (RECOMENDADO):** máxima documentación, todo-en-uno (auth+BD+storage), un solo proveedor. Es la opción con menor fricción para un principiante con IA.
- **T3 Stack (Next.js + tRPC + Prisma + Tailwind):** excelente type-safety end-to-end, pero añade tRPC — una capa conceptual extra que complica el aprendizaje. Recomendable *solo* si más adelante quieres RPC tipado; para el MVP es sobreingeniería.
- **Remix / TanStack Start:** buenos frameworks pero con menor huella en datos de entrenamiento que Next.js → Claude Code comete más errores. Descartar para este perfil.
- **Backend Python (FastAPI/Django) separado:** tentador porque las librerías financieras de Python (pyxirr) son superiores. Pero implica gestionar DOS proyectos (frontend JS + backend Python), CORS, dos despliegues. Para un solo dev principiante, la sobrecarga no compensa. **Recomendación: quedarse en TypeScript full-stack.** Si en el futuro un cálculo pesado lo exige, se puede añadir una única Supabase Edge Function o un microservicio Python, pero no en Fase 0.

**ORM — Prisma vs Drizzle:** Ambos son válidos con Supabase. **Prisma** tiene más datos de entrenamiento (casi todos los tutoriales de Next.js de los últimos 5 años lo usan) → Claude Code lo genera muy bien, con un esquema declarativo `.prisma` legible que sirve de "fuente de verdad" tanto para humanos como para la IA. **Drizzle** es SQL-first, más ligero y mejor en serverless/edge, con sintaxis cercana a SQL y adopción creciente (~5,1M descargas/semana en npm según el tracking de PkgPulse Q1 2026). **Recomendación para este perfil: Prisma**, precisamente porque su mayor huella en datasets y su schema declarativo lo hacen más predecible para un principiante que dependa de la IA. (Drizzle es defendible si prefieres mantenerte cerca del SQL; ninguno "hará ni romperá el proyecto — tu diseño de esquema sí".)

**Tiers gratuitos actualizados a septiembre 2026 (para dimensionar coste):**

- **Vercel Hobby:** $0, sin tarjeta. Incluye 100 GB de Fast Data Transfer/mes, 1 millón de Edge Requests, 6.000 minutos de build, 1 millón de invocaciones de función, 4 CPU-horas de CPU activa de función, hasta 200 proyectos y 100 despliegues/día (verificado por CostBench, 24-jul-2026). **Restricción clave: "restricted to personal, non-commercial use"** — el día que cobres a un usuario debes pasar a Pro ($20/mes por asiento, con $20 de crédito incluido bajo el modelo credit-based vigente desde septiembre de 2025). Para un MVP personal de estudiante, es perfecto. No hay overage: si superas un límite, la función se pausa hasta el siguiente ciclo de 30 días.
- **Supabase Free:** $0. 500 MB de BD Postgres, 1 GB de file storage, 5 GB de egress, 50.000 MAU, 500.000 invocaciones de Edge Function, 2 proyectos activos. **Trampa principal:** según la doc oficial de Supabase (Project Pausing), "Supabase pauses Free Plan projects that show low activity over a 7-day period to save server resources" (política endurecida el 1 de febrero de 2026); tras la pausa hay un cold-start de 10-30 s y hay que reactivar manualmente. No hay backups automáticos. Los planes de pago no se pausan por inactividad.
- **Neon (alternativa de BD):** Free con 0.5 GB de storage por proyecto, 100 CU-horas/mes, hasta 100 proyectos, scale-to-zero, **uso comercial permitido**. Buena alternativa si te molesta la pausa de Supabase o si quieres uso comercial gratuito — pero pierdes Auth/Storage integrados. Para el MVP, Supabase gana por ser todo-en-uno.
- **Railway:** ya NO tiene tier gratuito permanente — trial de 30 días con $5 de crédito, luego plan Free capado a 1 vCPU/0.5 GB por $1/mes, o Hobby $5/mes. Menos indicado para coste-0.
- **Render:** mantiene un tier gratuito real (servicios web con 750 horas/mes que se duermen tras 15 min de inactividad, cold-start ~1 min). Válido si quisieras un backend separado, pero innecesario con Vercel+Supabase.

**Veredicto de coste:** el MVP corre en **0 €/mes** con Vercel Hobby + Supabase Free. El primer gasto plausible sería Supabase Pro ($25/mes por proyecto) solo si superas 500 MB de BD o quieres eliminar la pausa — improbable para uso personal en años.

### 2. Modelo de datos técnico (esquema completo)

Diseño relacional en Postgres. Todas las tablas de datos de usuario llevan `user_id uuid` (FK a `auth.users`) y **Row Level Security (RLS) activada** con política `user_id = auth.uid()`. Todos los importes monetarios se guardan como **`numeric(18,2)` (nunca float)** para evitar errores de redondeo; los tipos de cambio como `numeric(18,8)`.

**Tablas núcleo:**

- **`accounts`**: `id`, `user_id`, `name`, `type` (enum: `checking, savings, cash, brokerage, pension, deposit, crypto, real_estate, credit_card, personal_loan, mortgage, credit_line`), `account_class` (enum: `asset, liability`), `currency` (char(3), ISO 4217), `current_balance numeric(18,2)`, `is_active bool`, `institution text`, `created_at`, `updated_at`.
- **`categories`**: `id`, `user_id`, `name`, `parent_id` (self-FK, jerarquía), `type` (enum: `income, expense, transfer`), `is_fixed bool` (fijo/variable), `needs_wants_savings` (enum para 50/30/20: `needs, wants, savings`), `icon`, `color`.
- **`tags`**: `id`, `user_id`, `name`. Tabla puente **`transaction_tags`** (`transaction_id`, `tag_id`) para relación N:M transversal.
- **`transactions`**: `id`, `user_id`, `account_id` (FK), `category_id` (FK, nullable), `amount numeric(18,2)` (negativo=gasto, positivo=ingreso), `currency`, `amount_eur numeric(18,2)` (valor convertido guardado), `fx_rate numeric(18,8)`, `date`, `merchant text`, `description`, `is_recurring bool`, `recurring_group_id`, `is_split bool`, `transfer_pair_id` (para transferencias entre cuentas), `created_at`.
- **`transaction_splits`**: `id`, `transaction_id` (FK), `category_id`, `amount numeric(18,2)`, `note`. (División de una transacción en varias categorías.)
- **`categorization_rules`**: `id`, `user_id`, `match_type` (enum: `merchant_contains, description_regex`), `pattern text`, `category_id`, `priority int`. (Auto-categorización por comerciante.)

**Presupuestos:**

- **`budgets`**: `id`, `user_id`, `name`, `method` (enum: `50_30_20, zero_based, envelope, pay_yourself_first`), `period` (enum: `monthly, weekly`), `start_date`, `total_income numeric(18,2)`, `is_active bool`.
- **`budget_lines`**: `id`, `budget_id` (FK), `category_id`, `allocated numeric(18,2)`, `rollover bool` (para sobres/envelope), `alert_threshold_pct numeric(5,2)`.

**Ahorro y objetivos:**

- **`goals`**: `id`, `user_id`, `name`, `type` (enum: `savings_goal, emergency_fund, sinking_fund`), `target_amount numeric(18,2)`, `current_amount numeric(18,2)`, `target_date`, `linked_account_id` (FK), `monthly_contribution numeric(18,2)`, `months_of_expenses int` (para fondo de emergencia 3-6 meses), `created_at`.

**Deudas:**

- **`debts`**: `id`, `user_id`, `account_id` (FK opcional a la cuenta pasivo), `name`, `debt_type` (enum: `credit_card, personal_loan, mortgage, credit_line`), `principal numeric(18,2)` (saldo actual), `original_principal numeric(18,2)`, `interest_rate numeric(6,4)` (TIN anual), `apr numeric(6,4)` (TAE), `minimum_payment numeric(18,2)`, `term_months int`, `start_date`, `payment_day int`.
- **`debt_payments`**: `id`, `debt_id`, `date`, `amount`, `principal_portion`, `interest_portion`. (Historial; también se puede derivar de transactions.)

**Inversiones:**

- **`holdings`** (posiciones): `id`, `user_id`, `account_id` (FK brokerage/pension), `ticker`, `isin`, `asset_class` (enum: `stock, etf, index_fund, pension_plan, crypto, bond`), `sector`, `geography`, `currency`, `quantity numeric(18,8)`, `current_price numeric(18,6)`, `price_updated_at`.
- **`investment_transactions`** (flujos de caja para XIRR/TWR): `id`, `user_id`, `holding_id` (FK), `type` (enum: `buy, sell, dividend, fee, deposit, withdrawal`), `date`, `quantity numeric(18,8)`, `price_per_unit numeric(18,6)`, `amount numeric(18,2)` (signo: negativo=entrada de capital/compra, positivo=salida/venta/dividendo), `currency`, `fee numeric(18,2)`.
- **`price_snapshots`**: `id`, `holding_id`, `date`, `price numeric(18,6)`, `market_value numeric(18,2)`. (Serie temporal para TWR: valoración del portfolio antes de cada flujo y a fin de periodo.)

**Patrimonio neto:**

- **`net_worth_snapshots`**: `id`, `user_id`, `snapshot_date` (primer día de mes), `total_assets numeric(18,2)`, `total_liabilities numeric(18,2)`, `net_worth numeric(18,2)`, `liquid_net_worth numeric(18,2)`, `breakdown jsonb` (desglose por tipo de cuenta). Se genera con un job mensual (o al abrir la app si falta el snapshot del mes).

**Divisas:**

- **`fx_rates`** (cache): `id`, `date`, `base char(3)`, `quote char(3)`, `rate numeric(18,8)`. Poblada desde Frankfurter, cacheada (los tipos son estables intradía — nunca pedir por request de usuario).

### 3. Arquitectura de la aplicación

**Estructura de carpetas (optimizada para que Claude Code razone bien):**

```
proyecto/
├── CLAUDE.md                    # Contexto global: stack, convenciones, comandos, reglas
├── .claude/
│   └── skills/                  # Skills (p.ej. shadcn) que Claude carga bajo demanda
├── prisma/
│   └── schema.prisma            # (o drizzle/schema.ts) — fuente de verdad del modelo
├── src/
│   ├── app/                     # App Router: rutas y páginas
│   │   ├── (auth)/              # Grupo de rutas de login/registro
│   │   ├── (dashboard)/        # Grupo protegido: dashboard, cuentas, etc.
│   │   └── api/                 # Route handlers cuando hagan falta
│   ├── components/
│   │   ├── ui/                  # Componentes shadcn/ui (generados)
│   │   └── CLAUDE.md            # Convenciones de componentes (props, naming)
│   ├── features/                # UNA CARPETA POR FEATURE (clave anti-caos)
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── budgets/
│   │   ├── debts/
│   │   ├── investments/
│   │   └── dashboard/
│   ├── lib/
│   │   ├── finance/             # Lógica de cálculo pura (TWR, XIRR, FIRE...)
│   │   │   └── CLAUDE.md        # Notas: fórmulas, invariantes, no usar float
│   │   ├── supabase/           # Cliente Supabase (server y client)
│   │   └── utils.ts
│   └── types/
├── tests/                       # Tests (Vitest) — foco en lib/finance
└── package.json
```

**Patrones y buenas prácticas:**

- **Arquitectura por features (vertical slices), no por tipos de archivo.** Cada feature agrupa sus componentes, hooks y lógica. Así Claude Code trabaja sobre una feature sin cargar el proyecto entero en contexto, y el proyecto no se vuelve inmanejable.
- **Lógica financiera pura y aislada en `src/lib/finance/`:** funciones puras (entrada→salida, sin efectos secundarios), fáciles de testear. **Nunca mezclar cálculo financiero con UI o acceso a BD.**
- **Gestión de estado:** para el MVP, mantener simple. Estado de servidor con los patrones nativos de Next.js (Server Components + Server Actions) y, si hace falta cache en cliente, TanStack Query (React Query). Evitar Redux/estado global complejo — innecesario y difícil de mantener para un principiante.
- **Contexto para la IA (lo más importante para este perfil):**
  - **`CLAUDE.md` en la raíz** (<200 líneas, revisable de un vistazo, según la recomendación de la propia Anthropic): resumen del proyecto, stack exacto con versiones, dónde vive cada cosa, convenciones (numeric no float, RLS siempre, español en UI), y comandos frecuentes (`npm run dev`, `npm test`, `npx prisma migrate`). Genéralo con `/init` y refínalo. Claude Code lo lee automáticamente al inicio de cada sesión.
  - **`CLAUDE.md` por subcarpeta** para reglas locales (p.ej. en `lib/finance/`: "todos los importes son numeric; los flujos de caja de inversión usan signo negativo=compra"). Claude lee los CLAUDE.md desde el directorio de trabajo hasta la raíz, y los más profundos tienen prioridad.
  - **Skills** (`.claude/skills/`): instalar la skill oficial de shadcn/ui (`npx skills add shadcn-ui/ui@shadcn`) para que genere componentes idiomáticos con las particularidades de Tailwind v4.
  - **Tests automatizados** de la lógica financiera: pedir a Claude Code que genere tests Vitest con casos conocidos (p.ej. el XIRR del ejemplo de la doc = 0.2504) para no fiarte a ciegas del cálculo.

### 4. Roadmap de desarrollo por sprints

Cada sprint termina con algo funcional y desplegado (deploy continuo desde el día 1). Orden pensado para que cada capa se apoye en la anterior.

**Sprint 0 — Fundación (1-2 sesiones largas):**
1. `create-next-app` con TypeScript, Tailwind, App Router, alias `@/`. Init de shadcn/ui.
2. Crear proyecto Supabase; conectar; configurar cliente server/client con `@supabase/ssr`.
3. Escribir `CLAUDE.md` raíz. Inicializar git (repo privado en GitHub).
4. Definir esquema inicial (accounts, categories, transactions) en Prisma/Drizzle; primera migración.
5. **Activar RLS en todas las tablas** con política `user_id = auth.uid()`.
6. Auth: páginas de registro/login con Supabase Auth; middleware que protege `(dashboard)`.
7. Layout base (sidebar, navegación) con shadcn/ui.
8. Configurar el **cron keep-alive de GitHub Actions** (SELECT autenticado cada 2-3 días) para evitar la pausa de Supabase.

**Sprint 1 — CRUD cuentas y transacciones + categorización:**
1. CRUD de cuentas (multi-tipo, multi-divisa).
2. CRUD de transacciones con selector de categoría jerárquica y tags.
3. Reglas de auto-categorización por comerciante (`categorization_rules`).
4. División de transacciones (`transaction_splits`).
5. Conversión de divisa: integrar Frankfurter, cachear en `fx_rates`, calcular `amount_eur`.
6. Detección básica de recurrentes (agrupar por comerciante+importe similar).

**Sprint 2 — Dashboard con KPIs (sección 3 del informe):**
1. Cash flow neto mensual, tasa de ahorro, ratio de gastos fijos, distribución needs/wants/savings.
2. Fondo de emergencia (meses de cobertura), ratio de liquidez.
3. DTI, ratio de vivienda.
4. Patrimonio neto (activos-pasivos) y liquid net worth; múltiplo sobre ingresos (hitos Fidelity: ~1x a los 30, 3x a los 40, 6x a los 50, 10x a los 67).
5. Gráficas (Recharts): evolución, comparativas mes a mes / año a año por categoría.
6. FIRE number y años-hasta-FIRE.

**Sprint 3 — Presupuestos y objetivos:**
1. Presupuestos 50/30/20, zero-based, sobres, pay-yourself-first.
2. Alertas de límite (threshold %).
3. Objetivos de ahorro con progreso; plantilla de fondo de emergencia; sinking funds.

**Sprint 4 — Deudas con simuladores:**
1. CRUD de deudas.
2. Simulador avalancha vs bola de nieve (motor mes a mes, ver sección 5).
3. Comparativa: meses hasta libre de deudas e intereses ahorrados por método.

**Sprint 5 — Inversiones con TWR/XIRR:**
1. CRUD de posiciones (holdings) e `investment_transactions`.
2. Integrar precios (Alpha Vantage/Twelve Data), cachear en `price_snapshots`.
3. Cálculo de XIRR (librería) y TWR (a mano).
4. Vista de asignación de activos por clase/sector/geografía/divisa; yield-on-cost.

**Sprint 6 — Importación CSV:**
1. Subida de CSV con `papaparse`.
2. UI de mapeo de columnas (fecha/importe/descripción → campos), previsualización.
3. Detección de duplicados; aplicación de reglas de categorización en la importación.

**Sprint 7 — Pulido UX/UI + seguridad:**
1. Estados de carga, vacíos y error; responsive; modo oscuro.
2. MFA (TOTP) opcional vía Supabase Auth.
3. Revisión de RLS, endurecimiento de auth (confirmación email, longitud mínima de contraseña, chequeo de contraseñas filtradas).
4. Snapshot mensual de patrimonio neto automatizado.

### 5. Fórmulas y lógica de cálculo (con librerías concretas)

**XIRR / MWR** — *usar librería, no reinventar.*
- **JS/TS: `@webcarrot/xirr`** (v3.0.1, nativo TypeScript, 0 dependencias, replica el XIRR de Excel/LibreOffice/Google Sheets, la más recientemente mantenida — última publicación ~1 año) o **`xirr`** de RayDeCampo (v1.1.0, el más descargado con ~37.895 descargas/semana pero JS puro sin tipos y última publicación en noviembre de 2020). Ambos usan Newton-Raphson internamente. `node-irr` (TS nativo, IRR+XIRR, ~16-21k descargas/semana) es un buen sustituto. **Evitar `financejs`** (inactivo, ~9 años sin actualizar, sin XIRR con fechas reales).
- Definición: la tasa `r` que hace VAN=0 de los flujos con fechas reales (convención Actual/365): `Σ CFᵢ / (1+r)^((dᵢ-d₀)/365) = 0`.
- Test de validación: el ejemplo del README de RayDeCampo/nodejs-xirr (compras de -1000, -2500, -1000 y valor final 5050) debe imprimir `0.2504234710540838` (25,04%). Úsalo como test unitario.
- (Si algún día migras cálculo a Python: **pyxirr** v0.10.8, en Rust, ~10-20× más rápido que las implementaciones basadas en scipy, con convenciones de day-count. Pero para Fase 0, quédate en JS.)

**TWR (Time-Weighted Return)** — *hay que codificarlo a mano; ninguna librería JS mainstream lo trae.*
- Dividir el periodo en subperiodos en cada flujo externo (aportación/retirada). Para cada subperiodo: `HPᵢ = (V_fin − V_ini − flujo) / V_ini` (usando la valoración inmediatamente antes del flujo). Enlazar geométricamente:
  `TWR = [(1+HP₁) × (1+HP₂) × … × (1+HPₙ)] − 1`
- Requiere `price_snapshots` para valorar el portfolio en cada punto. Es el estándar GIPS y separa la habilidad de inversión del timing de aportaciones. Anualización opcional: `(1+TWR)^(1/años) − 1`.

**FIRE Number:** `FIRE = gastos_anuales × 25` (regla del 4%, Trinity Study). Para horizontes largos (40-60 años) usar 3-3,5% → ×28,5 a ×33,3. Ofrecer el multiplicador como parámetro. (Morningstar situó en 2025 la tasa base a 30 años en ~3,9%.)

**Años hasta FIRE:** derivar de la tasa de ahorro (50% → ~17 años; 70% → ~8,5 años). Fórmula: resolver `n` en `FV_objetivo = aportación_anual × [((1+r)^n − 1)/r] + patrimonio_actual × (1+r)^n`, iterando o despejando.

**Savings rate:** `ahorro_mensual / ingresos × 100` (benchmark 15-20%).

**DTI:** `pagos_mensuales_deuda / ingresos_brutos_mensuales × 100` (benchmark <36%). Ratio vivienda `<28%`.

**Fondo de emergencia (meses):** `efectivo_y_equivalentes / gastos_esenciales_mensuales` (benchmark 3-6).

**Proyección de patrimonio (interés compuesto):** `FV = PV×(1+r)^n + PMT×[((1+r)^n − 1)/r]`.

**Simuladores de deuda (avalancha/bola de nieve)** — *motor de simulación mes a mes:*
- Interés mensual por deuda: `interés = saldo × (TIN_anual/12)`; `nuevo_saldo = saldo + interés − pago`.
- **Avalancha:** ordenar deudas por TIN descendente (óptimo matemáticamente). **Bola de nieve:** ordenar por saldo ascendente (más motivador).
- **Cascada (rollover):** al liquidar una deuda, su cuota mínima se suma al "extra" que se aplica a la siguiente. Este efecto acelera el pago.
- Chequear amortización negativa: si el pago no cubre el interés, avisar.
- Simular ambos métodos y comparar meses totales e intereses pagados. Para amortización básica de un préstamo existe `financejs`, pero **el motor de rollover conviene codificarlo a medida** (es un bucle mes-a-mes simple, ideal para que Claude Code lo genere con tests).

### 6. Seguridad y privacidad mínima viable (RGPD básico)

- **Autenticación:** delegar 100% en **Supabase Auth**. No implementar hashing/sesiones a mano. Activar confirmación de email, longitud mínima de contraseña (≥12), y el chequeo de contraseñas filtradas (HaveIBeenPwned) que Supabase ofrece. Sesiones más cortas al ser app financiera (el JWT por defecto expira en 1 h).
- **Autorización:** **RLS activada en TODAS las tablas** con `user_id = auth.uid()`. Es el mecanismo que hace seguro el acceso directo desde el cliente: sin RLS, cualquiera con la anon key (que es pública en el frontend) lee toda la BD. Al activar RLS sin políticas, la tabla queda en deny-all (seguro por defecto) — hay que añadir políticas explícitas. Añadir `ENABLE ROW LEVEL SECURITY` a cada migración `CREATE TABLE`.
- **Gestión de secretos:** claves en variables de entorno (`.env.local`, en Vercel como env vars). **NUNCA** commitear secretos ni exponer la `service_role` key en el cliente (solo la `anon` key va al frontend). Añadir `.env*` al `.gitignore`.
- **Cifrado:** TLS en tránsito lo dan Vercel/Supabase por defecto; cifrado en reposo (AES-256) lo aporta Postgres/Supabase. No hace falta implementar cifrado a mano en Fase 0.
- **MFA:** TOTP opcional vía Supabase Auth (Sprint 7).
- **RGPD by design:** minimización de datos (no pedir más de lo necesario), consentimiento explícito, y funciones de exportación/borrado de datos del usuario (derecho de portabilidad y al olvido). Aunque sea proyecto personal, implementar "exportar mis datos" (JSON/CSV) y "borrar mi cuenta" es fácil y te alinea con RGPD. **No se necesita licencia AISP** mientras no haya agregación bancaria (Fase 0 es entrada manual + CSV).

### 7. Cómo trabajar eficientemente con Claude Code (perfil vibecoder)

- **Empieza cada feature en "plan mode":** pide a Claude que primero proponga un plan antes de escribir código. Revisa el plan (aunque no domines el código, sí puedes juzgar el enfoque). Luego que lo implemente.
- **Un commit por unidad de trabajo pequeña y funcional.** Git es tu red de seguridad: si una sesión de vibecoding rompe algo, `git revert`. Usa ramas por feature (`feature/debts-simulator`).
- **Testing incremental sobre lo crítico:** no busques 100% de cobertura, pero **exige tests para `lib/finance/`** (TWR, XIRR, simuladores, FIRE). Son funciones puras con resultados conocidos → fáciles de verificar y te protegen de cálculos mal hechos, que en una app financiera es el peor fallo.
- **Prompts efectivos:** específicos y con contexto. Mal: "haz los presupuestos". Bien: "implementa el CRUD de budget_lines para el método 50/30/20, usando el esquema de prisma/schema.prisma, componentes shadcn, y añade un test que verifique que la suma de allocated no supera total_income". Cuando algo sale bien, fíjate en qué prompt lo logró.
- **Mantén CLAUDE.md vivo:** cada vez que corrijas a Claude sobre una convención, añádela al CLAUDE.md para que no repita el error (gobernanza, no crecimiento: mantenlo corto y revisable).
- **Evitar la deuda técnica típica del vibecoding:**
  1. **No aceptes código que no entiendes mínimamente** — pide a Claude que te explique qué hace antes de aceptar.
  2. **Revisa las migraciones de BD** antes de aplicarlas (un cambio de esquema mal hecho es costoso de revertir con datos).
  3. **Consistencia arquitectónica:** recuérdale seguir la estructura por features; si empieza a dispersar lógica, refactoriza pronto.
  4. **Sesiones acotadas por fase:** limpia el contexto entre features grandes para evitar "memory drift".
  5. **No dejes secretos ni claves hardcodeadas** — regla explícita en CLAUDE.md.

### 8. Verificación de datos del informe a septiembre 2026

- **GoCardless Bank Account Data (ex-Nordigen): CERRADO a nuevos clientes desde julio de 2025.** La propia página de GoCardless muestra "New signups for Bank Account Data are currently disabled", y la documentación de Actual Budget confirma: "From July 2025 onwards, GoCardless has stopped accepting new Bank Account Data accounts... if you are an existing user, your account should continue to work." **Implicación:** para la futura Fase 2, el reemplazo self-serve en Europa es **Enable Banking** — su doc oficial indica que con aplicaciones restringidas "you can only fetch data from accounts linked to the application. The application will stay in this state until an agreement has been signed", y la producción completa requiere contrato firmado + proceso KYB. Alternativas: Tink (Visa), Yapily, Salt Edge. GoCardless, además, es ahora parte de Mollie. Esto **refuerza la estrategia del informe** de posponer open banking y usar un proveedor AISP como paraguas.
- **Tiers gratuitos de hosting (sep 2026):** confirmados arriba. Resumen: Vercel Hobby $0 (100 GB transfer, 200 proyectos, no comercial); Supabase Free $0 (500 MB BD, pausa a 7 días); Neon Free $0 (0.5 GB, uso comercial permitido); Railway sin free permanente ($5/mes Hobby); Render con free real (servicios duermen a 15 min).
- **Librerías de cálculo financiero (2025-2026):**
  - **XIRR JS:** `@webcarrot/xirr` v3.0.1 (nativo TS, mantenido), `xirr` v1.1.0 (RayDeCampo, ~37.895 descargas/semana pero última publicación noviembre 2020), `node-irr` v2.0.5 (TS, IRR+XIRR). `financejs` desaconsejado (inactivo, ~9 años sin actualizar, sin XIRR con fechas reales).
  - **XIRR Python:** `pyxirr` v0.10.8 (Rust, muy rápido, mantenido activamente).
  - **TWR:** no existe librería JS mainstream — codificar a mano (enlace geométrico).
  - **CSV:** `papaparse` v5.7.0 (~12-14M descargas/semana, sigue siendo el estándar en browser; instalar `@types/papaparse` aparte) o `csv-parse` (más resiliente en servidor, ~5,6M/semana). `csv-parser` está **deprecado** — evitar.
  - **FX:** `Frankfurter` (gratis, sin API key, sin límites, datos del BCE desde 1999; endpoint `api.frankfurter.dev`).
  - **Precios de activos:** Alpha Vantage (free tier de 25 requests/día, premium más barato $49,99/mes con 75 req/min), Twelve Data (800 calls/día), Finnhub (60/min). Todos end-of-day o con retardo — suficiente para un portfolio personal.

## Recommendations

**Empieza ya con lo mínimo y despliega desde el día 1:**
1. **Fase inicial:** Sprint 0 completo (stack montado, auth funcionando, desplegado en Vercel, keep-alive de Supabase configurado). No pases de aquí hasta que login + una tabla con RLS funcionen en producción.
2. **Siguientes sprints en orden estricto (1→7).** No saltes al módulo de inversiones (el más complejo) antes de dominar el CRUD y el dashboard. Cada sprint debe quedar desplegado y usable por ti mismo con datos reales.
3. **Invierte desde el principio en el CLAUDE.md y en tests de `lib/finance/`.** Es lo que separa un vibecoding sostenible de uno que colapsa.

**Umbrales que cambian las decisiones:**
- Si superas **500 MB de BD** o te molesta la pausa de 7 días → Supabase Pro ($25/mes) o migrar la BD a Neon.
- Si el proyecto pasa a **uso comercial** (cobras a alguien) → obligatorio Vercel Pro ($20/mes); revisa también licencias de datos de mercado.
- Si quieres **open banking (Fase 2)** → integra Enable Banking como AISP paraguas; NO obtengas licencia propia. GoCardless ya no es opción para nuevos.
- Si los cálculos financieros en JS se quedan cortos → añade una Supabase Edge Function o microservicio Python con `pyxirr`, pero solo entonces.

**Herramientas concretas a instalar en Sprint 0:** `next`, `typescript`, `tailwindcss`, `shadcn` (skill oficial en Claude Code), `@supabase/ssr`, `prisma` (o `drizzle-orm`), `@webcarrot/xirr`, `papaparse` + `@types/papaparse`, `recharts`, `vitest`, y la skill de shadcn/ui para Claude Code.

## Caveats

- **Precios y tiers gratuitos cambian con frecuencia.** Las cifras (Vercel, Supabase, Neon, Railway, Render) están verificadas a fecha de agosto-septiembre 2026 en fuentes secundarias y en las páginas/documentación oficiales cuando fue posible; confirma siempre en las páginas oficiales antes de arquitectar en torno a un límite concreto. Supabase, en particular, ya endureció su política de pausa el 1 de febrero de 2026.
- **La pausa de Supabase Free es el mayor riesgo operativo del stack:** el keep-alive por GitHub Actions funciona (un `SELECT` autenticado cada 2-3 días con la service role key), pero las Actions programadas se desactivan tras ~60 días sin actividad en el repo, y **pg_cron NO sirve como keep-alive** (se para junto con la BD y no reanuda al despausar; se necesita un pinger externo). Haz que el job falle ruidosamente si el ping no devuelve 200, y revísalo de vez en cuando.
- **Las librerías XIRR de JS más descargadas están algo desactualizadas** (`xirr` última publicación noviembre 2020); `@webcarrot/xirr` es la más reciente. Ninguna trae TWR. Verifica los cálculos con tests contra valores conocidos (Excel/Google Sheets) — en una app financiera, un cálculo silenciosamente erróneo es el peor de los bugs.
- **Datos de mercado gratuitos tienen límites duros** (Alpha Vantage 25 req/día, Twelve Data 800/día, Finnhub 60/min) y suelen ser end-of-day o con retardo. Para un portfolio personal actualizado una vez al día es suficiente; cachea agresivamente en `price_snapshots`.
- **Vercel Hobby prohíbe el uso comercial.** Mientras sea un proyecto personal de aprendizaje, perfecto; en cuanto monetices, migra a Pro.
- Este plan es una hoja de ruta técnica; el ritmo real dependerá del tiempo variable disponible. La disciplina de git + tests + CLAUDE.md es lo que permite pausar y retomar sin perder coherencia — clave para un estudiante a tiempo parcial.