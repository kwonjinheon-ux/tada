import "server-only";

import { cookies } from "next/headers";
import { isSupportedLocale, type SupportedLocale } from "@/lib/locales";

/** The cookie LanguageProvider writes whenever the language changes. Reading it
 *  on the server is what lets the first render already be in the reader's
 *  language, instead of sending English and swapping after mount. */
export const LOCALE_COOKIE = "tada-preferred-locale";

export async function getRequestLocale(): Promise<SupportedLocale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isSupportedLocale(value) ? value : "en";
}
