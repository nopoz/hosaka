// Copy text to the clipboard. The async Clipboard API is only available in
// secure contexts (https / localhost), so fall back to a hidden-textarea
// execCommand copy for plain-http LAN access. Resolves to whether the copy
// succeeded so callers can surface success/failure consistently.
export async function copyTextToClipboard(value) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (e) {
      return false;
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    return false;
  }
}
