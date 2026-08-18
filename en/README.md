# Online poultry shop

Poultry shop app with a **customer store** and an **admin panel**, same architecture as the portfolio project: Node/Express + SQLite, passwords hashed (scrypt), JWT, security headers (Helmet) and HTTPS support.

## What it includes

- **Store** (`/`): shop details (address, hours), **WhatsApp** and **email** buttons, product catalog with prices, a **cart** and **order with shipping** confirmation (delivery address).
- **Customers**: they register themselves, place orders and track the status under "My orders".
- **Admin (owner)** (`/admin.html`): edits product **prices and availability** (breasts, thighs, etc.), manages **orders** by changing their shipping status, and edits the **shop data**.

## Getting started

```bash
npm install
npm start
# Store: http://localhost:3100/   ·   Admin: http://localhost:3100/admin.html
```

The first time, the database `data/polleria.db` is created with sample products and shop data. **There is no default admin**: the first time you open `/admin.html` you create the owner account. Admin registration is closed afterwards; customers register freely from the store.

## Roles and flow

1. You open `/admin.html` → you create the owner (admin) account.
2. You add/edit products and prices, and fill in the shop data.
3. A customer opens `/`, registers, builds the cart, enters their address and confirms the order.
4. The owner sees the order in the panel and changes its status: pending → confirmed → in transit → delivered (or cancelled).

## Security

- No default credentials; passwords with **scrypt hashing** (minimum 8 characters with letters and numbers).
- **JWT** (HS256, validated claims); role-based authorization (`admin` / `customer`) always on the server.
- Order **prices and totals are recalculated on the server**: even if the client tampers with the price, the one from the database is used.
- Rate limiting on login/registration, headers with Helmet, errors with Problem Details (RFC 7807).

## Main endpoints

| Method | Path | Access |
|--------|------|--------|
| GET | `/api/v1/shop` | public |
| PUT | `/api/v1/shop` | admin |
| GET | `/api/v1/products` | public (admin sees unavailable ones) |
| POST·PUT·PATCH·DELETE | `/api/v1/products/{id}` | admin |
| POST | `/api/v1/auth/register-admin` | public (first use only) |
| POST | `/api/v1/auth/register` | public (customers) |
| POST | `/api/v1/auth/login` | public |
| GET·PUT | `/api/v1/auth/me` | authenticated |
| POST | `/api/v1/orders` | customer |
| GET | `/api/v1/orders` | admin (all) / customer (own) |
| PATCH | `/api/v1/orders/{id}/status` | admin |

## Local HTTPS

```bash
npm run gen-cert        # certs/key.pem and certs/cert.pem
# TLS_ENABLED=true in .env, then npm start -> https://localhost:3100
```

> Default sample data (Doña Clara Poultry, fictional WhatsApp and email): editable from the panel → "Shop data".
