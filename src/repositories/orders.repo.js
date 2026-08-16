import { db } from '../db/index.js';

function toDomain(r) {
  if (!r) return null;
  return {
    id: r.id, userId: r.user_id, items: JSON.parse(r.items || '[]'),
    subtotal: r.subtotal, discount: r.discount, total: r.total,
    promoApplied: r.discount > 0,
    status: r.status, shippingAddress: r.shipping_address, contactPhone: r.contact_phone,
    notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const insert = db.prepare(`
  INSERT INTO orders (user_id, items, subtotal, discount, total, status, shipping_address, contact_phone, notes, created_at, updated_at)
  VALUES (@userId, @items, @subtotal, @discount, @total, 'pendiente', @shippingAddress, @contactPhone, @notes, @createdAt, @createdAt)
`);
const byId = db.prepare('SELECT * FROM orders WHERE id = ?');
const allPage = db.prepare('SELECT * FROM orders ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?');
const byUser = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC LIMIT ? OFFSET ?');
const setStatus = db.prepare('UPDATE orders SET status=@status, updated_at=@updatedAt WHERE id=@id');
const countAll = db.prepare('SELECT COUNT(*) AS n FROM orders');
const countUser = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?');

export const ordersRepo = {
  create(o) {
    const now = new Date().toISOString();
    const info = insert.run({
      userId: o.userId, items: JSON.stringify(o.items),
      subtotal: o.subtotal, discount: o.discount, total: o.total,
      shippingAddress: o.shippingAddress, contactPhone: o.contactPhone || '', notes: o.notes || '', createdAt: now,
    });
    return toDomain(byId.get(info.lastInsertRowid));
  },
  findById(id) { return toDomain(byId.get(Number(id))); },
  findAll({ limit, offset }) { return allPage.all(limit, offset).map(toDomain); },
  findByUser(userId, { limit, offset }) { return byUser.all(Number(userId), limit, offset).map(toDomain); },
  setStatus(id, status) {
    setStatus.run({ id: Number(id), status, updatedAt: new Date().toISOString() });
    return this.findById(id);
  },
  countAll() { return countAll.get().n; },
  countByUser(userId) { return countUser.get(Number(userId)).n; },
};
