const fallbackImages = [
  "/images/pc1.jpg",
  "/images/pc2.jpg",
  "/images/pc3.jpg",
  "/images/pc4.jpg",
  "/images/pc5.jpg",
];

const elements = {
  search: document.querySelector("#search"),
  propertyType: document.querySelector("#property-type"),
  salesStatus: document.querySelector("#sales-status"),
  clearFilters: document.querySelector("#clear-filters"),
  totalCount: document.querySelector("#total-count"),
  status: document.querySelector("#status"),
  grid: document.querySelector("#properties"),
  empty: document.querySelector("#empty-state"),
  template: document.querySelector("#custom-property-card"),
};

let allProperties = [];

loadProperties();

elements.search.addEventListener("input", render);
elements.propertyType.addEventListener("change", render);
elements.salesStatus.addEventListener("change", render);
elements.clearFilters.addEventListener("click", () => {
  elements.search.value = "";
  elements.propertyType.value = "";
  elements.salesStatus.value = "";
  render();
});

async function loadProperties() {
  try {
    const response = await fetch("/custom-properties-index.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const properties = Array.isArray(payload?.properties) ? payload.properties : [];
    allProperties = properties.map(normalizeProperty);
    elements.totalCount.textContent = allProperties.length.toLocaleString();
    populateSelect(elements.propertyType, allProperties.map((property) => property.propertyType));
    populateSelect(elements.salesStatus, allProperties.map((property) => property.status));
    render();
  } catch (error) {
    console.error(error);
    elements.status.textContent = `Could not load custom properties (${error.message})`;
    elements.status.classList.add("feed-status--error");
  }
}

function render() {
  const query = elements.search.value.trim().toLowerCase();
  const type = elements.propertyType.value;
  const status = elements.salesStatus.value;
  const properties = allProperties.filter((property) => {
    if (type && property.propertyType !== type) return false;
    if (status && property.status !== status) return false;
    if (!query) return true;
    return [property.name, property.community, property.developer, property.id]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  const fragment = document.createDocumentFragment();
  for (const [index, property] of properties.entries()) {
    const card = elements.template.content.cloneNode(true);
    const image = card.querySelector(".feed-card__image");
    image.src = property.image || fallbackImages[index % fallbackImages.length];
    image.alt = property.name;
    image.addEventListener(
      "error",
      () => {
        image.src = fallbackImages[index % fallbackImages.length];
      },
      { once: true }
    );

    card.querySelector("h2").textContent = property.name;
    card.querySelector(".custom-card__type").textContent = property.propertyType;
    card.querySelector(".feed-card__status").textContent = property.status;
    card.querySelector(".feed-card__location").textContent =
      [property.community, property.developer].filter(Boolean).join(" · ") || "No location details";
    card.querySelector(".feed-card__price").textContent = property.price;
    card.querySelector(".feed-card__completion").textContent = property.completion || "Not provided";
    card.querySelector(".custom-card__edit").href =
      `/admin/cms.html#/collections/custom_properties/entries/${encodeURIComponent(property.slug)}`;
    fragment.append(card);
  }

  elements.grid.replaceChildren(fragment);
  elements.grid.hidden = properties.length === 0;
  elements.empty.hidden = !(properties.length === 0 && allProperties.length === 0);
  elements.status.hidden = allProperties.length === 0;
  elements.status.textContent = `${properties.length.toLocaleString()} of ${allProperties.length.toLocaleString()} custom properties`;
}

function normalizeProperty(property) {
  const prices = Array.isArray(property.unit_variations)
    ? property.unit_variations
        .map((variation) => parsePrice(variation?.starting_price))
        .filter(Number.isFinite)
    : [];
  const headlinePrice = parsePrice(property.price);
  const minPrice = Number.isFinite(headlinePrice)
    ? headlinePrice
    : prices.length
      ? Math.min(...prices)
      : null;

  return {
    id: String(property.id ?? ""),
    slug: String(property._adminSlug ?? ""),
    name: String(property.name ?? "Untitled"),
    propertyType: String(property.property_type ?? "Property"),
    community: String(property.community ?? ""),
    developer: String(property.developer ?? ""),
    status: String(property.sales_status ?? "Unknown"),
    completion: String(property.completion_date ?? ""),
    image: String(property.image ?? ""),
    price: minPrice == null ? "Not provided" : `AED ${minPrice.toLocaleString("en-AE")}`,
  };
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const match = String(value).toUpperCase().replaceAll(",", "").match(/([\d.]+)\s*([KMB])?/);
  if (!match) return null;

  const amount = Number(match[1]);
  const multiplier =
    match[2] === "B" ? 1_000_000_000 : match[2] === "M" ? 1_000_000 : match[2] === "K" ? 1_000 : 1;
  return Number.isFinite(amount) ? Math.round(amount * multiplier) : null;
}

function populateSelect(select, values) {
  const uniqueValues = [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  for (const value of uniqueValues) select.add(new Option(value, value));
}
