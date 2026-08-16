// Conexión SQLite y esquema de la pollería.
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

fs.mkdirSync(path.dirname(config.databaseFile), { recursive: true });

export const db = new Database(config.databaseFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'customer',   -- 'admin' | 'customer'
    name          TEXT NOT NULL DEFAULT '',
    phone         TEXT NOT NULL DEFAULT '',
    address       TEXT NOT NULL DEFAULT '',
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    slug        TEXT NOT NULL,
    name        TEXT NOT NULL,
    unit        TEXT NOT NULL DEFAULT 'kg',           -- 'kg' | 'unidad' | 'docena'
    price       REAL NOT NULL DEFAULT 0,              -- precio por unidad
    description TEXT NOT NULL DEFAULT '',
    image       TEXT NOT NULL DEFAULT '',            -- foto del producto (data URL o URL)
    available   INTEGER NOT NULL DEFAULT 1,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    items            TEXT NOT NULL DEFAULT '[]',       -- JSON: [{productId,name,unit,unitPrice,qty,subtotal}]
    subtotal         REAL NOT NULL DEFAULT 0,
    discount         REAL NOT NULL DEFAULT 0,
    total            REAL NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'pendiente',-- pendiente|confirmado|en_camino|entregado|cancelado
    shipping_address TEXT NOT NULL DEFAULT '',
    contact_phone    TEXT NOT NULL DEFAULT '',
    notes            TEXT NOT NULL DEFAULT '',
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  -- Datos del local (una sola fila, id = 1).
  CREATE TABLE IF NOT EXISTS shop (
    id       INTEGER PRIMARY KEY CHECK (id = 1),
    name     TEXT NOT NULL DEFAULT '',
    address  TEXT NOT NULL DEFAULT '',
    phone    TEXT NOT NULL DEFAULT '',
    email    TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',                -- solo dígitos, formato internacional (ej. 5491122334455)
    hours    TEXT NOT NULL DEFAULT '',
    notes    TEXT NOT NULL DEFAULT ''
  );
`);

// --- Migraciones suaves para bases ya creadas (agregar columnas nuevas si faltan) ---
const productCols = db.prepare("PRAGMA table_info(products)").all().map((c) => c.name);
if (!productCols.includes('image')) {
  db.exec("ALTER TABLE products ADD COLUMN image TEXT NOT NULL DEFAULT ''");
}
const orderCols = db.prepare("PRAGMA table_info(orders)").all().map((c) => c.name);
if (!orderCols.includes('subtotal')) db.exec("ALTER TABLE orders ADD COLUMN subtotal REAL NOT NULL DEFAULT 0");
if (!orderCols.includes('discount')) db.exec("ALTER TABLE orders ADD COLUMN discount REAL NOT NULL DEFAULT 0");

export default db;
