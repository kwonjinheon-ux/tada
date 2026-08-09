export async function copyCurrentPageLink() {
  const url = window.location.href;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
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
