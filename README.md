# Pollería online

App de pollería con **tienda para clientes** y **panel de administración**, misma arquitectura que el proyecto de portfolio: Node/Express + SQLite, contraseñas con hash (scrypt), JWT, headers de seguridad (Helmet) y soporte HTTPS.

## Qué incluye

- **Tienda** (`/`): datos del local (dirección, horario), botón de **WhatsApp** y **mail**, catálogo de productos con precios, **carrito** y confirmación de **pedido con envío** (dirección de entrega).
- **Clientes**: se registran solos, hacen pedidos y ven el estado de "Mis pedidos".
- **Admin (dueño)** (`/admin.html`): edita **precios y disponibilidad** de productos (pechugas, muslos, etc.), gestiona **pedidos** cambiando su estado de envío, y edita los **datos del local**.

## Puesta en marcha

```bash
npm install
npm start
# Tienda: http://localhost:3100/   ·   Admin: http://localhost:3100/admin.html
```

La primera vez se crea la base `data/polleria.db` con productos y datos del local de ejemplo. **No hay admin por defecto**: la primera vez que entrás a `/admin.html` creás la cuenta del dueño. El registro de admin queda cerrado después; los clientes se registran libremente desde la tienda.

## Roles y flujo

1. Entrás a `/admin.html` → creás la cuenta del dueño (admin).
2. Cargás/editás productos y precios, y completás los datos del local.
3. Un cliente entra a `/`, se registra, arma el carrito, pone su dirección y confirma el pedido.
4. El dueño ve el pedido en el panel y le cambia el estado: pendiente → confirmado → en camino → entregado (o cancelado).

## Seguridad

- Sin credenciales por defecto; contraseñas con **hash scrypt** (mínimo 8 caracteres con letras y números).
- **JWT** (HS256, claims validados); autorización por rol (`admin` / `customer`) siempre en el servidor.
- Los **precios y totales de los pedidos se recalculan en el servidor**: aunque el cliente manipule el precio, se usa el de la base.
- Rate limiting en login/registro, headers con Helmet, errores con Problem Details (RFC 7807).

## Endpoints principales

| Método | Ruta | Acceso |
|--------|------|--------|
| GET | `/api/v1/shop` | público |
| PUT | `/api/v1/shop` | admin |
| GET | `/api/v1/products` | público (admin ve no disponibles) |
| POST·PUT·PATCH·DELETE | `/api/v1/products/{id}` | admin |
| POST | `/api/v1/auth/register-admin` | público (solo primer uso) |
| POST | `/api/v1/auth/register` | público (clientes) |
| POST | `/api/v1/auth/login` | público |
| GET·PUT | `/api/v1/auth/me` | autenticado |
| POST | `/api/v1/orders` | cliente |
| GET | `/api/v1/orders` | admin (todos) / cliente (propios) |
| PATCH | `/api/v1/orders/{id}/status` | admin |

## HTTPS local

```bash
npm run gen-cert        # certs/key.pem y certs/cert.pem
# TLS_ENABLED=true en .env, luego npm start -> https://localhost:3100
```

> Datos por defecto de ejemplo (Pollería Doña Clara, WhatsApp y mail ficticios): editables desde el panel → "Datos del local".
