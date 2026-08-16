import { db } from '../db/index.js';

function toDomain(r) {
  if (!r) return null;
  return {
    id: r.id, slug: r.slug, name: r.name, unit: r.unit,
    price: r.price, description: r.description, image: r.image || '',
    available: !!r.available, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

const all = db.prepare('SELECT * FROM products ORDER BY name');
const byId = db.prepare('SELECT * FROM products WHERE id = ?');
const insert = db.prepare(`
  INSERT INTO products (slug, name, unit, price, description, image, available, created_at, updated_at)
  VALUES (@slug, @name, @unit, @price, @description, @image, @available, @createdAt, @updatedAt)
`);
const update = db.prepare(`
  UPDATE products SET slug=@slug, name=@name, unit=@unit, price=@price,
    description=@description, image=@image, available=@available, updated_at=@updatedAt WHERE id=@id
`);
const del = db.prepare('DELETE FROM products WHERE id = ?');
const count = db.prepare('SELECT COUNT(*) AS n FROM products');

export const productsRepo = {
  findAll() { return all.all().map(toDomain); },
  findById(id) { return toDomain(byId.get(Number(id))); },
  create(p) {
    const now = new Date().toISOString();
    const info = insert.run({
      slug: p.slug, name: p.name, unit: p.unit || 'kg', price: Number(p.price) || 0,
      description: p.description || '', image: p.image || '', available: p.available ? 1 : 0, createdAt: now, updatedAt: now,
    });
    return this.findById(info.lastInsertRowid);
  },
  update(id, p) {
    update.run({
      id: Number(id), slug: p.slug, name: p.name, unit: p.unit || 'kg', price: Number(p.price) || 0,
      description: p.description || '', image: p.image || '', available: p.available ? 1 : 0, updatedAt: new Date().toISOString(),
    });
    return this.findById(id);
  },
  remove(id) { return del.run(Number(id)).changes > 0; },
  count() { return count.get().n; },
};
