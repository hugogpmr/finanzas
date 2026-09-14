-- `@default(uuid())` de Prisma solo genera el id cuando se inserta a traves de Prisma
-- Client. Como las queries de la app van por el cliente de Supabase (ver CLAUDE.md),
-- la base de datos nunca rellenaba `id` y el insert fallaba con "null value in column id".
-- Ahora es Postgres quien genera el uuid por defecto, sin importar quien inserte.

alter table "accounts" alter column "id" set default gen_random_uuid();
alter table "categories" alter column "id" set default gen_random_uuid();
alter table "tags" alter column "id" set default gen_random_uuid();
alter table "transactions" alter column "id" set default gen_random_uuid();
alter table "transaction_splits" alter column "id" set default gen_random_uuid();
alter table "categorization_rules" alter column "id" set default gen_random_uuid();
alter table "budgets" alter column "id" set default gen_random_uuid();
alter table "budget_lines" alter column "id" set default gen_random_uuid();
alter table "goals" alter column "id" set default gen_random_uuid();
alter table "debts" alter column "id" set default gen_random_uuid();
alter table "debt_payments" alter column "id" set default gen_random_uuid();
alter table "holdings" alter column "id" set default gen_random_uuid();
alter table "investment_transactions" alter column "id" set default gen_random_uuid();
alter table "price_snapshots" alter column "id" set default gen_random_uuid();
alter table "net_worth_snapshots" alter column "id" set default gen_random_uuid();
alter table "fx_rates" alter column "id" set default gen_random_uuid();
