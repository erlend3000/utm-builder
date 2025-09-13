// Utility functions extracted for testability
export function normalizeToken(str) {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizePage(input) {
  if (!input) return "/";
  let raw = input.trim();
  let pathPart = raw;
  let query = "";
  // If full URL: extract pathname + search
  try {
    if (/^https?:\/\//i.test(raw)) {
      const u = new URL(raw);
      pathPart = u.pathname || "/";
      query = u.search || "";
    }
  } catch {}
  if (!/^https?:\/\//i.test(raw)) {
    const idx = raw.indexOf("?");
    if (idx !== -1) {
      pathPart = raw.slice(0, idx) || "/";
      query = raw.slice(idx); // include leading ?
    }
  }
  if (!pathPart.startsWith("/")) pathPart = "/" + pathPart;
  // Sanitize path segment only
  pathPart = pathPart
    .replace(/\s+/g, "-")
    .replace(/[^A-Za-z0-9/_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/\\+/g, "/")
    .toLowerCase();
  if (pathPart === "") pathPart = "/";
  // Normalize query: trim spaces
  if (query && !query.startsWith("?")) query = "?" + query;
  return (pathPart === "//" ? "/" : pathPart) + query;
}

export function normalizeDomain(input) {
  if (!input) return "";
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  try {
    const u = new URL(url);
    const origin = u.origin;
    const path = u.pathname.replace(/\/$/, "");
    return path && path !== "/" ? origin + path : origin;
  } catch {
    return url.replace(/\/$/, "");
  }
}

export function joinUrl(domain, page) {
  const d = normalizeDomain(domain);
  const p = normalizePage(page);
  if (!d) return p;
  if (p === "/") return d;
  return d.replace(/\/$/, "") + p;
}

export function buildUTM({ domain, page, campaign, source, medium, term, content }) {
  const base = joinUrl(domain, page);
  const mapping = { utm_campaign: campaign, utm_source: source, utm_medium: medium, utm_term: term, utm_content: content };
  const params = new URLSearchParams();
  Object.entries(mapping).forEach(([k,v]) => { if (v) params.set(k,v); });
  const qs = params.toString();
  if (!qs) return base;
  // If base already has a query segment, append with &
  return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`;
}
