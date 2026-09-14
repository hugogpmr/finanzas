-- `@updatedAt` de Prisma solo actualiza la columna cuando se escribe a traves de
-- Prisma Client. Como insertamos/actualizamos con el cliente de Supabase, la columna
-- no tenia default (insert fallaba) ni se refrescaba sola (update la dejaba stale).
-- Solucion a nivel de base de datos, valida sin importar quien escriba:

alter table "accounts" alter column "updated_at" set default now();

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger accounts_set_updated_at
before update on "accounts"
for each row
execute function set_updated_at();

-- Reutilizar set_updated_at() para cualquier otra tabla con columna updated_at
-- que se añada más adelante: solo hace falta el ALTER COLUMN ... SET DEFAULT now()
-- y un CREATE TRIGGER como el de arriba.
