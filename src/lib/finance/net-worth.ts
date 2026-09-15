// Agregación de patrimonio neto a partir de las cuentas de un usuario, ya
// convertidas a EUR. Extraído de src/features/dashboard/queries.ts (Sprint 2)
// para poder reutilizarlo también en el snapshot mensual automatizado
// (Sprint 7, src/app/api/snapshot-net-worth/route.ts) sin duplicar la lógica.
//
// Convención: `current_balance` de una cuenta `liability` es positivo (el
// importe que se debe), por eso el patrimonio neto resta directamente la
// suma de pasivos sin cambiarle el signo.
const LIQUID_ACCOUNT_TYPES = new Set(["checking", "savings", "cash"]);

export type AccountForNetWorth = {
  type: string;
  account_class: "asset" | "liability";
  currency: string;
  current_balance: number;
};

export type NetWorthBreakdown = {
  totalAssetsEur: number;
  totalLiabilitiesEur: number;
  liquidAssetsEur: number;
  netWorthEur: number;
  liquidNetWorthEur: number;
  byType: Record<string, number>;
};

export function aggregateNetWorth(
  accounts: AccountForNetWorth[],
  eurRateByCurrency: Map<string, number>,
): NetWorthBreakdown {
  let totalAssetsEur = 0;
  let totalLiabilitiesEur = 0;
  let liquidAssetsEur = 0;
  const byType: Record<string, number> = {};

  for (const account of accounts) {
    const rate = eurRateByCurrency.get(account.currency) ?? 1;
    const balanceEur = account.current_balance * rate;

    byType[account.type] = (byType[account.type] ?? 0) + balanceEur;

    if (account.account_class === "asset") {
      totalAssetsEur += balanceEur;
      if (LIQUID_ACCOUNT_TYPES.has(account.type)) liquidAssetsEur += balanceEur;
    } else {
      totalLiabilitiesEur += balanceEur;
    }
  }

  return {
    totalAssetsEur,
    totalLiabilitiesEur,
    liquidAssetsEur,
    netWorthEur: totalAssetsEur - totalLiabilitiesEur,
    liquidNetWorthEur: liquidAssetsEur - totalLiabilitiesEur,
    byType,
  };
}
