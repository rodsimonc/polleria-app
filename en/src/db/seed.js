// Idempotent seed: optional admin (via env), shop data, and sample products.
import { config } from '../config.js';
import { usersRepo } from '../repositories/users.repo.js';
import { productsRepo } from '../repositories/products.repo.js';
import { shopRepo } from '../repositories/shop.repo.js';
import { hashPassword } from '../services/password.js';

export function runSeed({ verbose = false } = {}) {
  const log = (...a) => verbose && console.log('[seed]', ...a);

  // Admin: NOT created by default. Only if ADMIN_EMAIL/ADMIN_PASSWORD are set.
  if (usersRepo.countAdmins() === 0) {
    if (config.admin.email && config.admin.password) {
      usersRepo.create({
        email: config.admin.email, passwordHash: hashPassword(config.admin.password),
        role: 'admin', name: 'Administrator',
      });
      log(`admin created from environment variables: ${config.admin.email}`);
    } else {
      log('no admin yet: create the owner account at /admin.html (first use).');
    }
  }

  // Shop data (only if it does not exist).
  if (!shopRepo.exists()) {
    shopRepo.save({
      name: 'Doña Clara Poultry',
      address: '1234 San Martin Ave, Ramos Mejia, Buenos Aires',
      phone: '011 4444-5555',
      email: 'orders@donaclara.example.com',
      whatsapp: '5491122334455',
      hours: 'Mon to Sat, 8am to 8pm',
      notes: 'Same-day home delivery. Please order at least 2 hours in advance.',
    });
    log('shop data loaded');
  }

  // Sample products.
  if (config.seedSampleData && productsRepo.count() === 0) {
    const samples = [
      { slug: 'chicken-breast', name: 'Chicken breast', unit: 'kg', price: 4200, description: 'Boneless, fresh.', available: true },
      { slug: 'chicken-thighs', name: 'Chicken thighs', unit: 'kg', price: 3200, description: 'Skin-on.', available: true },
      { slug: 'leg-quarter', name: 'Leg quarter', unit: 'kg', price: 3000, description: 'Whole piece.', available: true },
      { slug: 'chicken-wings', name: 'Chicken wings', unit: 'kg', price: 2600, description: 'Great for the oven.', available: true },
      { slug: 'whole-chicken', name: 'Whole chicken', unit: 'kg', price: 2800, description: 'Fresh, cleaned.', available: true },
      { slug: 'chicken-supreme', name: 'Chicken supreme', unit: 'kg', price: 4600, description: 'Ready for schnitzel.', available: true },
      { slug: 'chicken-schnitzel', name: 'Chicken schnitzel', unit: 'kg', price: 5200, description: 'Homemade breaded.', available: true },
      { slug: 'eggs', name: 'Eggs', unit: 'dozen', price: 2400, description: 'A dozen, fresh.', available: true },
    ];
    for (const p of samples) productsRepo.create(p);
    log(`${samples.length} sample products created`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeed({ verbose: true });
  console.log('Seed completed.');
}
