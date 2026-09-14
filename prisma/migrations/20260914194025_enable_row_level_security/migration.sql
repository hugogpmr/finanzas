-- Row Level Security: sin esto, la anon key (publica en el frontend) podria leer/escribir
-- toda la base de datos. Cada tabla queda en "deny-all" salvo las policies de abajo.

-- Tablas con user_id directo: el propietario puede hacer de todo con sus propias filas.
alter table "accounts" enable row level security;
create policy "accounts_owner" on "accounts"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "categories" enable row level security;
create policy "categories_owner" on "categories"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "tags" enable row level security;
create policy "tags_owner" on "tags"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "transactions" enable row level security;
create policy "transactions_owner" on "transactions"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "categorization_rules" enable row level security;
create policy "categorization_rules_owner" on "categorization_rules"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "budgets" enable row level security;
create policy "budgets_owner" on "budgets"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "goals" enable row level security;
create policy "goals_owner" on "goals"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "debts" enable row level security;
create policy "debts_owner" on "debts"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "holdings" enable row level security;
create policy "holdings_owner" on "holdings"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "investment_transactions" enable row level security;
create policy "investment_transactions_owner" on "investment_transactions"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table "net_worth_snapshots" enable row level security;
create policy "net_worth_snapshots_owner" on "net_worth_snapshots"
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tablas sin user_id propio: heredan el ownership del padre via EXISTS.
alter table "transaction_splits" enable row level security;
create policy "transaction_splits_owner" on "transaction_splits"
  for all using (
    exists (
      select 1 from "transactions" t
      where t.id = "transaction_splits".transaction_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "transactions" t
      where t.id = "transaction_splits".transaction_id and t.user_id = auth.uid()
    )
  );

alter table "transaction_tags" enable row level security;
create policy "transaction_tags_owner" on "transaction_tags"
  for all using (
    exists (
      select 1 from "transactions" t
      where t.id = "transaction_tags".transaction_id and t.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "transactions" t
      where t.id = "transaction_tags".transaction_id and t.user_id = auth.uid()
    )
  );

alter table "budget_lines" enable row level security;
create policy "budget_lines_owner" on "budget_lines"
  for all using (
    exists (
      select 1 from "budgets" b
      where b.id = "budget_lines".budget_id and b.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "budgets" b
      where b.id = "budget_lines".budget_id and b.user_id = auth.uid()
    )
  );

alter table "debt_payments" enable row level security;
create policy "debt_payments_owner" on "debt_payments"
  for all using (
    exists (
      select 1 from "debts" d
      where d.id = "debt_payments".debt_id and d.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "debts" d
      where d.id = "debt_payments".debt_id and d.user_id = auth.uid()
    )
  );

alter table "price_snapshots" enable row level security;
create policy "price_snapshots_owner" on "price_snapshots"
  for all using (
    exists (
      select 1 from "holdings" h
      where h.id = "price_snapshots".holding_id and h.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from "holdings" h
      where h.id = "price_snapshots".holding_id and h.user_id = auth.uid()
    )
  );

-- fx_rates: cache de tipos de cambio, no es dato de usuario. Lectura para cualquier
-- usuario autenticado; solo el backend (service_role, que salta RLS) puede escribir.
alter table "fx_rates" enable row level security;
create policy "fx_rates_read_authenticated" on "fx_rates"
  for select using (auth.role() = 'authenticated');
