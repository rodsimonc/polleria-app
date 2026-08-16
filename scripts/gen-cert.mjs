// Genera un certificado autofirmado para HTTPS local (no requiere OpenSSL).
// Uso:  npm run gen-cert   -> crea certs/key.pem y certs/cert.pem

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import selfsigned from 'selfsigned';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const certsDir = path.join(__dirname, '..', 'certs');
fs.mkdirSync(certsDir, { recursive: true });

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: false },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' },    // IP
      ],
    },
  ],
});

fs.writeFileSync(path.join(certsDir, 'key.pem'), pems.private);
fs.writeFileSync(path.join(certsDir, 'cert.pem'), pems.cert);

console.log('Certificado autofirmado generado en certs/');
console.log('Activá HTTPS poniendo TLS_ENABLED=true en tu .env y corré: npm start');
