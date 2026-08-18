// Orders (shipping orders):
//  - POST /orders            : a customer creates an order (items + shipping address).
//  - GET  /orders            : admin sees all; customer sees their own.
//  - GET  /orders/:id        : the order's owner or an admin.
//  - PATCH /orders/:id/status: admin changes the shipping status.

import { Router } from 'express';
import { ordersRepo } from '../repositories/orders.repo.js';
import { productsRepo } from '../repositories/products.repo.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ProblemError } from '../middleware/problem.js';
import { PROMO, computeTotals } from '../services/promo.js';

const router = Router();
const STATUSES = ['pending', 'confirmed', 'in_transit', 'delivered', 'cancelled'];

// Info about the current promotion (public, so the store can show it).
router.get('/promo', (_req, res) => res.json({ data: PROMO }));

// Create order (authenticated customer).
router.post('/', requireAuth, (req, res, next) => {
  const { items, shippingAddress, contactPhone, notes } = req.body || {};
  const errors = [];
  if (!Array.isArray(items) || items.length === 0) errors.push({ field: 'items', message: 'add at least one product' });
  if (!shippingAddress || !String(shippingAddress).trim()) errors.push({ field: 'shippingAddress', message: 'the shipping address is required' });

  // Recalculate prices and subtotals on the server (never trust the client).
  const lineItems = [];
  if (Array.isArray(items)) {
    for (const [i, it] of items.entries()) {
      const product = productsRepo.findById(it.productId);
      const qty = Number(it.qty);
      if (!product) { errors.push({ field: `items[${i}].productId`, message: 'nonexistent product' }); continue; }
      if (!product.available) { errors.push({ field: `items[${i}]`, message: `${product.name} is not available` }); continue; }
      if (Number.isNaN(qty) || qty <= 0) { errors.push({ field: `items[${i}].qty`, message: 'invalid quantity' }); continue; }
      const subtotal = Math.round(product.price * qty * 100) / 100;
      lineItems.push({ productId: product.id, name: product.name, unit: product.unit, unitPrice: product.price, qty, subtotal });
    }
  }
  if (errors.length) return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'The order could not be created.', extensions: { errors } }));

  // Subtotal and promo computed on the server (source of truth).
  const rawSubtotal = lineItems.reduce((s, l) => s + l.subtotal, 0);
  const { subtotal, discount, total } = computeTotals(rawSubtotal);
  const order = ordersRepo.create({
    userId: req.user.id, items: lineItems, subtotal, discount, total,
    shippingAddress: String(shippingAddress).trim(), contactPhone: contactPhone || '', notes: notes || '',
  });
  res.status(201).location(`/api/v1/orders/${order.id}`).json({ data: order });
});

// Listing: admin all, customer their own.
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
  if (!order) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'Order not found.' }));
  if (req.user.role !== 'admin' && String(order.userId) !== String(req.user.id)) {
    return next(new ProblemError({ status: 403, title: 'Forbidden', detail: 'You cannot view this order.' }));
  }
  res.json({ data: order });
});

// Change shipping status (admin only).
router.patch('/:id/status', requireAuth, requireRole('admin'), (req, res, next) => {
  const order = ordersRepo.findById(req.params.id);
  if (!order) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'Order not found.' }));
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: `Invalid status. Valid: ${STATUSES.join(', ')}.`, extensions: { errors: [{ field: 'status', message: 'invalid' }] } }));
  }
  res.json({ data: ordersRepo.setStatus(req.params.id, status) });
});

export default router;
