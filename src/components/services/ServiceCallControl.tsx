"use client";

import { useEffect, useRef, useState } from "react";

const COPIED_FEEDBACK_MS = 2000;

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard access can be refused — a page served over plain http, or a
    // browser that wants a gesture it did not see. The number is on screen
    // either way, so the old selection trick is enough of a second chance.
    try {
      const field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      return copied;
    } catch {
      return false;
    }
  }
}

/**
 * How a service card offers its phone number.
 *
 * A phone can dial, so there the icon is a `tel:` link and one tap starts the
 * call. A tablet or a desktop usually cannot, and an icon that does nothing is
 * worse than the number itself — so there the number is shown, and a click
 * copies it and says so.
 *
 * Both are rendered and the breakpoint picks between them in CSS. Choosing in
 * JavaScript would mean the server guessing at a viewport it cannot see, and
 * the card is server-rendered.
 */
export function ServiceCallControl({ phone, providerName, isKorean }: { phone: string; providerName: string; isKorean: boolean }) {
  const [isCopied, setIsCopied] = useState(false);
  const resetTimer = useRef<number | null>(null);
  const say = (en: string, ko: string) => (isKorean ? ko : en);

  useEffect(() => () => { if (resetTimer.current) window.clearTimeout(resetTimer.current); }, []);

  const copy = async () => {
    if (!(await copyToClipboard(phone))) return;
    setIsCopied(true);
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setIsCopied(false), COPIED_FEEDBACK_MS);
  };

  return <>
    <a
      className="ui-button ui-button--secondary services-listing-call"
      href={`tel:${phone.replace(/\s/g, "")}`}
      aria-label={say(`Call ${providerName}: ${phone}`, `${providerName}에게 전화: ${phone}`)}
    >
      <i className="ms ms-call" aria-hidden="true" />
    </a>
    <button
      className={`ui-button ui-button--secondary services-listing-copy${isCopied ? " is-copied" : ""}`}
      type="button"
      onClick={() => void copy()}
      aria-label={say(`Copy ${providerName}'s number: ${phone}`, `${providerName} 전화번호 복사: ${phone}`)}
    >
      <i className={`ms ${isCopied ? "ms-check" : "ms-call"}`} aria-hidden="true" />
      <span aria-live="polite">{isCopied ? say("Copied", "복사됨") : phone}</span>
    </button>
  </>;
}
