function getStoreIcon() {
  return "ri-stack-line";
}

async function getStore() {
  const response = await fetch("/api/store");
  return response.json();
}

export { getStoreIcon, getStore };
