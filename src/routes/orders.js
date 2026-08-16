// Pedidos (shipping orders):
//  - POST /orders            : un cliente crea un pedido (items + dirección de envío).
//  - GET  /orders            : admin ve todos; cliente ve los suyos.
//  - GET  /orders/:id        : el dueño del pedido o un admin.
//  - PATCH /orders/:id/status: admin cambia el estado de envío.

import { Router } from 'express';
import { ordersRepo } from '../repositories/orders.repo.js';
import { productsRepo } from '../repositories/products.repo.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ProblemError } from '../middleware/problem.js';
import { PROMO, computeTotals } from '../services/promo.js';

const router = Router();
const STATUSES = ['pendiente', 'confirmado', 'en_camino', 'entregado', 'cancelado'];

// Info de la promoción vigente (pública, para que la tienda la muestre).
router.get('/promo', (_req, res) => res.json({ data: PROMO }));

// Crear pedido (cliente autenticado).
router.post('/', requireAuth, (req, res, next) => {
  const { items, shippingAddress, contactPhone, notes } = req.body || {};
  const errors = [];
  if (!Array.isArray(items) || items.length === 0) errors.push({ field: 'items', message: 'agregá al menos un producto' });
  if (!shippingAddress || !String(shippingAddress).trim()) errors.push({ field: 'shippingAddress', message: 'la dirección de envío es requerida' });

  // Recalcular precios y subtotales en el servidor (nunca confiar en el cliente).
  const lineItems = [];
  if (Array.isArray(items)) {
    for (const [i, it] of items.entries()) {
      const product = productsRepo.findById(it.productId);
      const qty = Number(it.qty);
      if (!product) { errors.push({ field: `items[${i}].productId`, message: 'producto inexistente' }); continue; }
      if (!product.available) { errors.push({ field: `items[${i}]`, message: `${product.name} no está disponible` }); continue; }
      if (Number.isNaN(qty) || qty <= 0) { errors.push({ field: `items[${i}].qty`, message: 'cantidad inválida' }); continue; }
      const subtotal = Math.round(product.price * qty * 100) / 100;
      lineItems.push({ productId: product.id, name: product.name, unit: product.unit, unitPrice: product.price, qty, subtotal });
    }
  }
  if (errors.length) return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'No se pudo crear el pedido.', extensions: { errors } }));

  // Subtotal y promo calculados en el servidor (fuente de verdad).
  const rawSubtotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
  const { subtotal, discount, total } = computeTotals(rawSubtotal);
  const order = ordersRepo.create({
    userId: req.user.id, items: lineItems, subtotal, discount, total,
    shippingAddress: String(shippingAddress).trim(), contactPhone: contactPhone || '', notes: notes || '',
  });
  res.status(201).location(`/api/v1/orders/${order.id}`).json({ data: order });
});

// Listado: admin todos, cliente los suyos.
router.get('/', requireAuth, (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const offset = (page - 1) * pageSize;
  const isAdmin = req.user.role === 'admin';
  const data = isAdmin
    ? ordersRepo.findAll({ limit: pageSize, offset })
    : ordersRepo.findByUser(req.user.id, { limit: pageSize, offset });
  const total = isAdmin ? ordersRepo.countAll() : ordersRepo.countByUser(req.user.id);
  res.json({ data, meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } });
});

router.get('/:id', requireAuth, (req, res, next) => {
  const order = ordersRepo.findById(req.params.id);
  if (!order) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'Pedido no encontrado.' }));
  if (req.user.role !== 'admin' && String(order.userId) !== String(req.user.id)) {
    return next(new ProblemError({ status: 403, title: 'Forbidden', detail: 'No podés ver este pedido.' }));
  }
  res.json({ data: order });
});

// Cambiar estado de envío (solo admin).
router.patch('/:id/status', requireAuth, requireRole('admin'), (req, res, next) => {
  const order = ordersRepo.findById(req.params.id);
  if (!order) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'Pedido no encontrado.' }));
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: `Estado inválido. Válidos: ${STATUSES.join(', ')}.`, extensions: { errors: [{ field: 'status', message: 'inválido' }] } }));
  }
  res.json({ data: ordersRepo.setStatus(req.params.id, status) });
});

export default router;
