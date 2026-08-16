// Auth de la pollería:
//  - GET  /auth/setup-status  : ¿falta crear la cuenta del dueño (admin)?
//  - POST /auth/register-admin : crea el PRIMER admin (solo si no hay admin).
//  - POST /auth/register       : registro ABIERTO de clientes (role customer).
//  - POST /auth/login          : login para admin y clientes.
//  - GET  /auth/me             : datos del usuario logueado.
//  - PUT  /auth/me             : actualizar perfil (nombre, teléfono, dirección).

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
  if (!email || !EMAIL_RE.test(email)) errors.push({ field: 'email', message: 'ingresá un email válido (ej: nombre@mail.com)' });
  if (!password || password.length < 8) {
    errors.push({ field: 'password', message: 'la contraseña debe tener al menos 8 caracteres' });
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.push({ field: 'password', message: 'la contraseña debe incluir letras y números' });
  }
  return errors;
}

// Nombre: al menos 2 caracteres y que contenga letras (no solo números/símbolos).
function validateName(name) {
  const v = String(name || '').trim();
  if (v.length < 2) return 'ingresá tu nombre y apellido';
  if (!/\p{L}/u.test(v)) return 'el nombre debe contener letras';
  return null;
}

// Teléfono: se permiten dígitos y los signos + ( ) - y espacios; entre 8 y 15 dígitos.
function validatePhone(phone) {
  const v = String(phone || '').trim();
  if (!v) return 'ingresá un teléfono de contacto';
  if (!/^[0-9()+\s-]+$/.test(v)) return 'usá solo números y los signos + ( ) - y espacios';
  const digits = v.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) return 'debe tener entre 8 y 15 dígitos (ej: 11 2233-4455)';
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

// Primer admin (dueño). Cerrado una vez que existe un admin.
router.post('/register-admin', registerLimiter, (req, res, next) => {
  if (usersRepo.countAdmins() > 0) {
    return next(new ProblemError({ status: 403, title: 'Forbidden', detail: 'Ya existe una cuenta de administrador.' }));
  }
  const { email, password, name } = req.body || {};
  const errors = validateCredentials({ email, password });
  if (errors.length) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Datos inválidos.', extensions: { errors } }));
  }
  try {
    const user = usersRepo.create({ email, passwordHash: hashPassword(password), role: 'admin', name: name || 'Administrador' });
    issue(res, 201, user);
  } catch (e) { next(dupOr(e)); }
});

// Registro abierto de clientes.
router.post('/register', registerLimiter, (req, res, next) => {
  const { email, password, name, phone, address } = req.body || {};
  const errors = validateCredentials({ email, password });
  const nameErr = validateName(name);
  if (nameErr) errors.push({ field: 'name', message: nameErr });
  const phoneErr = validatePhone(phone);
  if (phoneErr) errors.push({ field: 'phone', message: phoneErr });
  if (address !== undefined && String(address).trim() && String(address).trim().length < 5) {
    errors.push({ field: 'address', message: 'la dirección es muy corta' });
  }
  if (errors.length) {
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Datos de registro inválidos.', extensions: { errors } }));
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
    return next(new ProblemError({ status: 422, title: 'Unprocessable Entity', detail: 'Se requieren email y password.' }));
  }
  const user = usersRepo.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return next(new ProblemError({ status: 401, title: 'Unauthorized', detail: 'Credenciales inválidas.' }));
  }
  issue(res, 200, user);
});

router.get('/me', requireAuth, (req, res, next) => {
  const user = usersRepo.findById(req.user.id);
  if (!user) return next(new ProblemError({ status: 404, title: 'Not Found', detail: 'Usuario no encontrado.' }));
  res.json({ data: user });
});

router.put('/me', requireAuth, (req, res) => {
  const { name, phone, address } = req.body || {};
  const user = usersRepo.updateProfile(req.user.id, { name, phone, address });
  res.json({ data: user });
});

function dupOr(e) {
  if (String(e.message).includes('UNIQUE')) {
    return new ProblemError({ status: 409, title: 'Conflict', detail: 'Ya existe una cuenta con ese email.' });
  }
  return e;
}

export default router;
