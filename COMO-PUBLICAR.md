# De tu compu a una página web de verdad

Hoy la app corre en tu máquina y solo vos la ves (en `http://localhost:3100`). "Publicarla" significa ponerla en una computadora que esté **prendida las 24 horas y conectada a internet**, con una **dirección** que cualquiera pueda escribir en el navegador. Esta guía explica qué pasa por detrás y los pasos concretos.

## El proceso de fondo (qué pasa cuando alguien entra)

Cuando una persona escribe la dirección de tu pollería y aprieta Enter, pasa esto en menos de un segundo:

1. **Dominio → DNS.** El navegador toma el nombre (ej. `donaclara.com.ar`) y le pregunta al sistema de DNS "¿en qué servidor vive esto?". El DNS responde con una dirección IP (el "número de teléfono" del servidor).
2. **Conexión segura (HTTPS).** El navegador se conecta a ese servidor por HTTPS. El servidor presenta un **certificado** que prueba que es quien dice ser, y a partir de ahí todo viaja cifrado (el candado del navegador).
3. **Tu servidor Node responde.** En ese servidor está corriendo tu `npm start`. Recibe el pedido, ejecuta tu código de Express, consulta la **base de datos** (los productos, los pedidos), arma la respuesta (el HTML de la tienda o el JSON de la API) y la devuelve.
4. **El navegador muestra la página.** Pinta la tienda, y cada acción del cliente (ver productos, mandar un pedido) es otro viaje de ida y vuelta al mismo servidor.

Es exactamente lo que ya pasa en tu máquina, con una diferencia: en vez de `localhost` (que significa "esta misma compu"), el servidor está en internet con un dominio y un certificado.

## Las piezas que necesitás

| Pieza | Qué es | Ejemplo |
|-------|--------|---------|
| **Repositorio** | Tu código guardado y versionado | GitHub |
| **Hosting** | La computadora que corre tu Node 24/7 | Render, Railway, Fly.io, o un VPS |
| **Base de datos persistente** | Donde viven productos y pedidos, que no se borre en cada actualización | Disco persistente (para SQLite) o Postgres administrado |
| **Dominio** | El nombre que escribe la gente | un registrador (ej. NIC.ar, Namecheap) |
| **DNS** | La "guía telefónica" que apunta el dominio al hosting | lo configura el hosting o el registrador |
| **HTTPS** | El certificado del candado | lo da el hosting automático (Let's Encrypt) |
| **Variables de entorno** | Los secretos (JWT_SECRET, etc.) fuera del código | se cargan en el panel del hosting |

## Camino recomendado (el más simple hoy)

1. **Subí el código a GitHub.** Creás un repositorio y subís la carpeta `polleria-app` (sin `node_modules` ni `data`, ya están en `.gitignore`).
2. **Creá un servicio en Render (o Railway).** Le decís "tomá este repo de GitHub". Build: `npm install`. Start: `npm start`.
3. **Cargá las variables de entorno** en el panel: `NODE_ENV=production`, `JWT_SECRET=` (uno largo y aleatorio), `TRUST_PROXY=true`. Y si querés el admin automático, `ADMIN_EMAIL` y `ADMIN_PASSWORD`.
4. **Agregá un disco persistente** montado en, por ejemplo, `/data`, y poné `DATABASE_FILE=/data/polleria.db`. Sin esto, la base se borra en cada deploy.
5. **Listo: te dan una URL `https://...`** con certificado válido. Ya es accesible desde cualquier lado.
6. **(Opcional) Dominio propio.** Comprás el dominio, y en el hosting agregás "custom domain"; te dice qué registro DNS crear. En unos minutos tu dominio apunta a la app con HTTPS.

Cada vez que cambiás algo, hacés `git push` y el hosting **reconstruye y actualiza** solo.

## Un detalle sobre las fotos de los productos

En esta versión, las fotos se guardan **dentro de la base** (como texto). Es simple y anda perfecto para un negocio chico. Cuando una tienda crece y tiene muchas fotos grandes, lo habitual es guardarlas en un **almacenamiento de objetos** (como Amazon S3, Cloudflare R2 o similar) y servirlas por un **CDN** (una red que las entrega rápido desde el lugar más cercano al cliente). La base solo guardaría el link a la foto. Es el paso siguiente natural si el catálogo se hace grande.

## Producción vs. tu compu: qué cambia

- **SQLite → Postgres:** SQLite (un archivo) es genial para empezar y para tráfico bajo. Si esperás mucha gente al mismo tiempo, se migra a PostgreSQL (una base pensada para muchos accesos simultáneos). La arquitectura por capas que ya tiene el proyecto (repositorios) hace ese cambio bastante acotado.
- **HTTPS:** en local es opcional y con certificado autofirmado; en producción lo pone el hosting, válido y automático.
- **Backups:** conviene una copia periódica de la base. Los hostings administrados suelen ofrecerlo.
- **Logs y monitoreo:** para ver errores y visitas en vivo.

## Resumen en una línea

Publicar = subir el código a un hosting que corra `npm start` sobre una base persistente, apuntarle un dominio y dejar que el hosting ponga el HTTPS. El código no cambia; cambia **dónde** corre y **cómo** llega la gente.
