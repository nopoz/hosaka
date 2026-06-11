function getAuthenticationIcon() {
  return "ri-lock-2-line";
}

async function getAllAuthentications() {
  const response = await fetch("/api/authentications");
  return response.json();
}

export { getAuthenticationIcon, getAllAuthentications };
