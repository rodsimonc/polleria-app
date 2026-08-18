// Promotion: 10% discount when the subtotal reaches the threshold.
// The calculation lives on the server (source of truth); the front end only previews it.

export const PROMO = {
  threshold: 15000, // $ from which it applies
  rate: 0.10,       // 10%
  description: '10% off on orders of $15,000 or more',
};

const round2 = (n) => Math.round(n * 100) / 100;

export function computeTotals(subtotal) {
  const applies = subtotal >= PROMO.threshold;
  const discount = applies ? round2(subtotal * PROMO.rate) : 0;
  const total = round2(subtotal - discount);
  return { subtotal: round2(subtotal), discount, total, promoApplied: applies };
}
