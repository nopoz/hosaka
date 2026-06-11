/**
 * Get registry component icon.
 * @returns {string}
 */
function getRegistryIcon() {
  return "ri-database-2-line";
}

/**
 * Get registry provider icon. A single uniform glyph is used for every
 * provider (the registry icon is a low-emphasis part of the UI, so per-provider
 * brand logos aren't worth the off-theme clash with the line icon set).
 * @returns {string}
 */
function getRegistryProviderIcon() {
  return "ri-database-2-line";
}

/**
 * get all registries.
 * @returns {Promise<any>}
 */
async function getAllRegistries() {
  const response = await fetch("/api/registries");
  return response.json();
}

export { getRegistryIcon, getRegistryProviderIcon, getAllRegistries };
