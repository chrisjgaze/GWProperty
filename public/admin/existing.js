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
  template: document.querySelector("#property-card"),
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

async function loadProperties() {
  try {
    const response = await fetch("/properties.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const projects = payload?.data?.projects ?? payload?.projects ?? payload?.properties ?? payload;
    if (!Array.isArray(projects)) throw new Error("Expected an array of properties");

    allProperties = projects.map(normalizeProperty);
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
  for (const value of uniqueValues) {
    select.add(new Option(value, value));
  }
}
