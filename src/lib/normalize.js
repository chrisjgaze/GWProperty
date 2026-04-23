export function extractProjects(payload) {
  const candidates = [
    payload,
    payload?.data?.projects,
    payload?.projects,
    payload?.data,
    payload?.results,
    payload?.items,
    payload?.properties,
  ];

  return candidates.find(Array.isArray) ?? null;
}

export function normalizeProject(p, index = 0) {
  const lat = firstCoordinate(p.latitude, p.lat);
  const lng = firstCoordinate(p.longitude, p.lng, p.lon);
  const unitVariations = asArray(p.unit_variations ?? p.unitVariations ?? p.units);
  const minPrice = firstPrice(
    p.minPrice,
    p.min_price,
    p.price,
    p.starting_price,
    computeMinPriceFromUnitVariations(unitVariations)
  );
  const title = firstText(p.name, p.title, p.project_name, "Untitled");
  const community = firstText(p.community, p.area, p.location, "");
  const developer = firstText(p.developer, p.developer_name, "");
  const image = firstText(p.image, p.coverImage, p.cover_image, p.thumbnail, "");
  const completionDate = firstText(
    p.completion_date,
    p.completionDate,
    p.handover,
    p.handover_date,
    ""
  );
  const statusValue = p.sales_status ?? p.status ?? p.statusLabel ?? p.salesStatus;
  const featured = Boolean(p.featured ?? p.display_rocket) || isLikelyFeatured(p, lat, lng, unitVariations);

  return {
    id: String(p.id ?? p.slug ?? `property-${index}`),
    title,
    community,
    developer,
    coverImage: cleanUrl(image),
    lat,
    lng,
    hasPin: isFiniteNum(lat) && isFiniteNum(lng),
    completionDate,
    salesStatusCode: statusValue,
    statusLabel: salesStatusLabel(statusValue),
    minPrice,
    featured,
    unitTypesLabel: summarizeUnitTypes(unitVariations),
    raw: p,
  };
}

export function isFiniteNum(n) {
  return typeof n === "number" && Number.isFinite(n);
}

export function formatAED(n) {
  return new Intl.NumberFormat("en-AE").format(n);
}

export function sortProjects(a, b, sortBy) {
  const nameA = (a.title ?? "").toLowerCase();
  const nameB = (b.title ?? "").toLowerCase();

  const compA = parseCompletionDateSortable(a.completionDate);
  const compB = parseCompletionDateSortable(b.completionDate);

  switch (sortBy) {
    case "price_asc":
      return nullsLastAsc(a.minPrice, b.minPrice) || nameA.localeCompare(nameB);
    case "price_desc":
      return nullsLastDesc(a.minPrice, b.minPrice) || nameA.localeCompare(nameB);
    case "completion_asc":
      return nullsLastAsc(compA, compB) || nameA.localeCompare(nameB);
    case "completion_desc":
      return nullsLastDesc(compA, compB) || nameA.localeCompare(nameB);
    case "name_desc":
      return nameB.localeCompare(nameA);
    case "name_asc":
      return nameA.localeCompare(nameB);
    case "featured_then_name":
    default: {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      return fb - fa || nameA.localeCompare(nameB);
    }
  }
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

function firstText(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function firstCoordinate(...values) {
  for (const value of values) {
    const n = toFloat(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function firstPrice(...values) {
  for (const value of values) {
    const n = parsePriceAED(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function toFloat(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const normalized = String(v).replaceAll(",", "").trim();
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

function cleanUrl(u) {
  if (!u) return "";
  try {
    const url = new URL(String(u).trim());
    return url.toString();
  } catch {
    return String(u).trim().replaceAll(" ", "%20");
  }
}

function computeMinPriceFromUnitVariations(unitVariations) {
  const prices = unitVariations
    .map((uv) => firstPrice(uv?.starting_price, uv?.startingPrice, uv?.price))
    .filter((n) => Number.isFinite(n));
  return prices.length ? Math.min(...prices) : null;
}

function parsePriceAED(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = String(v).trim().toUpperCase().replaceAll(",", "").replace(/\bAED\b/g, "");
  const m = s.match(/([\d.]+)\s*([KMB])?\b/);
  if (!m) return null;

  const num = parseFloat(m[1]);
  if (!Number.isFinite(num)) return null;

  const mult = m[2] === "B" ? 1_000_000_000 : m[2] === "M" ? 1_000_000 : m[2] === "K" ? 1_000 : 1;
  return Math.round(num * mult);
}

function salesStatusLabel(value) {
  if (value == null || value === "") return "Unknown";
  if (typeof value === "string" && Number.isNaN(Number(value))) return value;

  const code = Number(value);
  const map = {
    1: "Status 1",
    2: "Status 2",
    3: "Status 3",
    4: "Status 4",
  };
  return map[code] ?? `Status ${value}`;
}

function isLikelyFeatured(p, lat, lng, unitVariations) {
  const hasImage = Boolean(p.image || p.coverImage || p.cover_image || p.thumbnail);
  const hasPin = isFiniteNum(lat) && isFiniteNum(lng);
  return hasImage && hasPin && unitVariations.length > 0;
}

function summarizeUnitTypes(unitVariations) {
  if (!unitVariations.length) return "";
  const types = uniq(
    unitVariations
      .map((uv) => firstText(uv?.unit_type, uv?.unitType, uv?.label, formatBedLabel(uv?.bed)))
      .filter(Boolean)
  );
  if (!types.length) return "";
  if (types.length <= 3) return types.join(" • ");
  return `${types.slice(0, 3).join(" • ")} • +${types.length - 3}`;
}

function formatBedLabel(bed) {
  const text = firstText(bed);
  return text ? `${text} B/R` : "";
}

function uniq(arr) {
  return Array.from(new Set(arr)).filter(Boolean).sort((a, b) => a.localeCompare(b));
}

function nullsLastAsc(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return a - b;
}

function nullsLastDesc(a, b) {
  const aNull = a == null || Number.isNaN(a);
  const bNull = b == null || Number.isNaN(b);
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  return b - a;
}

function parseCompletionDateSortable(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim().toUpperCase();

  const quarter = t.match(/^Q([1-4])\s+(\d{4})$/);
  if (quarter) {
    const q = parseInt(quarter[1], 10);
    const y = parseInt(quarter[2], 10);
    return y * 10 + q;
  }

  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const y = parseInt(iso[1], 10);
    const m = parseInt(iso[2], 10);
    return y * 100 + m;
  }

  const year = t.match(/\b(20\d{2})\b/);
  return year ? parseInt(year[1], 10) * 100 : null;
}
