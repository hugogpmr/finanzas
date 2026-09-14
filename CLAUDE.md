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
- **`service_role` key de Supabase JAMÁS en el cliente ni en el repo.** Solo `anon` key en el frontend. Todo secreto va en `.env.local` (ignorado por git).
- **Arquitectura por features** en `src/features/<feature>/`, no por tipo de archivo. Cada feature agrupa sus componentes, hooks y acciones.
- **Lógica financiera pura y aislada** en `src/lib/finance/` (funciones puras, sin efectos secundarios, sin UI ni acceso a BD). Todo cálculo no trivial (XIRR, TWR, FIRE, simuladores de deuda) lleva test en `tests/` con casos conocidos.
- Next.js 16 tiene cambios respecto a versiones anteriores — consultar `node_modules/next/dist/docs/` antes de asumir una API o convención de versiones previas (ver `AGENTS.md`).

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # eslint
npm test         # vitest (cuando esté configurado)
npx prisma migrate dev   # nueva migración (cuando Prisma esté configurado)
```

## Estado actual

Sprint 0 en progreso: proyecto Next.js creado. Pendiente: cuentas de GitHub/Supabase/Vercel,
esquema Prisma inicial, Supabase Auth, layout base.
