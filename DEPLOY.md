# Deploying to a VPS (Ubuntu/AlmaLinux, no Vercel)

Scenic/FreeMovies was built for Vercel: `npm run build` produces the static
frontend, and `/api/*` runs as Vercel Serverless/Edge Functions per
`vercel.json`'s rewrites. This guide replaces both with plain Node — a small
Express app in `server/` — so it can run on any VPS behind Nginx or
OpenLiteSpeed.

## What `server/` does

- `server/index.js` — the Express app: serves `build/`, mounts every `/api/*`
  route, and reproduces `vercel.json`'s rewrites (`/movie/:id`, `/tv/:id`,
  `/sitemap.xml`, `/api/tmdb/*`, `/api/download/*`).
- `server/edgeHandlers.js` — `api/tmdb.js`, `api/page.js`, `api/sitemap.js`,
  and `api/download.js` were Vercel **Edge Functions** (Fetch API
  `(request) => Response`, ESM `export default`) — a format Express can't
  load directly. This file reimplements the same logic for Express. **If you
  change one of those four files in `/api`, port the same change here** —
  it's a second copy, not a wrapper. (`api/sources.js`, `stream.js`,
  `subtitle.js`, `hls-proxy.js` are already plain Node/Express-shaped
  `(req, res)` handlers, so `server/index.js` mounts those straight from
  `/api`, no copy needed.)

## 1. Prerequisites on the VPS

- Node.js 18+ and npm
- A process manager: [PM2](https://pm2.keymetrics.io/) (`npm install -g pm2`)
- Nginx (or OpenLiteSpeed) as the public-facing reverse proxy + SSL
  terminator

## 2. Build

```bash
git clone <your-fork-url> freemovies
cd freemovies
npm install
cp .env.example .env   # fill in TMDB key, streaming servers, etc.
npm run build           # -> build/
```

`npm run build` only needs to run again when the source changes — the
Express server just serves whatever is in `build/`.

## 3. Run the server with PM2

```bash
PORT=3001 pm2 start server/index.js --name freemovies
pm2 save
pm2 startup   # prints a systemd command to run once, so PM2 survives reboots
```

`server/index.js` loads `.env` itself (via `dotenv`), so the same file you
filled in for step 2 also configures the running server — no separate env
setup. `PORT` defaults to `3001` if unset.

Useful commands: `pm2 logs freemovies`, `pm2 restart freemovies` (after a
new `npm run build`), `pm2 status`.

## 4a. Nginx reverse proxy (Ubuntu + aaPanel or plain Nginx)

In aaPanel: **Website → Add site** (as a plain "PHP" or "Static" site is
fine, you're not using its PHP/Node manager) → then edit the site's Nginx
config (aaPanel's "Config" tab for that site, or `/etc/nginx/sites-available/
<domain>` on a bare install) and replace the `location /` block with:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then use aaPanel's SSL tab (Let's Encrypt, one click) to add HTTPS — it
edits this same file to add the `listen 443 ssl` block automatically.

Reload: `nginx -t && systemctl reload nginx` (aaPanel's UI has a
"Reload configuration" button that does this).

## 4b. OpenLiteSpeed (AlmaLinux) equivalent

In WebAdmin: **Virtual Hosts → your vhost → External App** → add a
"Web Server" type external app pointing at `127.0.0.1:3001`, then
**Context** → add a Proxy context for path `/` targeting that external app.
Nginx's syntax above is more commonly documented if you have a choice of OS.

## 5. What's intentionally out of scope here

- **`worker/` (Cloudflare Worker HLS proxy)** — a separate deploy target
  (`wrangler deploy` on Cloudflare), unrelated to this VPS. Without it,
  `PROXY_BASE` stays unset and `api/hls-proxy.js` (already mounted by
  `server/index.js`) handles HLS proxying itself — segment bandwidth then
  goes through your VPS instead of Cloudflare's free egress. Fine for
  testing/low traffic; for real usage either deploy the Worker separately
  and set `PROXY_BASE`, or budget VPS bandwidth accordingly.
- **Auto-scaling / zero-downtime deploys** — Vercel gives you these for
  free; on a VPS you own them. `pm2 reload freemovies` after a rebuild does
  a zero-downtime restart if you need it.

## 6. Sanity checklist after deploying

```bash
curl -I https://your-domain.com/                       # 200, static app
curl https://your-domain.com/api/tmdb/movie/popular     # TMDB JSON
curl https://your-domain.com/sitemap.xml                # XML
curl https://your-domain.com/movie/1084736 | grep title # per-title <title>
```
