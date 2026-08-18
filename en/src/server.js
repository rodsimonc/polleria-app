// Entry point. Serves the front end (store + admin) and the /api/v1 API.
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
// High limit because product photos travel as a data URL (base64) in the JSON.
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
    console.log(`Poultry shop (HTTPS) at https://localhost:${port}`);
  });
}
function startHttp() {
  http.createServer(app).listen(port, () => {
    console.log(`Poultry shop (HTTP) at http://localhost:${port}`);
    console.log(`Store: http://localhost:${port}/   ·   Admin: http://localhost:${port}/admin.html`);
  });
}
if (config.tls.enabled && fs.existsSync(config.tls.keyFile) && fs.existsSync(config.tls.certFile)) {
  startHttps();
} else {
  if (config.tls.enabled) console.warn('[TLS] Missing certificate (npm run gen-cert). Starting in HTTP.');
  startHttp();
}

export default app;
