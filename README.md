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

## Lead delivery

Leads are always stored in the `LEADS` KV namespace. Two optional forwarders
can also be enabled, both configured as Cloudflare Worker **secrets** (never
as plain-text `[vars]`, since `wrangler.toml` is committed to this public
repo):

- **Generic webhook** — set `LEAD_WEBHOOK_URL` to forward the raw lead JSON
  to Zapier/Make/Slack/etc.: `wrangler secret put LEAD_WEBHOOK_URL`
- **AgencyZoom** — set `AGENCYZOOM_WEBHOOK_URL` to forward every new lead
  straight into the AgencyZoom pipeline via its inbound "Web Lead
  Integration" webhook (My Agency > Integration > Web Lead Integration in
  the AgencyZoom App Marketplace). The webhook URL itself is the credential
  — no separate API key or header is needed:
  `wrangler secret put AGENCYZOOM_WEBHOOK_URL`

  `forwardToAgencyZoom()` in `src/worker.js` maps our form's fields
  (name, phone, email, zip, insurance types, current carrier, message) onto
  AgencyZoom's field names (`firstname`/`lastname`/`contactname`/`email`/
  `phone`/`zip`/`currentCarrier`/`notes`), confirmed against a real payload
  from an existing AgencyZoom lead-vendor integration. Our form doesn't
  collect several fields AgencyZoom's schema supports for auto leads
  (street address, city, state, birthday, marital status, vehicles,
  drivers) — those are simply omitted rather than guessed. Failed
  AgencyZoom deliveries are logged to KV under the `agencyzoom-failure:`
  prefix so a lead is never silently lost.

  After setting the secret, submit a real test lead through the live site
  and confirm it lands in the AgencyZoom pipeline.

## Still outstanding

- **Domain** — currently assumes `https://cjbrowning.cjbrowning7.workers.dev/`
  (the live `workers.dev` URL). Update the canonical URL, Open Graph URLs,
  JSON-LD `url`, `robots.txt`, and `sitemap.xml` if/when a custom domain is
  attached to the Worker.
- **Social links** — footer icons currently link to `#`; point them at real
  profiles or remove them.
