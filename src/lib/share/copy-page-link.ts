export async function copyCurrentPageLink() {
  const url = window.location.href;
  // The async API can be refused (an unfocused page, an in-app browser, a missing
  // permission) even when it exists, so a refusal falls through to the old command
  // rather than ending in an error.
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return;
    } catch {
      // fall through to the textarea fallback below
    }
  }

  const copyTarget = document.createElement("textarea");
  copyTarget.value = url;
  copyTarget.setAttribute("readonly", "");
  copyTarget.style.position = "fixed";
  copyTarget.style.opacity = "0";
  document.body.append(copyTarget);
  copyTarget.select();
  const copied = document.execCommand("copy");
  copyTarget.remove();
  if (!copied) throw new Error("Copy command was unavailable");
}
