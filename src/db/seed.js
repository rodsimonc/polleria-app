// Seed idempotente: admin opcional (por env), datos del local, y productos de ejemplo.
import { config } from '../config.js';
import { usersRepo } from '../repositories/users.repo.js';
import { productsRepo } from '../repositories/products.repo.js';
import { shopRepo } from '../repositories/shop.repo.js';
import { hashPassword } from '../services/password.js';

export function runSeed({ verbose = false } = {}) {
  const log = (...a) => verbose && console.log('[seed]', ...a);

  // Admin: NO se crea por defecto. Solo si se definieron ADMIN_EMAIL/ADMIN_PASSWORD.
  if (usersRepo.countAdmins() === 0) {
    if (config.admin.email && config.admin.password) {
      usersRepo.create({
        email: config.admin.email, passwordHash: hashPassword(config.admin.password),
        role: 'admin', name: 'Administrador',
      });
      log(`admin creado desde variables de entorno: ${config.admin.email}`);
    } else {
      log('sin admin todavía: creá la cuenta del dueño en /admin.html (primer uso).');
    }
  }

  // Datos del local (solo si no existen).
  if (!shopRepo.exists()) {
    shopRepo.save({
      name: 'Pollería Doña Clara',
      address: 'Av. San Martín 1234, Ramos Mejía, Buenos Aires',
      phone: '011 4444-5555',
      email: 'pedidos@donaclara.example.com',
      whatsapp: '5491122334455',
      hours: 'Lun a Sáb de 8 a 20 h',
      notes: 'Envíos a domicilio en el día. Pedidos con 2 horas de anticipación.',
    });
    log('datos del local cargados');
  }

  // Productos de ejemplo.
  if (config.seedSampleData && productsRepo.count() === 0) {
    const samples = [
      { slug: 'pechuga-pollo', name: 'Pechuga de pollo', unit: 'kg', price: 4200, description: 'Sin hueso, fresca.', available: true },
      { slug: 'muslos-pollo', name: 'Muslos de pollo', unit: 'kg', price: 3200, description: 'Con piel.', available: true },
      { slug: 'pata-muslo', name: 'Pata muslo', unit: 'kg', price: 3000, description: 'Pieza entera.', available: true },
      { slug: 'alas-pollo', name: 'Alas de pollo', unit: 'kg', price: 2600, description: 'Ideales para el horno.', available: true },
      { slug: 'pollo-entero', name: 'Pollo entero', unit: 'kg', price: 2800, description: 'Fresco, limpio.', available: true },
      { slug: 'suprema', name: 'Suprema de pollo', unit: 'kg', price: 4600, description: 'Lista para milanesas.', available: true },
      { slug: 'milanesas-pollo', name: 'Milanesas de pollo', unit: 'kg', price: 5200, description: 'Rebozadas caseras.', available: true },
      { slug: 'huevos', name: 'Huevos', unit: 'docena', price: 2400, description: 'Docena, frescos.', available: true },
    ];
    for (const p of samples) productsRepo.create(p);
    log(`${samples.length} productos de ejemplo creados`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed({ verbose: true });
  console.log('Seed completado.');
}
