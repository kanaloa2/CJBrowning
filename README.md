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

## Before going live — replace these placeholders

The site ships with clearly-fake placeholder contact details so it's safe
to deploy immediately. Update the following before directing real traffic
to it:

- **Phone number** — currently `(480) 555-0142` (a fictional 555 number).
  Update in `public/index.html` (multiple places), `public/llms.txt`, and
  the JSON-LD `telephone` field.
- **Email** — currently `quotes@cjbrowninginsurance.com`.
- **Domain** — currently assumes `https://www.cjbrowninginsurance.com/`.
  Update the canonical URL, Open Graph URLs, JSON-LD `url`, `robots.txt`,
  and `sitemap.xml` once the real domain and a custom domain/route are
  attached to the Worker.
- **Street address** — the site currently only states "Scottsdale, AZ
  85251" (no street address, intentionally, since none was provided). Add
  the real office address to the contact section and JSON-LD once known.
- **Arizona producer license number** — not included; add it to the footer
  disclaimer if you'd like it displayed.
- **Social links** — footer icons currently link to `#`; point them at real
  profiles or remove them.
- **`og-cover.png`** — an Open Graph share image is referenced but not
  included; add a `public/og-cover.png` (1200×630) for rich social
  previews.
- **Lead delivery** — leads are stored in the `LEADS` KV namespace. To also
  forward leads to email/CRM/Slack in real time, set `LEAD_WEBHOOK_URL`
  (e.g. `wrangler secret put LEAD_WEBHOOK_URL`) to a Zapier/Make/CRM
  webhook URL.
