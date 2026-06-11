function getLogIcon() {
  return "ri-bug-line";
}

async function getLog() {
  const response = await fetch("/api/log");
  return response.json();
}

export { getLogIcon, getLog };
