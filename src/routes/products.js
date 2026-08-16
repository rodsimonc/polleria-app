// Productos: catálogo público (disponibles) y ABM para el admin (editar precios, etc.).
import { Router } from 'express';
import { productsRepo } from '../repositories/products.repo.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { ProblemError } from '../middleware/problem.js';

const router = Router();
const UNITS = ['kg', 'unidad', 'docena'];

function slugify(text) {
  return String(text).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function validate(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) errors.push({ field: 'name', message: 'requerido' });
  }
  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (Number.isNaN(price) || price < 0) errors.push({ field: 'price', message: 'debe ser un número mayor o igual a 0' });
  }
  if (body.unit !== undefined && !UNITS.includes(body.unit)) {
    errors.push({ field: 'unit', message: `debe ser uno de: ${UNITS.join(', ')}` });
  }
  if (body.image !== undefined && typeof body.image === 'string' && body.image.length > 2_000_000) {
    errors.push({ field: 'image', message: 'la imagen es demasiado grande' });
  }
  return errors;
}

function findOr404(id) {
  const p = productsRepo.findById(id);
  if (!p) throw new ProblemError({ status: 404, title: 'Not Found', detail: `No existe el producto ${id}.` });
  return p;
}

// GET /products : público ve disponibles; admin ve todos.
router.get('/', optionalAuth, (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  let items = productsRepo.findAll();
  if (!isAdmin) items = items.filter((p) => p.available);
  res.json({ data: items, meta: { total: items.length } });
});

router.get('/:id', (req, res, next) => {
  try { res.json({ data: findOr404(req.params.id) }); } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('admin'), (req, res, next) => {
  const body = req.body || {};
  const errors = validate(body);
  if (errors.length) return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Producto inválido.', extensions: { errors } }));
  const product = productsRepo.create({
    slug: slugify(body.name), name: body.name.trim(), unit: body.unit || 'kg',
    price: Number(body.price) || 0, description: body.description?.trim() || '',
    image: typeof body.image === 'string' ? body.image : '',
    available: body.available === undefined ? true : Boolean(body.available),
  });
  res.status(201).location(`/api/v1/products/${product.id}`).json({ data: product });
});

router.put('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    findOr404(req.params.id);
    const body = req.body || {};
    const errors = validate(body);
    if (errors.length) return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Producto inválido.', extensions: { errors } }));
    const product = productsRepo.update(req.params.id, {
      slug: slugify(body.name), name: body.name.trim(), unit: body.unit || 'kg',
      price: Number(body.price) || 0, description: body.description?.trim() || '',
      image: typeof body.image === 'string' ? body.image : '',
      available: body.available === undefined ? true : Boolean(body.available),
    });
    res.json({ data: product });
  } catch (e) { next(e); }
});

// PATCH: útil para cambiar solo el precio, la disponibilidad o la foto.
router.patch('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try {
    const current = findOr404(req.params.id);
    const body = req.body || {};
    const errors = validate(body, { partial: true });
    if (errors.length) return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Producto inválido.', extensions: { errors } }));
    const merged = { ...current };
    for (const f of ['name', 'unit', 'price', 'description', 'image', 'available']) if (body[f] !== undefined) merged[f] = body[f];
    if (body.name !== undefined) merged.slug = slugify(body.name);
    const product = productsRepo.update(req.params.id, merged);
    res.json({ data: product });
  } catch (e) { next(e); }
});

router.delete('/:id', requireAuth, requireRole('admin'), (req, res, next) => {
  try { findOr404(req.params.id); productsRepo.remove(req.params.id); res.status(204).end(); }
  catch (e) { next(e); }
});

export default router;
