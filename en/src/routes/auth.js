// Poultry shop auth:
//  - GET  /auth/setup-status  : is the owner (admin) account still missing?
//  - POST /auth/register-admin : creates the FIRST admin (only if no admin exists).
//  - POST /auth/register       : OPEN customer registration (role customer).
//  - POST /auth/login          : login for admin and customers.
//  - GET  /auth/me             : logged-in user's data.
//  - PUT  /auth/me             : update profile (name, phone, address).

import { Router } from 'express';
import { signAccessToken, requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { ProblemError } from '../middleware/problem.js';
import { usersRepo } from '../repositories/users.repo.js';
import { hashPassword, verifyPassword } from '../services/password.js';

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8 });
const registerLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 8 });
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validateCredentials({ email, password }) {
  const errors = [];
  if (!email || !EMAIL_RE.test(email)) errors.push({ field: 'email', message: 'enter a valid email (e.g. name@mail.com)' });
  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'the password must be at least 8 characters long' });
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'the password must include letters and numbers' });
  }
  return errors;
}

// Name: at least 2 characters and must contain letters (not only numbers/symbols).
function validateName(name) {
  const v = String(name || '').trim();
  if (v.length < 2) return 'enter your first and last name';
  if (!/\p{L}/u.test(v)) return 'the name must contain letters';
  return null;
}

// Phone: digits and the signs + ( ) - and spaces are allowed; between 8 and 15 digits.
function validatePhone(phone) {
  const v = String(phone || '').trim();
  if (!v) return 'enter a contact phone number';
  if (!/^[0-9()+\s-]+$/.test(v)) return 'use only numbers and the signs + ( ) - and spaces';
  const digits = v.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) return 'it must have between 8 and 15 digits (e.g. 11 2233-4455)';
  return null;
}

function issue(res, status, user) {
  const accessToken = signAccessToken(user);
  res.status(status).json({
    accessToken, tokenType: 'Bearer', expiresIn: 7200,
    user: { id: user.id, email: user.email, role: user.role, name: user.name },
  });
}

router.get('/setup-status', (_req, res) => {
  res.json({ needsSetup: usersRepo.countAdmins() === 0 });
});

// First admin (owner). Closed once an admin exists.
router.post('/register-admin', registerLimiter, (req, res, next) => {
  if (usersRepo.countAdmins() > 0) {
    return next(new ProblemError({ status: 403, title: 'Forbidden', detail: 'An administrator account already exists.' }));
  }
  const { email, password, name } = req.body || {};
  const errors = validateCredentials({ email, password });
  if (errors.length) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Invalid data.', extensions: { errors } }));
  }
  try {
    const user = usersRepo.create({ email, passwordHash: hashPassword(password), role: 'admin', name: name || 'Administrator' });
    issue(res, 201, user);
  } catch (e) { next(dupOr(e)); }
});

// Open customer registration.
router.post('/register', registerLimiter, (req, res, next) => {
  const { email, password, name, phone, address } = req.body || {};
  const errors = validateCredentials({ email, password });
  const nameErr = validateName(name);
  if (nameErr) errors.push({ field: 'name', message: nameErr });
  const phoneErr = validatePhone(phone);
  if (phoneErr) errors.push({ field: 'phone', message: phoneErr });
  if (address !== undefined && String(address).trim() && String(address).trim().length < 5) {
    errors.push({ field: 'address', message: 'the address is too short' });
  }
  if (errors.length) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Invalid registration data.', extensions: { errors } }));
  }
  try {
    const user = usersRepo.create({
      email, passwordHash: hashPassword(password), role: 'customer',
      name: name.trim(), phone: phone || '', address: address || '',
    });
    issue(res, 201, user);
  } catch (e) { next(dupOr(e)); }
});

router.post('/login', loginLimiter, (req, res, next) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Email and password are required.' }));
  }
  const user = usersRepo.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return next(new ProblemError({ status: 401, title: 'Unauthorized', detail: 'Invalid credentials.' }));
  }
  issue(res, 200, user);
});

router.get('/me', requireAuth, (req, res, next) => {
  const user = usersRepo.findById(req.user.id);
  if (!user) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'User not found.' }));
  res.json({ data: user });
});

router.put('/me', requireAuth, (req, res) => {
  const { name, phone, address } = req.body || {};
  const user = usersRepo.updateProfile(req.user.id, { name, phone, address });
  res.json({ data: user });
});

function dupOr(e) {
  if (String(e.message).includes('UNIQUE')) {
    return new ProblemError({ status: 409, title: 'Conflict', detail: 'An account with that email already exists.' });
  }
  return e;
}

export default router;
