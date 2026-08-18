import { db } from '../db/index.js';

const byEmail = db.prepare('SELECT * FROM users WHERE email = ?');
const byId = db.prepare('SELECT * FROM users WHERE id = ?');
const insert = db.prepare(`
  INSERT INTO users (email, password_hash, role, name, phone, address, created_at)
  VALUES (@email, @passwordHash, @role, @name, @phone, @address, @createdAt)
`);
const updateProfile = db.prepare(`UPDATE users SET name=@name, phone=@phone, address=@address WHERE id=@id`);
const countAdmins = db.prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'");

function toPublic(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, role: row.role, name: row.name, phone: row.phone, address: row.address };
}

export const usersRepo = {
  findByEmail(email) {
    const row = byEmail.get(String(email).trim().toLowerCase());
    if (!row) return null;
    return { ...toPublic(row), passwordHash: row.password_hash };
  },
  findById(id) { return toPublic(byId.get(Number(id))); },
  create({ email, passwordHash, role = 'customer', name = '', phone = '', address = '' }) {
    const info = insert.run({
      email: String(email).trim().toLowerCase(), passwordHash, role,
      name, phone, address, createdAt: new Date().toISOString(),
    });
    return toPublic(byId.get(info.lastInsertRowid));
  },
  updateProfile(id, { name, phone, address }) {
    updateProfile.run({ id: Number(id), name: name || '', phone: phone || '', address: address || '' });
    return this.findById(id);
  },
  countAdmins() { return countAdmins.get().n; },
};
