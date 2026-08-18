// Central configuration read from environment variables (.env locally).
import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const isProd = process.env.NODE_ENV === 'production';

export const config = {
  isProd,
  port: Number(process.env.PORT || 3100),

  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-in-production',
  jwtIssuer: process.env.JWT_ISSUER || 'polleria-app',
  jwtAudience: process.env.JWT_AUDIENCE || 'polleria-users',
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '2h',

  databaseFile: process.env.DATABASE_FILE || path.join(root, 'data', 'polleria.db'),

  // OPTIONAL initial admin (for headless deploys). If not set, it is created on first use.
  admin: {
    email: process.env.ADMIN_EMAIL || null,
    password: process.env.ADMIN_PASSWORD || null,
  },

  seedSampleData: process.env.SEED_SAMPLE_DATA !== 'false',

  trustProxy: process.env.TRUST_PROXY === 'true' || isProd,

  tls: {
    enabled: process.env.TLS_ENABLED === 'true',
    keyFile: process.env.TLS_KEY_FILE || path.join(root, 'certs', 'key.pem'),
    certFile: process.env.TLS_CERT_FILE || path.join(root, 'certs', 'cert.pem'),
  },
};

if (isProd && config.jwtSecret.startsWith('dev-insecure')) {
  console.error('[FATAL] JWT_SECRET is not configured in production. Define a secure one.');
  process.exit(1);
}
