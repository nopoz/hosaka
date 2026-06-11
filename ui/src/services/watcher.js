function getWatcherIcon() {
  return "ri-radar-line";
}

async function getAllWatchers() {
  const response = await fetch("/api/watchers");
  return response.json();
}

export { getWatcherIcon, getAllWatchers };
