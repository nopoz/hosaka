/**
 * Truncate an id to x chars.
 * @param fullId
 * @param length
 * @returns {string}
 */
function short(fullId, length) {
  if (!fullId) {
    return "";
  }
  return fullId.substring(0, length);
}

/**
 * Formate a date for display.
 * @param dateStr
 * @returns {string}
 */
function date(dateStr) {
  const date = new Date(dateStr);
  const options = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };
  return new Intl.DateTimeFormat([], options).format(date);
}

/**
 * Derive a release-notes URL from an image's OCI source label. GitHub repos get
 * their /releases page; other hosts fall back to the source URL as-is.
 * @param source
 * @returns {string|null}
 */
function sourceReleasesUrl(source) {
  if (!source || typeof source !== "string") {
    return null;
  }
  const trimmed = source.replace(/\/+$/, "");
  if (/^https?:\/\/(www\.)?github\.com\//i.test(trimmed)) {
    return `${trimmed}/releases`;
  }
  return trimmed;
}

export { short, date, sourceReleasesUrl };
