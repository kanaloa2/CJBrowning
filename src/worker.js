/**
 * CJ Browning Insurance Agency — Cloudflare Worker
 *
 * Serves the static site from /public and exposes a single JSON API
 * endpoint, POST /api/lead, for the on-site quote request form. Leads are
 * persisted to a KV namespace (LEADS) and, if LEAD_WEBHOOK_URL is
 * configured, forwarded to an external webhook (Zapier/Make/CRM/Slack/etc.)
 * without blocking the response to the visitor.
 */

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

const INSURANCE_TYPES = new Set([
  "auto",
  "home",
  "renters",
  "condo",
  "landlord",
  "umbrella",
  "business",
  "motorcycle",
  "boat-rv",
  "flood",
  "other",
]);

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function isValidEmail(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value) {
  if (typeof value !== "string") return false;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function sanitize(value, maxLen = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

async function handleLead(request, env, ctx) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid request body." }, 400);
  }

  // Honeypot: bots fill every field, humans never see this one.
  if (sanitize(payload.website)) {
    return jsonResponse({ ok: true });
  }

  const name = sanitize(payload.name, 120);
  const phone = sanitize(payload.phone, 40);
  const email = sanitize(payload.email, 200);
  const zip = sanitize(payload.zip, 10);
  const message = sanitize(payload.message, 1000);
  const bestTime = sanitize(payload.bestTime, 60);
  const currentCarrier = sanitize(payload.currentCarrier, 120);
  const consent = payload.consent === true;

  const rawTypes = Array.isArray(payload.insuranceTypes) ? payload.insuranceTypes : [];
  const insuranceTypes = rawTypes
    .map((t) => sanitize(t, 30))
    .filter((t) => INSURANCE_TYPES.has(t));

  const errors = [];
  if (!name) errors.push("Name is required.");
  if (!isValidPhone(phone)) errors.push("A valid phone number is required.");
  if (!isValidEmail(email)) errors.push("A valid email address is required.");
  if (!zip || !/^\d{5}$/.test(zip)) errors.push("A valid 5-digit ZIP code is required.");
  if (insuranceTypes.length === 0) errors.push("Select at least one type of coverage.");
  if (!consent) errors.push("Please confirm you agree to be contacted.");

  if (errors.length) {
    return jsonResponse({ ok: false, error: errors.join(" ") }, 400);
  }

  const id = crypto.randomUUID();
  const lead = {
    id,
    name,
    phone,
    email,
    zip,
    insuranceTypes,
    currentCarrier,
    bestTime,
    message,
    consent: true,
    source: sanitize(payload.source, 120) || "cjbrowninginsurance.com",
    userAgent: request.headers.get("user-agent") || "",
    receivedAt: new Date().toISOString(),
  };

  if (env.LEADS) {
    ctx.waitUntil(
      env.LEADS.put(`lead:${lead.receivedAt}:${id}`, JSON.stringify(lead))
    );
  }

  if (env.LEAD_WEBHOOK_URL) {
    ctx.waitUntil(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      }).catch(() => {})
    );
  }

  if (env.AGENCYZOOM_API_URL && env.AGENCYZOOM_API_KEY) {
    ctx.waitUntil(forwardToAgencyZoom(lead, env));
  }

  return jsonResponse({ ok: true, id });
}

/**
 * Forwards a lead to AgencyZoom's Lead API.
 *
 * NOT YET VERIFIED against AgencyZoom's actual API contract — the field
 * names, auth header, and endpoint path below are a best-effort mapping
 * and must be confirmed against AgencyZoom's own API docs (or an example
 * request from their support team) before this can be trusted in
 * production. Until then, failures are recorded in KV (under the
 * `agencyzoom-failure:` prefix) rather than silently dropped, so leads
 * are never lost even if this integration is misconfigured.
 */
async function forwardToAgencyZoom(lead, env) {
  const [firstName, ...rest] = lead.name.split(" ");
  const lastName = rest.join(" ") || firstName;

  const body = {
    firstName,
    lastName,
    email: lead.email,
    phone: lead.phone,
    zip: lead.zip,
    products: lead.insuranceTypes,
    note: [lead.currentCarrier && `Current carrier: ${lead.currentCarrier}`, lead.message]
      .filter(Boolean)
      .join(" | "),
    leadSource: env.AGENCYZOOM_LEAD_SOURCE || "Website",
  };

  const headerName = env.AGENCYZOOM_AUTH_HEADER_NAME || "Authorization";
  const headerPrefix = env.AGENCYZOOM_AUTH_HEADER_PREFIX ?? "Bearer ";

  try {
    const res = await fetch(env.AGENCYZOOM_API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [headerName]: `${headerPrefix}${env.AGENCYZOOM_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok && env.LEADS) {
      await env.LEADS.put(
        `agencyzoom-failure:${lead.receivedAt}:${lead.id}`,
        JSON.stringify({ status: res.status, statusText: res.statusText, body, leadId: lead.id })
      );
    }
  } catch (err) {
    if (env.LEADS) {
      await env.LEADS.put(
        `agencyzoom-failure:${lead.receivedAt}:${lead.id}`,
        JSON.stringify({ error: String(err), body, leadId: lead.id })
      );
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      if (request.method === "POST") return handleLead(request, env, ctx);
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ ok: false, error: "Not found." }, 404);
    }

    return env.ASSETS.fetch(request);
  },
};
