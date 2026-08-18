// Shop data: public read, admin-only edit.
import { Router } from 'express';
import { shopRepo } from '../repositories/shop.repo.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: shopRepo.get() });
});

router.put('/', requireAuth, requireRole('admin'), (req, res) => {
  const b = req.body || {};
  const saved = shopRepo.save({
    name: b.name, address: b.address, phone: b.phone,
    email: b.email, whatsapp: String(b.whatsapp || '').replace(/[^0-9]/g, ''), hours: b.hours, notes: b.notes,
  });
  res.json({ data: saved });
});

export default router;
