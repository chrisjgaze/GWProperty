const PAGE_SIZE = 48;
const fallbackImages = [
  "/images/pc1.jpg",
  "/images/pc2.jpg",
  "/images/pc3.jpg",
  "/images/pc4.jpg",
  "/images/pc5.jpg",
];

const elements = {
  search: document.querySelector("#search"),
  community: document.querySelector("#community"),
  developer: document.querySelector("#developer"),
  status: document.querySelector("#status"),
  grid: document.querySelector("#properties"),
  loadMore: document.querySelector("#load-more"),
  clearFilters: document.querySelector("#clear-filters"),
  totalCount: document.querySelector("#total-count"),
  template: document.querySelector("#property-card"),
  dialog: document.querySelector("#property-dialog"),
  dialogClose: document.querySelector("#dialog-close"),
  detail: document.querySelector("#property-detail"),
};

let allProperties = [];
let filteredProperties = [];
let visibleCount = PAGE_SIZE;

loadProperties();

elements.search.addEventListener("input", applyFilters);
elements.community.addEventListener("change", applyFilters);
elements.developer.addEventListener("change", applyFilters);
elements.loadMore.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  render();
});
elements.clearFilters.addEventListener("click", () => {
  elements.search.value = "";
  elements.community.value = "";
  elements.developer.value = "";
  applyFilters();
});
elements.dialogClose.addEventListener("click", closeDetails);
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) closeDetails();
});

async function loadProperties() {
  try {
    const response = await fetch("/properties.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const projects = payload?.data?.projects ?? payload?.projects ?? payload?.properties ?? payload;
    if (!Array.isArray(projects)) throw new Error("Expected an array of properties");

    allProperties = projects.map(normalizeProperty);
    elements.totalCount.textContent = allProperties.length.toLocaleString();
    populateSelect(elements.community, allProperties.map((property) => property.community));
    populateSelect(elements.developer, allProperties.map((property) => property.developer));
    applyFilters();
  } catch (error) {
    console.error(error);
    elements.status.textContent = `Could not load properties.json (${error.message})`;
    elements.status.classList.add("feed-status--error");
  }
}

function applyFilters() {
  const query = elements.search.value.trim().toLowerCase();
  const community = elements.community.value;
  const developer = elements.developer.value;

  filteredProperties = allProperties.filter((property) => {
    if (community && property.community !== community) return false;
    if (developer && property.developer !== developer) return false;
    if (!query) return true;

    return [property.name, property.community, property.developer, property.id]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  visibleCount = PAGE_SIZE;
  render();
}

function render() {
  const visibleProperties = filteredProperties.slice(0, visibleCount);
  const fragment = document.createDocumentFragment();

  for (const [index, property] of visibleProperties.entries()) {
    const card = elements.template.content.cloneNode(true);
    const cardButton = card.querySelector(".feed-card");
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
    card.querySelector(".feed-card__status").textContent = property.status;
    card.querySelector(".feed-card__location").textContent =
      [property.community, property.developer].filter(Boolean).join(" · ") || "No location details";
    card.querySelector(".feed-card__id").textContent = property.id;
    card.querySelector(".feed-card__completion").textContent = property.completion || "Not provided";
    card.querySelector(".feed-card__price").textContent = property.price;
    cardButton.addEventListener("click", () => openDetails(property));
    fragment.append(card);
  }

  elements.grid.replaceChildren(fragment);
  elements.status.textContent = `${filteredProperties.length.toLocaleString()} of ${allProperties.length.toLocaleString()} existing properties`;
  elements.loadMore.hidden = visibleCount >= filteredProperties.length;
}

function normalizeProperty(property) {
  const prices = Array.isArray(property.unit_variations)
    ? property.unit_variations
        .map((variation) => parsePrice(variation?.starting_price))
        .filter(Number.isFinite)
    : [];
  const minPrice = prices.length ? Math.min(...prices) : null;

  return {
    id: String(property.id ?? ""),
    name: String(property.name ?? property.title ?? "Untitled"),
    community: String(property.community ?? ""),
    developer: String(property.developer ?? ""),
    completion: String(property.completion_date ?? ""),
    image: String(property.image ?? ""),
    price: minPrice == null ? "Not provided" : `AED ${minPrice.toLocaleString("en-AE")}`,
    status: property.sales_status == null ? "Unknown" : `Status ${property.sales_status}`,
    raw: property,
  };
}

function openDetails(property) {
  const raw = property.raw;
  const variations = Array.isArray(raw.unit_variations) ? raw.unit_variations : [];
  const eoiRecords = Array.isArray(raw.eoi_records) ? raw.eoi_records : [];
  const locationUrl =
    raw.latitude && raw.longitude
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${raw.latitude},${raw.longitude}`)}`
      : "";

  elements.detail.replaceChildren(
    createDetailHero(property),
    createSection("Overview", [
      detailItem("Property ID", raw.id),
      detailItem("Status code", raw.sales_status),
      detailItem("Completion date", raw.completion_date),
      detailItem("Label", raw.label),
      detailItem("Featured / rocket", formatBoolean(raw.display_rocket)),
    ]),
    createSection("Developer and location", [
      detailItem("Community", raw.community),
      detailItem("Developer", raw.developer),
      detailItem("Developer ID", raw.developer_id),
      detailItem("Latitude", raw.latitude),
      detailItem("Longitude", raw.longitude),
      detailLink("Open in Google Maps", locationUrl),
    ]),
    createListSection(
      "Unit variations",
      variations,
      (variation) =>
        `${variation.label || variation.unit_type || formatBeds(variation.bed)} — ${
          variation.starting_price ? `AED ${variation.starting_price}` : "Price not provided"
        }`
    ),
    createSection("Expression of interest", [
      detailItem("EOI scope", raw.eoi_scope),
      detailItem("EOI records", eoiRecords.length),
    ]),
    createListSection(
      "EOI record details",
      eoiRecords,
      (record) => JSON.stringify(record)
    ),
    createSection("Source assets", [
      detailLink("Open property image", raw.image),
      detailLink("Open developer logo", raw.developer_logo),
    ]),
    createRawSection(raw)
  );

  elements.dialog.showModal();
}

function closeDetails() {
  elements.dialog.close();
}

function createDetailHero(property) {
  const hero = document.createElement("section");
  hero.className = "property-detail__hero";

  const image = document.createElement("img");
  image.src = property.image || fallbackImages[0];
  image.alt = property.name;
  image.referrerPolicy = "no-referrer";
  image.addEventListener("error", () => (image.src = fallbackImages[0]), { once: true });

  const copy = document.createElement("div");
  const status = document.createElement("span");
  status.className = "property-detail__status";
  status.textContent = property.status;
  const title = document.createElement("h2");
  title.textContent = property.name;
  const location = document.createElement("p");
  location.textContent =
    [property.community, property.developer].filter(Boolean).join(" · ") || "No location details";
  const price = document.createElement("strong");
  price.textContent = property.price;
  copy.append(status, title, location, price);
  hero.append(image, copy);
  return hero;
}

function createSection(title, items) {
  const section = document.createElement("section");
  section.className = "property-detail__section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const list = document.createElement("dl");
  list.className = "property-detail__list";
  list.append(...items);
  section.append(heading, list);
  return section;
}

function detailItem(label, value) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;
  detail.textContent = displayValue(value);
  row.append(term, detail);
  return row;
}

function detailLink(label, url) {
  const row = document.createElement("div");
  const term = document.createElement("dt");
  const detail = document.createElement("dd");
  term.textContent = label;

  if (url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = "Open link";
    detail.append(link);
  } else {
    detail.textContent = "Not provided";
  }

  row.append(term, detail);
  return row;
}

function createListSection(title, items, formatItem) {
  const section = document.createElement("section");
  section.className = "property-detail__section";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const list = document.createElement("ul");
  list.className = "property-detail__variations";

  if (items.length) {
    for (const item of items) {
      const row = document.createElement("li");
      row.textContent = formatItem(item);
      list.append(row);
    }
  } else {
    const row = document.createElement("li");
    row.textContent = "None provided";
    list.append(row);
  }

  section.append(heading, list);
  return section;
}

function createRawSection(raw) {
  const details = document.createElement("details");
  details.className = "property-detail__raw";
  const summary = document.createElement("summary");
  summary.textContent = "View raw source JSON";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(raw, null, 2);
  details.append(summary, pre);
  return details;
}

function displayValue(value) {
  return value == null || value === "" ? "Not provided" : String(value);
}

function formatBoolean(value) {
  if (value == null) return "Not provided";
  return value ? "Yes" : "No";
}

function formatBeds(value) {
  return value ? `${value} B/R` : "Unit";
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
  for (const value of uniqueValues) {
    select.add(new Option(value, value));
  }
}
