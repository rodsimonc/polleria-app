# From your computer to a real website

Right now the app runs on your machine and only you can see it (at `http://localhost:3100`). "Publishing" it means putting it on a computer that is **on 24 hours a day and connected to the internet**, with an **address** that anyone can type into their browser. This guide explains what happens behind the scenes and the concrete steps.

## The underlying process (what happens when someone visits)

When a person types your poultry shop's address and hits Enter, this happens in under a second:

1. **Domain → DNS.** The browser takes the name (e.g. `donaclara.com`) and asks the DNS system "where does this live?". DNS responds with an IP address (the server's "phone number").
2. **Secure connection (HTTPS).** The browser connects to that server over HTTPS. The server presents a **certificate** proving it is who it claims to be, and from then on everything travels encrypted (the browser padlock).
3. **Your Node server responds.** On that server your `npm start` is running. It receives the request, runs your Express code, queries the **database** (the products, the orders), assembles the response (the store's HTML or the API's JSON) and returns it.
4. **The browser renders the page.** It paints the store, and every customer action (viewing products, placing an order) is another round trip to the same server.

It is exactly what already happens on your machine, with one difference: instead of `localhost` (which means "this very computer"), the server is on the internet with a domain and a certificate.

## The pieces you need

| Piece | What it is | Example |
|-------|-----------|---------|
| **Repository** | Your code stored and versioned | GitHub |
| **Hosting** | The computer that runs your Node 24/7 | Render, Railway, Fly.io, or a VPS |
| **Persistent database** | Where products and orders live, so it is not wiped on each update | Persistent disk (for SQLite) or managed Postgres |
| **Domain** | The name people type | a registrar (e.g. Namecheap) |
| **DNS** | The "phone book" that points the domain to the hosting | configured by the hosting or the registrar |
| **HTTPS** | The padlock certificate | provided automatically by the hosting (Let's Encrypt) |
| **Environment variables** | The secrets (JWT_SECRET, etc.) kept out of the code | loaded in the hosting panel |

## Recommended path (the simplest today)

1. **Push the code to GitHub.** You create a repository and upload the `polleria-app` folder (without `node_modules` or `data`, they are already in `.gitignore`).
2. **Create a service on Render (or Railway).** You tell it "take this GitHub repo". Build: `npm install`. Start: `npm start`.
3. **Set the environment variables** in the panel: `NODE_ENV=production`, `JWT_SECRET=` (a long, random one), `TRUST_PROXY=true`. And if you want the automatic admin, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. **Add a persistent disk** mounted at, for example, `/data`, and set `DATABASE_FILE=/data/polleria.db`. Without this, the database is wiped on every deploy.
5. **Done: you get a `https://...` URL** with a valid certificate. It is now reachable from anywhere.
6. **(Optional) Your own domain.** You buy the domain, and in the hosting you add a "custom domain"; it tells you which DNS record to create. Within a few minutes your domain points to the app with HTTPS.

Every time you change something, you run `git push` and the hosting **rebuilds and updates** by itself.

## A note about the product photos

In this version, the photos are stored **inside the database** (as text). It is simple and works perfectly for a small business. When a store grows and has many large photos, the usual approach is to store them in an **object storage** (like Amazon S3, Cloudflare R2 or similar) and serve them through a **CDN** (a network that delivers them quickly from the location closest to the customer). The database would only store the link to the photo. It is the natural next step if the catalog gets large.

## Production vs. your computer: what changes

- **SQLite → Postgres:** SQLite (a single file) is great to start and for low traffic. If you expect many people at the same time, you migrate to PostgreSQL (a database built for many simultaneous accesses). The layered architecture the project already has (repositories) keeps that change fairly contained.
- **HTTPS:** locally it is optional and with a self-signed certificate; in production the hosting provides it, valid and automatic.
- **Backups:** a periodic copy of the database is a good idea. Managed hostings usually offer it.
- **Logs and monitoring:** to see errors and visits live.

## One-line summary

Publishing = uploading the code to a hosting that runs `npm start` on top of a persistent database, pointing a domain at it and letting the hosting provide the HTTPS. The code does not change; what changes is **where** it runs and **how** people reach it.
