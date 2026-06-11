const collectionRoutes = new Set([
  "",
  "#/",
  "#/collections/custom_properties",
  "#/collections/custom_properties/",
]);

redirectCollectionPage();
window.addEventListener("hashchange", redirectCollectionPage);

function redirectCollectionPage() {
  if (collectionRoutes.has(window.location.hash)) {
    window.location.replace("/admin/manage.html");
  }
}
