// transaction_splits no guarda su propio amount_eur ni fx_rate (ver
// prisma/schema.prisma): solo la transacción padre los tiene. Para atribuir
// el importe en EUR de cada división se prorratea con el mismo tipo de
// cambio que ya se aplicó a la transacción completa (amount_eur / amount).
// Usado tanto por el dashboard (src/features/dashboard/queries.ts) como por
// presupuestos (src/features/budgets/queries.ts): cualquier cambio aquí
// afecta a ambos.
export type TransactionForAttribution = {
  amount: string | number;
  amount_eur: string | number;
  category_id: string | null;
  is_split: boolean;
  splits: { category_id: string | null; amount: string | number }[] | null;
};

export type AttributedPart = { categoryId: string | null; amountEur: number };

// Devuelve el importe en EUR (siempre positivo) de cada división, o una única
// parte con la categoría de la transacción si no está dividida.
export function attributeTransactionParts(tx: TransactionForAttribution): AttributedPart[] {
  const amount = Number(tx.amount);
  const amountEur = Number(tx.amount_eur);
  const fxRatio = amount !== 0 ? amountEur / amount : 0;

  if (tx.is_split && tx.splits && tx.splits.length > 0) {
    return tx.splits.map((s) => ({
      categoryId: s.category_id,
      amountEur: Math.abs(Number(s.amount) * fxRatio),
    }));
  }

  return [{ categoryId: tx.category_id, amountEur: Math.abs(amountEur) }];
}
