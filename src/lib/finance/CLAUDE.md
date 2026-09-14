Funciones puras de cálculo financiero (XIRR, TWR, FIRE, simuladores de deuda...).

- Sin efectos secundarios: nada de acceso a BD, fetch ni UI aquí.
- Todos los importes son `number` que representan `numeric` de Postgres; nunca asumir float exacto en comparaciones (redondear a 2 decimales al mostrar).
- Flujos de caja de inversión: signo negativo = entra dinero (compra/aportación), signo positivo = sale dinero (venta/retirada/dividendo). Igual que usa `investment_transactions.amount`.
- Cada función exportada aquí debe tener un test en `tests/` con al menos un caso de valor conocido (p.ej. XIRR de ejemplo = 0.2504234710540838).
