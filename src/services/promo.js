// Promoción: 10% de descuento cuando el subtotal alcanza el umbral.
// El cálculo vive en el servidor (fuente de verdad); el front solo lo previsualiza.

export const PROMO = {
  threshold: 15000, // $ a partir de los cuales aplica
  rate: 0.10,       // 10%
  description: '10% de descuento en pedidos de $15.000 o más',
};

const round2 = (n) => Math.round(n * 100) / 100;

export function computeTotals(subtotal) {
  const applies = subtotal >= PROMO.threshold;
  const discount = applies ? round2(subtotal * PROMO.rate) : 0;
  const total = round2(subtotal - discount);
  return { subtotal: round2(subtotal), discount, total, promoApplied: applies };
}
