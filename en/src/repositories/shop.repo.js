import { db } from '../db/index.js';

const get = db.prepare('SELECT * FROM shop WHERE id = 1');
const upsert = db.prepare(`
  INSERT INTO shop (id, name, address, phone, email, whatsapp, hours, notes)
  VALUES (1, @name, @address, @phone, @email, @whatsapp, @hours, @notes)
  ON CONFLICT(id) DO UPDATE SET
    name=@name, address=@address, phone=@phone, email=@email, whatsapp=@whatsapp, hours=@hours, notes=@notes
`);

function toDomain(r) {
  if (!r) return null;
  return { name: r.name, address: r.address, phone: r.phone, email: r.email, whatsapp: r.whatsapp, hours: r.hours, notes: r.notes };
}

export const shopRepo = {
  get() { return toDomain(get.get()); },
  save(s) {
    upsert.run({
      name: s.name || '', address: s.address || '', phone: s.phone || '',
      email: s.email || '', whatsapp: s.whatsapp || '', hours: s.hours || '', notes: s.notes || '',
    });
    return this.get();
  },
  exists() { return !!get.get(); },
};
