// Authentication and authorization.
// Bearer token (JWT). The iss/aud/exp/sub claims are validated. Fixed HS256 algorithm.

import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { ProblemError } from './problem.js';

const ALGORITHM = 'HS256';

export function signAccessToken(user) {
  return jwt.sign(
    { role: user.role },
    config.jwtSecret,
    {
      algorithm: ALGORITHM,
      issuer: config.jwtIssuer,
      audience: config.jwtAudience,
      subject: String(user.id),
      expiresIn: config.accessTokenTtl,
      jwtid: cryptoRandomId(),
    }
  );
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function verify(token) {
  return jwt.verify(token, config.jwtSecret, {
    algorithms: [ALGORITHM], // rejects alg: none
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
}

// Requires a valid Bearer token. Authorization is ALWAYS validated on the server.
export function requireAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new ProblemError({
      status: 401, title: 'Unauthorized',
      detail: 'Missing Bearer token in the Authorization header.',
    }));
  }
  try {
    const payload = verify(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    return next(new ProblemError({
      status: 401, title: 'Unauthorized',
      detail: 'The token is invalid or has expired.',
    }));
  }
}

// OPTIONAL authentication: if a valid token is provided it sets req.user; otherwise it stays anonymous.
export function optionalAuth(req, _res, next) {
  const [scheme, token] = (req.get('authorization') || '').split(' ');
  if (scheme === 'Bearer' && token) {
    try { const p = verify(token); req.user = { id: p.sub, role: p.role }; } catch { /* ignore */ }
  }
  next();
}

// Requires a specific role. 403 if the authenticated user lacks permission.
export function requireRole(role) {
  return (req, _res, next) => {
    if (!req.user || req.user.role !== role) {
      return next(new ProblemError({
        status: 403, title: 'Forbidden',
        detail: 'You do not have permission to perform this operation.',
      }));
    }
    next();
  };
}
