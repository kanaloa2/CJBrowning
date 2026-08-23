# CJ Browning Insurance Agency

Lead capture website for CJ Browning Insurance Agency, a Farmers Insurance
agency in Scottsdale, AZ, covering all things property & casualty: auto,
home, renters, condo, landlord, umbrella, business, motorcycle, boat/RV, and
flood insurance.

Built as a single Cloudflare Worker (`cjbrowning`) serving a static site
with a small API endpoint for the on-page quote form.

## Stack

- **Static site**: `public/` — semantic HTML, hand-written CSS, vanilla JS.
  No build step required.
- **Worker**: `src/worker.js` — serves the static assets and handles
  `POST /api/lead`, which validates the quote-form submission, stores it in
  the `LEADS` KV namespace, and (if configured) forwards it to an external
  webhook.
- **SEO / AIEO**: per-page meta tags, Open Graph/Twitter cards,
  `InsuranceAgency` + `FAQPage` JSON-LD structured data, `robots.txt`,
  `sitemap.xml`, and an `llms.txt` file summarizing the business for AI
  answer engines.

## Local development

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run deploy
```

This deploys to the `cjbrowning` Worker using the config in `wrangler.toml`.
As of this commit, the `cjbrowning` Worker is also connected to Workers
Builds against this repo's `main` branch, so a push to `main` triggers an
automatic build + deploy — `npm run deploy` is only needed for manual/local
deploys.

## Real agency details (done)

- **Phone**: (480) 744-0944
- **Email**: cbrowning1@farmersagent.com
- **Address**: 14555 N Scottsdale Rd, Ste 300, Scottsdale, AZ 85254
- **Hours**: Mon–Fri, 8:30 AM–5:30 PM MST
- **AZ producer license**: #9349979

These are reflected in `public/index.html` (including JSON-LD), `public/llms.txt`,
and the footer disclaimer.

## Still outstanding

- **Domain** — currently assumes `https://cjbrowning.cjbrowning7.workers.dev/`
  (the live `workers.dev` URL). Update the canonical URL, Open Graph URLs,
  JSON-LD `url`, `robots.txt`, and `sitemap.xml` if/when a custom domain is
  attached to the Worker.
- **Agent photo & Farmers logo** — not yet added; needs the actual image
  files.
- **Social links** — footer icons currently link to `#`; point them at real
  profiles or remove them.
- **`og-cover.png`** — an Open Graph share image is referenced but not
  included; add a `public/og-cover.png` (1200×630) for rich social
  previews.
- **Lead delivery** — leads are stored in the `LEADS` KV namespace. To also
  forward leads to email/CRM/Slack in real time, set `LEAD_WEBHOOK_URL`
  (e.g. `wrangler secret put LEAD_WEBHOOK_URL`) to a Zapier/Make/CRM
  webhook URL. An AgencyZoom Lead API forwarder also exists in
  `src/worker.js` (see `AGENCYZOOM_*` vars in `wrangler.toml`), pending
  confirmed API details from AgencyZoom.
