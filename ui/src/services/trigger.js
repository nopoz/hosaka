function getTriggerIcon() {
  return "ri-notification-3-line";
}

async function getAllTriggers() {
  const response = await fetch("/api/triggers");
  return response.json();
}

export { getTriggerIcon, getAllTriggers };
