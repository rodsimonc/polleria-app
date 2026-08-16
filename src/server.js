// Punto de entrada. Sirve el front (tienda + admin) y la API /api/v1.
import express from 'express';
import helmet from 'helmet';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from './config.js';
import { runSeed } from './db/seed.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import shopRoutes from './routes/shop.js';
import { errorHandler, notFoundHandler } from './middleware/problem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

runSeed({ verbose: true });

const app = express();
if (config.trustProxy) app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
// Límite alto porque las fotos de productos viajan como data URL (base64) en el JSON.
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const v1 = express.Router();
v1.use('/auth', authRoutes);
v1.use('/products', productRoutes);
v1.use('/orders', orderRoutes);
v1.use('/shop', shopRoutes);
app.use('/api/v1', v1);

app.use(notFoundHandler);
app.use(errorHandler);

const { port } = config;
function startHttps() {
  const key = fs.readFileSync(config.tls.keyFile);
  const cert = fs.readFileSync(config.tls.certFile);
  https.createServer({ key, cert }, app).listen(port, () => {
    console.log(`Pollería (HTTPS) en https://localhost:${port}`);
  });
}
function startHttp() {
  http.createServer(app).listen(port, () => {
    console.log(`Pollería (HTTP) en http://localhost:${port}`);
    console.log(`Tienda: http://localhost:${port}/   ·   Admin: http://localhost:${port}/admin.html`);
  });
}
if (config.tls.enabled && fs.existsSync(config.tls.keyFile) && fs.existsSync(config.tls.certFile)) {
  startHttps();
} else {
  if (config.tls.enabled) console.warn('[TLS] Falta el certificado (npm run gen-cert). Arranco en HTTP.');
  startHttp();
}

export default app;
