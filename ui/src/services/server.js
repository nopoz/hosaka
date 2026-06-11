function getServerIcon() {
  return "ri-server-line";
}

async function getServer() {
  const response = await fetch("/api/server");
  return response.json();
}

export { getServerIcon, getServer };
